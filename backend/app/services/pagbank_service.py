"""PagBank service for handling PIX payment operations."""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import TeleCopyException
from app.database.models import User, PixPayment
from app.database.repositories.user_repository import UserRepository
from app.models.user import UserPlan
from app.core.homologation_logger import HomologationLogger

logger = logging.getLogger(__name__)


class PagBankService:
    """Service for managing PagBank PIX payment operations."""

    # API Base URLs
    SANDBOX_URL = "https://sandbox.api.pagseguro.com"
    PRODUCTION_URL = "https://api.pagseguro.com"

    def __init__(self, db: AsyncSession):
        """Initialize PagBank service with database session."""
        self.db = db
        self.user_repo = UserRepository(db)
        
        # Set API URL based on environment
        self.api_url = self.SANDBOX_URL if settings.pagbank_environment == "sandbox" else self.PRODUCTION_URL
        
        if not settings.pagbank_token:
            logger.warning("PagBank token not configured. PIX operations will fail.")

    def _get_headers(self) -> dict:
        """Get headers for PagBank API requests."""
        return {
            "Authorization": f"Bearer {settings.pagbank_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def get_price_for_plan(self, plan: UserPlan, billing_cycle: str) -> int:
        """
        Get price in centavos for a given plan and billing cycle.

        Args:
            plan: UserPlan enum value (PREMIUM or ENTERPRISE)
            billing_cycle: "monthly" or "annual"

        Returns:
            Price in centavos
        """
        if plan == UserPlan.PREMIUM:
            if billing_cycle == "annual":
                return settings.pagbank_premium_annual_price
            return settings.pagbank_premium_monthly_price
        elif plan == UserPlan.ENTERPRISE:
            if billing_cycle == "annual":
                return settings.pagbank_enterprise_annual_price
            return settings.pagbank_enterprise_monthly_price
        else:
            raise TeleCopyException(f"Invalid plan for PIX payment: {plan}", 400)

    def _format_price(self, amount_centavos: int) -> str:
        """Format price in centavos to Brazilian Real string."""
        reais = amount_centavos / 100
        return f"R$ {reais:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def _get_plan_name(self, plan: UserPlan, billing_cycle: str) -> str:
        """Get display name for plan."""
        plan_names = {
            UserPlan.PREMIUM: "Premium",
            UserPlan.ENTERPRISE: "Enterprise",
        }
        cycle_names = {
            "monthly": "Mensal",
            "annual": "Anual",
        }
        return f"{plan_names.get(plan, plan.value)} {cycle_names.get(billing_cycle, billing_cycle)} - TeleCopy Pro"

    async def create_pix_order(
        self,
        user: User,
        plan: UserPlan,
        billing_cycle: str,
        webhook_url: Optional[str] = None,
    ) -> PixPayment:
        """
        Create a PIX order with QR Code for payment.

        Args:
            user: User model instance
            plan: Target plan (PREMIUM or ENTERPRISE)
            billing_cycle: "monthly" or "annual"
            webhook_url: Optional URL for payment notifications (must be public HTTPS)

        Returns:
            PixPayment model with QR code data

        Raises:
            TeleCopyException: If order creation fails
        """
        try:
            # Validate plan
            if plan not in [UserPlan.PREMIUM, UserPlan.ENTERPRISE]:
                raise TeleCopyException("Plano inválido para pagamento PIX", 400)

            if billing_cycle not in ["monthly", "annual"]:
                raise TeleCopyException("Ciclo de cobrança inválido", 400)

            # Get price
            amount = self.get_price_for_plan(plan, billing_cycle)

            # Generate unique reference
            reference_id = f"pix_{user.id}_{plan.value}_{billing_cycle}_{int(datetime.utcnow().timestamp())}"

            # Set expiration (24 hours from now)
            expiration_date = datetime.utcnow() + timedelta(hours=24)
            expiration_str = expiration_date.strftime("%Y-%m-%dT%H:%M:%S-03:00")

            # Build request payload following PagBank Order API spec
            payload = {
                "reference_id": reference_id,
                "customer": {
                    "name": user.name or "Cliente TeleCopy",
                    "email": user.email,
                    "tax_id": user.tax_id,
                    "phones": [
                        {
                            "country": "55",
                            "area": user.phone_number[3:5] if user.phone_number else "11",
                            "number": user.phone_number[5:] if user.phone_number else "999999999",
                            "type": "MOBILE"
                        }
                    ] if user.phone_number else []
                },
                "items": [
                    {
                        "name": self._get_plan_name(plan, billing_cycle),
                        "quantity": 1,
                        "unit_amount": amount
                    }
                ],
                "qr_codes": [
                    {
                        "amount": {
                            "value": amount
                        },
                        "expiration_date": expiration_str
                    }
                ],
            }

            # Only include notification_urls if a valid public HTTPS URL is provided
            # Local URLs (localhost, 127.0.0.1) won't work with PagBank
            if webhook_url and webhook_url.startswith("https://") and "localhost" not in webhook_url and "127.0.0.1" not in webhook_url:
                payload["notification_urls"] = [webhook_url]
                logger.info(f"Including webhook URL: {webhook_url}")
            else:
                logger.info("No valid webhook URL provided, relying on frontend polling for payment status")

            # Remove empty phones array if no phone number
            if not user.phone_number:
                del payload["customer"]["phones"]

            logger.info(f"Creating PIX order for user {user.id}, plan={plan.value}, billing_cycle={billing_cycle}")
            logger.info(f"PagBank Request Payload: {payload}")

            # Make API request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/orders",
                    headers=self._get_headers(),
                    json=payload
                )

                if response.status_code not in [200, 201]:
                    error_detail = response.text
                    logger.error(f"PagBank API error: {response.status_code} - {error_detail}")
                    raise TeleCopyException(f"Erro ao criar pedido PIX: {error_detail}", response.status_code)

                order_data = response.json()
                logger.info(f"PagBank Response Body: {order_data}")

                # Capture full logs for homologation
                await HomologationLogger.save_log(
                    order_id=order_data.get("id", "unknown"),
                    activity="Create PIX Order",
                    endpoint=f"{self.api_url}/orders",
                    method="POST",
                    request_headers=self._get_headers(),
                    request_body=payload,
                    response_status=response.status_code,
                    response_headers=response.headers,
                    response_body=order_data
                )

            # Extract QR code data from response
            order_id = order_data.get("id")
            qr_codes = order_data.get("qr_codes", [])
            
            if not qr_codes:
                raise TeleCopyException("QR Code não gerado pela API PagBank", 500)

            qr_code = qr_codes[0]
            qr_code_id = qr_code.get("id")
            qr_code_text = qr_code.get("text")
            
            # Find QR code image URL
            qr_code_url = None
            for link in qr_code.get("links", []):
                if link.get("rel") == "QRCODE.PNG":
                    qr_code_url = link.get("href")
                    break

            # Create PixPayment record
            pix_payment = PixPayment(
                user_id=user.id,
                order_id=order_id,
                reference_id=reference_id,
                plan=plan,
                billing_cycle=billing_cycle,
                amount=amount,
                qr_code_id=qr_code_id,
                qr_code_text=qr_code_text,
                qr_code_url=qr_code_url,
                status="pending",
                expiration_date=expiration_date,
            )

            self.db.add(pix_payment)
            await self.db.commit()
            await self.db.refresh(pix_payment)

            logger.info(f"Created PIX order {order_id} for user {user.id}")
            return pix_payment

        except httpx.RequestError as e:
            logger.error(f"Network error creating PIX order: {e}", exc_info=True)
            raise TeleCopyException(f"Erro de conexão com PagBank: {str(e)}", 503)
        except TeleCopyException:
            raise
        except Exception as e:
            logger.error(f"Error creating PIX order: {e}", exc_info=True)
            raise TeleCopyException(f"Erro ao criar pedido PIX: {str(e)}", 500)

    async def get_pix_payment_by_order_id(self, order_id: str) -> Optional[PixPayment]:
        """Get PIX payment record by PagBank order ID."""
        result = await self.db.execute(
            select(PixPayment).where(PixPayment.order_id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_pix_payment_by_reference(self, reference_id: str) -> Optional[PixPayment]:
        """Get PIX payment record by our reference ID."""
        result = await self.db.execute(
            select(PixPayment).where(PixPayment.reference_id == reference_id)
        )
        return result.scalar_one_or_none()

    async def check_order_status(self, order_id: str) -> dict:
        """
        Check order status from PagBank API.

        Args:
            order_id: PagBank order ID

        Returns:
            Dict with order status information
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.api_url}/orders/{order_id}",
                    headers=self._get_headers()
                )

                if response.status_code == 404:
                    raise TeleCopyException("Pedido não encontrado", 404)

                if response.status_code != 200:
                    raise TeleCopyException(f"Erro ao consultar pedido: {response.text}", response.status_code)

                return response.json()

        except httpx.RequestError as e:
            logger.error(f"Network error checking order status: {e}")
            raise TeleCopyException(f"Erro de conexão: {str(e)}", 503)

    async def handle_pix_payment_completed(self, order_data: dict) -> None:
        """
        Handle successful PIX payment completion.

        Args:
            order_data: Webhook payload from PagBank
        """
        try:
            order_id = order_data.get("id")
            if not order_id:
                logger.error("No order_id in webhook payload")
                return

            # Find the payment record
            pix_payment = await self.get_pix_payment_by_order_id(order_id)
            if not pix_payment:
                logger.error(f"PixPayment not found for order {order_id}")
                return

            # Check if already processed
            if pix_payment.status == "paid":
                logger.info(f"PIX payment {order_id} already processed")
                return

            # Check charges for PAID status
            charges = order_data.get("charges", [])
            is_paid = any(charge.get("status") == "PAID" for charge in charges)

            if not is_paid:
                logger.info(f"Order {order_id} not yet paid, status from charges: {[c.get('status') for c in charges]}")
                return

            # Get paid_at from charge
            paid_at = None
            for charge in charges:
                if charge.get("status") == "PAID":
                    paid_at_str = charge.get("paid_at")
                    if paid_at_str:
                        from datetime import timezone
                        # Convert aware datetime from PagBank to naive UTC for database
                        dt_aware = datetime.fromisoformat(paid_at_str)
                        paid_at = dt_aware.astimezone(timezone.utc).replace(tzinfo=None)
                    break

            # Update payment status
            pix_payment.status = "paid"
            pix_payment.paid_at = paid_at or datetime.utcnow()

            # Get user and upgrade plan
            user = await self.user_repo.get_by_id(pix_payment.user_id)
            if not user:
                logger.error(f"User {pix_payment.user_id} not found for PIX payment")
                return

            # Calculate plan expiry based on billing cycle
            if pix_payment.billing_cycle == "annual":
                plan_expiry = datetime.utcnow() + timedelta(days=365)
            else:
                plan_expiry = datetime.utcnow() + timedelta(days=30)

            # Update user plan
            user.plan = pix_payment.plan
            user.plan_expiry = plan_expiry

            await self.db.flush()

            logger.info(f"Successfully processed PIX payment {order_id} for user {user.id}, plan={pix_payment.plan.value}, expiry={plan_expiry}")

        except Exception as e:
            logger.error(f"Error handling PIX payment completion: {e}", exc_info=True)
            raise

    async def update_expired_payments(self) -> int:
        """
        Mark expired pending payments as expired.

        Returns:
            Number of payments marked as expired
        """
        try:
            result = await self.db.execute(
                select(PixPayment).where(
                    PixPayment.status == "pending",
                    PixPayment.expiration_date < datetime.utcnow()
                )
            )
            expired_payments = result.scalars().all()

            for payment in expired_payments:
                payment.status = "expired"

            await self.db.commit()
            
            if expired_payments:
                logger.info(f"Marked {len(expired_payments)} PIX payments as expired")

            return len(expired_payments)

        except Exception as e:
            logger.error(f"Error updating expired payments: {e}")
            await self.db.rollback()
            return 0
