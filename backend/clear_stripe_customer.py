"""Script to clear Stripe customer IDs from the database for testing."""
import asyncio
import sys
from sqlalchemy import select, update
from app.database import get_db
from app.database.models import User


async def clear_stripe_customer_id(phone_number: str = None):
    """Clear Stripe customer ID and related data from users."""
    async for db in get_db():
        try:
            if phone_number:
                # Clear specific user
                stmt = (
                    update(User)
                    .where(User.phone_number == phone_number)
                    .values(
                        stripe_customer_id=None,
                        stripe_subscription_id=None,
                        subscription_status=None,
                        subscription_period_end=None
                    )
                )
                result = await db.execute(stmt)
                await db.commit()
                print(f"✓ Cleared Stripe data for user: {phone_number}")
                print(f"  Rows affected: {result.rowcount}")
            else:
                # Clear all users
                stmt = (
                    update(User)
                    .values(
                        stripe_customer_id=None,
                        stripe_subscription_id=None,
                        subscription_status=None,
                        subscription_period_end=None
                    )
                )
                result = await db.execute(stmt)
                await db.commit()
                print(f"✓ Cleared Stripe data for all users")
                print(f"  Rows affected: {result.rowcount}")

            # Verify the change
            if phone_number:
                user_stmt = select(User).where(User.phone_number == phone_number)
                result = await db.execute(user_stmt)
                user = result.scalar_one_or_none()
                if user:
                    print(f"\n✓ Verification:")
                    print(f"  User ID: {user.id}")
                    print(f"  Phone: {user.phone_number}")
                    print(f"  Stripe Customer ID: {user.stripe_customer_id}")
                    print(f"  Stripe Subscription ID: {user.stripe_subscription_id}")
                else:
                    print(f"✗ User not found: {phone_number}")

        except Exception as e:
            print(f"✗ Error: {e}")
            await db.rollback()
            raise
        finally:
            break  # Exit after first iteration


if __name__ == "__main__":
    phone = sys.argv[1] if len(sys.argv) > 1 else None

    if phone:
        print(f"Clearing Stripe data for phone: {phone}")
    else:
        print("Clearing Stripe data for ALL users")
        confirm = input("Are you sure? (yes/no): ")
        if confirm.lower() != "yes":
            print("Cancelled")
            sys.exit(0)

    asyncio.run(clear_stripe_customer_id(phone))
