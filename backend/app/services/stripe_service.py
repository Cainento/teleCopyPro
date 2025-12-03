"""Stripe service for handling subscription and payment operations."""

import logging
from datetime import datetime
from typing import Optional

import stripe
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import TeleCopyException
from app.database.models import User
from app.database.repositories.user_repository import UserRepository
from app.models.user import UserPlan

logger = logging.getLogger(__name__)


class StripeService:
    """Service for managing Stripe operations."""

    def __init__(self, db: AsyncSession):
        """Initialize Stripe service with database session."""
        self.db = db
        self.user_repo = UserRepository(db)

        # Initialize Stripe API key
        if settings.stripe_secret_key:
            stripe.api_key = settings.stripe_secret_key
        else:
            logger.warning("Stripe secret key not configured. Stripe operations will fail.")

    async def create_customer(self, user: User) -> str:
        """
        Create a Stripe customer for a user.

        Args:
            user: User model instance

        Returns:
            Stripe customer ID

        Raises:
            TeleCopyException: If customer creation fails
        """
        try:
            # Check if user already has a Stripe customer
            if user.stripe_customer_id:
                logger.info(f"User {user.id} already has Stripe customer: {user.stripe_customer_id}")
                return user.stripe_customer_id

            # Prepare customer data, handling optional fields
            customer_data = {
                "metadata": {
                    "user_id": str(user.id),
                    "phone_number": user.phone_number or "",
                }
            }

            # Only add email if it exists and is valid
            if user.email:
                customer_data["email"] = user.email

            # Only add name if it exists
            if user.name:
                customer_data["name"] = user.name

            # Only add phone if it exists
            if user.phone_number:
                customer_data["phone"] = user.phone_number

            # Create new Stripe customer
            customer = stripe.Customer.create(**customer_data)

            # Update user with Stripe customer ID
            user.stripe_customer_id = customer.id
            await self.user_repo.update(user)

            logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
            return customer.id

        except stripe.error.StripeError as e:
            error_msg = f"Stripe error creating customer for user {user.id}: {type(e).__name__} - {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise TeleCopyException(f"Failed to create payment customer: {str(e)}")
        except Exception as e:
            error_msg = f"Unexpected error creating Stripe customer for user {user.id}: {type(e).__name__} - {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise TeleCopyException(f"Failed to create payment customer: {str(e)}")

    async def create_checkout_session(
        self,
        user: User,
        price_id: str,
        success_url: str,
        cancel_url: str
    ) -> str:
        """
        Create a Stripe Checkout session for subscription purchase.

        Args:
            user: User model instance
            price_id: Stripe Price ID for the subscription
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect after cancelled payment

        Returns:
            Stripe Checkout Session URL

        Raises:
            TeleCopyException: If checkout session creation fails
        """
        try:
            # Ensure user has a Stripe customer
            customer_id = await self.create_customer(user)

            # Create checkout session
            checkout_session = stripe.checkout.Session.create(
                customer=customer_id,
                mode="subscription",
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": 1,
                }],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": str(user.id),
                    "phone_number": user.phone_number or "",
                },
                allow_promotion_codes=True,
                billing_address_collection="auto",
                subscription_data={
                    "metadata": {
                        "user_id": str(user.id),
                    }
                }
            )

            logger.info(f"Created Stripe checkout session {checkout_session.id} for user {user.id}")
            return checkout_session.url

        except stripe.error.StripeError as e:
            error_msg = f"Stripe error creating checkout session for user {user.id}, price_id={price_id}: {type(e).__name__} - {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise TeleCopyException(f"Failed to create checkout session: {str(e)}")
        except Exception as e:
            error_msg = f"Unexpected error creating checkout session for user {user.id}, price_id={price_id}: {type(e).__name__} - {str(e)}"
            logger.error(error_msg, exc_info=True)
            raise TeleCopyException(f"Failed to create checkout session: {str(e)}")

    async def get_subscription(self, subscription_id: str) -> Optional[stripe.Subscription]:
        """
        Get Stripe subscription details.

        Args:
            subscription_id: Stripe subscription ID

        Returns:
            Stripe Subscription object or None if not found
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return subscription
        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving Stripe subscription {subscription_id}: {e}")
            return None

    async def cancel_subscription(self, subscription_id: str, immediately: bool = False) -> bool:
        """
        Cancel a Stripe subscription.

        Args:
            subscription_id: Stripe subscription ID
            immediately: If True, cancel immediately. If False, cancel at period end.

        Returns:
            True if cancellation successful, False otherwise
        """
        try:
            if immediately:
                # Cancel immediately
                stripe.Subscription.delete(subscription_id)
                logger.info(f"Cancelled subscription {subscription_id} immediately")
            else:
                # Cancel at period end
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
                logger.info(f"Scheduled subscription {subscription_id} for cancellation at period end")

            return True

        except stripe.error.StripeError as e:
            logger.error(f"Error cancelling subscription {subscription_id}: {e}")
            return False

    async def update_user_subscription_from_stripe(
        self,
        user: User,
        subscription: stripe.Subscription
    ) -> None:
        """
        Update user's subscription details based on Stripe subscription data.

        Args:
            user: User model instance
            subscription: Stripe Subscription object
        """
        try:
            # Map Stripe subscription status
            user.subscription_status = subscription.status
            user.stripe_subscription_id = subscription.id

            # Calculate subscription period end
            # Handle both attribute access and dictionary access for Stripe objects
            current_period_end = getattr(subscription, 'current_period_end', None)
            if current_period_end is None and hasattr(subscription, 'get'):
                current_period_end = subscription.get('current_period_end')
            if current_period_end:
                user.subscription_period_end = datetime.fromtimestamp(current_period_end)

            # Determine plan based on price ID
            # Access items data safely - Stripe subscription.items could be a method or attribute
            items = None
            if hasattr(subscription, 'items'):
                items_attr = getattr(subscription, 'items')
                # Check if it's a method and call it, or if it's already data
                if callable(items_attr):
                    # It's a method like dict.items(), don't call it
                    # Instead try to access as dict
                    if hasattr(subscription, 'get'):
                        items = subscription.get('items')
                elif items_attr is not None:
                    items = items_attr
            elif hasattr(subscription, 'get'):
                items = subscription.get('items')

            items_data = None
            if items is not None:
                items_data = getattr(items, 'data', None)
                if items_data is None and hasattr(items, 'get'):
                    items_data = items.get('data')

            price_id = None
            if items_data and len(items_data) > 0:
                first_item = items_data[0]
                price = getattr(first_item, 'price', None)
                if price is None and hasattr(first_item, 'get'):
                    price = first_item.get('price')

                if price:
                    price_id = getattr(price, 'id', None)
                    if price_id is None and hasattr(price, 'get'):
                        price_id = price.get('id')
                    logger.info(f"Extracted price_id: {price_id} from subscription {subscription.id}")
                else:
                    logger.warning(f"Could not extract price from subscription {subscription.id}")
            else:
                logger.warning(f"No items_data found for subscription {subscription.id}. items={items}, items_data={items_data}")

            if price_id:
                logger.info(f"Checking price_id {price_id} against premium={settings.stripe_premium_monthly_price_id}, {settings.stripe_premium_annual_price_id}")
                if price_id in [settings.stripe_premium_monthly_price_id, settings.stripe_premium_annual_price_id]:
                    user.plan = UserPlan.PREMIUM
                    logger.info(f"Setting user {user.id} plan to PREMIUM")
                elif price_id in [settings.stripe_enterprise_monthly_price_id, settings.stripe_enterprise_annual_price_id]:
                    user.plan = UserPlan.ENTERPRISE
                    logger.info(f"Setting user {user.id} plan to ENTERPRISE")
                else:
                    logger.warning(f"Unknown price ID {price_id} for subscription {subscription.id}")
            else:
                logger.warning(f"No price_id found for subscription {subscription.id}")

            # If subscription is cancelled or past_due, handle accordingly
            if subscription.status in ["canceled", "incomplete_expired", "unpaid"]:
                user.plan = UserPlan.FREE
                user.plan_expiry = None
            elif subscription.status == "active":
                # Set plan expiry to subscription period end
                user.plan_expiry = user.subscription_period_end

            await self.user_repo.update(user)
            logger.info(f"Updated user {user.id} subscription from Stripe: plan={user.plan}, status={user.subscription_status}")

        except Exception as e:
            logger.error(f"Error updating user {user.id} subscription from Stripe: {e}", exc_info=True)
            raise TeleCopyException(f"Failed to update subscription: {str(e)}")

    async def handle_checkout_completed(self, session: stripe.checkout.Session) -> None:
        """
        Handle successful checkout completion.

        Args:
            session: Stripe Checkout Session object
        """
        try:
            # Get user from metadata
            user_id = session.metadata.get("user_id")
            if not user_id:
                logger.error(f"No user_id in checkout session {session.id} metadata")
                return

            user = await self.user_repo.get_by_id(int(user_id))
            if not user:
                logger.error(f"User {user_id} not found for checkout session {session.id}")
                return

            # Get subscription from session
            subscription_id = session.subscription
            if not subscription_id:
                logger.error(f"No subscription in checkout session {session.id}")
                return

            # Retrieve full subscription details
            subscription = await self.get_subscription(subscription_id)
            if not subscription:
                logger.error(f"Could not retrieve subscription {subscription_id}")
                return

            # Update user subscription
            await self.update_user_subscription_from_stripe(user, subscription)

            logger.info(f"Successfully processed checkout completion for user {user_id}")

        except Exception as e:
            logger.error(f"Error handling checkout completion: {e}")
            raise

    async def handle_subscription_updated(self, subscription: stripe.Subscription) -> None:
        """
        Handle subscription update event.

        Args:
            subscription: Stripe Subscription object
        """
        try:
            # Get user by customer ID
            customer_id = subscription.customer
            user = await self.user_repo.get_by_stripe_customer_id(customer_id)

            if not user:
                logger.error(f"User not found for Stripe customer {customer_id}")
                return

            # Update user subscription
            await self.update_user_subscription_from_stripe(user, subscription)

            logger.info(f"Successfully processed subscription update for user {user.id}")

        except Exception as e:
            logger.error(f"Error handling subscription update: {e}")
            raise

    async def handle_subscription_deleted(self, subscription: stripe.Subscription) -> None:
        """
        Handle subscription deletion event.

        Args:
            subscription: Stripe Subscription object
        """
        try:
            # Get user by customer ID
            customer_id = subscription.customer
            user = await self.user_repo.get_by_stripe_customer_id(customer_id)

            if not user:
                logger.error(f"User not found for Stripe customer {customer_id}")
                return

            # Downgrade to free plan
            user.plan = UserPlan.FREE
            user.subscription_status = "canceled"
            user.plan_expiry = None
            user.subscription_period_end = None

            await self.user_repo.update(user)

            logger.info(f"Successfully processed subscription deletion for user {user.id}")

        except Exception as e:
            logger.error(f"Error handling subscription deletion: {e}")
            raise

    async def handle_invoice_payment_failed(self, invoice: stripe.Invoice) -> None:
        """
        Handle failed invoice payment.

        Args:
            invoice: Stripe Invoice object
        """
        try:
            # Get user by customer ID
            customer_id = invoice.customer
            user = await self.user_repo.get_by_stripe_customer_id(customer_id)

            if not user:
                logger.error(f"User not found for Stripe customer {customer_id}")
                return

            # Update subscription status to past_due
            user.subscription_status = "past_due"
            await self.user_repo.update(user)

            logger.info(f"Successfully processed payment failure for user {user.id}")

        except Exception as e:
            logger.error(f"Error handling invoice payment failure: {e}")
            raise

    def get_price_id_for_plan(self, plan: UserPlan, is_annual: bool = False) -> Optional[str]:
        """
        Get Stripe Price ID for a given plan.

        Args:
            plan: UserPlan enum value
            is_annual: Whether to get annual pricing (monthly if False)

        Returns:
            Stripe Price ID or None if not found
        """
        if plan == UserPlan.PREMIUM:
            return settings.stripe_premium_annual_price_id if is_annual else settings.stripe_premium_monthly_price_id
        elif plan == UserPlan.ENTERPRISE:
            return settings.stripe_enterprise_annual_price_id if is_annual else settings.stripe_enterprise_monthly_price_id
        return None
