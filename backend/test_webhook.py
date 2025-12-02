"""
Test script for Stripe webhook events.

This script helps you test webhook events locally by sending simulated
Stripe events to your local webhook endpoint.

Usage:
    python test_webhook.py checkout.session.completed
    python test_webhook.py customer.subscription.updated
    python test_webhook.py customer.subscription.deleted
    python test_webhook.py invoice.payment_failed
"""

import json
import sys
import time
from datetime import datetime

import requests
import stripe
from app.config import settings

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key


def create_test_checkout_session_event():
    """Create a test checkout.session.completed event."""
    return {
        "id": f"evt_test_{int(time.time())}",
        "object": "event",
        "api_version": "2023-10-16",
        "created": int(time.time()),
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": f"cs_test_{int(time.time())}",
                "object": "checkout.session",
                "customer": "cus_test_customer_123",
                "subscription": "sub_test_subscription_123",
                "payment_status": "paid",
                "status": "complete",
                "metadata": {
                    "user_id": "1",  # Change this to match your test user
                    "phone_number": "+5511999999999"
                },
                "amount_total": 2990,
                "currency": "brl",
                "mode": "subscription"
            }
        }
    }


def create_test_subscription_updated_event():
    """Create a test customer.subscription.updated event."""
    return {
        "id": f"evt_test_{int(time.time())}",
        "object": "event",
        "api_version": "2023-10-16",
        "created": int(time.time()),
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_test_subscription_123",
                "object": "subscription",
                "customer": "cus_test_customer_123",
                "status": "active",
                "current_period_start": int(time.time()),
                "current_period_end": int(time.time()) + (30 * 24 * 60 * 60),
                "items": {
                    "data": [
                        {
                            "price": {
                                "id": settings.stripe_premium_monthly_price_id,
                                "currency": "brl",
                                "unit_amount": 2990
                            }
                        }
                    ]
                },
                "metadata": {
                    "user_id": "1"
                }
            }
        }
    }


def create_test_subscription_deleted_event():
    """Create a test customer.subscription.deleted event."""
    return {
        "id": f"evt_test_{int(time.time())}",
        "object": "event",
        "api_version": "2023-10-16",
        "created": int(time.time()),
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_test_subscription_123",
                "object": "subscription",
                "customer": "cus_test_customer_123",
                "status": "canceled",
                "current_period_start": int(time.time()) - (30 * 24 * 60 * 60),
                "current_period_end": int(time.time()),
                "canceled_at": int(time.time()),
                "metadata": {
                    "user_id": "1"
                }
            }
        }
    }


def create_test_invoice_payment_failed_event():
    """Create a test invoice.payment_failed event."""
    return {
        "id": f"evt_test_{int(time.time())}",
        "object": "event",
        "api_version": "2023-10-16",
        "created": int(time.time()),
        "type": "invoice.payment_failed",
        "data": {
            "object": {
                "id": f"in_test_{int(time.time())}",
                "object": "invoice",
                "customer": "cus_test_customer_123",
                "subscription": "sub_test_subscription_123",
                "status": "open",
                "attempt_count": 1,
                "amount_due": 2990,
                "currency": "brl",
                "metadata": {
                    "user_id": "1"
                }
            }
        }
    }


def send_webhook_event(event_type: str, webhook_url: str = "http://localhost:8000/api/webhooks/stripe"):
    """
    Send a test webhook event to the local server.

    Args:
        event_type: Type of event to send
        webhook_url: URL of the webhook endpoint
    """
    # Create event based on type
    event_creators = {
        "checkout.session.completed": create_test_checkout_session_event,
        "customer.subscription.updated": create_test_subscription_updated_event,
        "customer.subscription.deleted": create_test_subscription_deleted_event,
        "invoice.payment_failed": create_test_invoice_payment_failed_event,
    }

    if event_type not in event_creators:
        print(f"❌ Unknown event type: {event_type}")
        print(f"Available types: {', '.join(event_creators.keys())}")
        return

    # Create the event
    event = event_creators[event_type]()

    print(f"\n{'='*60}")
    print(f"Testing Stripe Webhook: {event_type}")
    print(f"{'='*60}\n")

    # Convert to JSON
    payload = json.dumps(event, indent=2)

    print("Event Payload:")
    print(payload)
    print()

    # Generate webhook signature
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"

    try:
        import hashlib
        import hmac

        # Manually compute signature like Stripe does
        secret_bytes = settings.stripe_webhook_secret.encode('utf-8')
        signed_payload_bytes = signed_payload.encode('utf-8')
        signature = hmac.new(secret_bytes, signed_payload_bytes, hashlib.sha256).hexdigest()
        webhook_signature = f"t={timestamp},v1={signature}"

        print(f"Webhook Secret (first 20 chars): {settings.stripe_webhook_secret[:20]}...")
        print(f"Generated Signature: {webhook_signature[:50]}...\n")

    except Exception as e:
        print(f"Warning: Could not generate signature: {e}")
        print("Make sure STRIPE_WEBHOOK_SECRET is configured in your .env file\n")
        webhook_signature = "test_signature"

    # Send the request
    headers = {
        "Content-Type": "application/json",
        "Stripe-Signature": webhook_signature
    }

    print(f"Sending POST request to: {webhook_url}")
    print(f"Headers: {headers}\n")

    try:
        response = requests.post(
            webhook_url,
            data=payload,
            headers=headers,
            timeout=10
        )

        print(f"{'='*60}")
        print(f"Response Status: {response.status_code}")
        print(f"{'='*60}")

        if response.status_code == 200:
            print("✅ Webhook received successfully!")
            try:
                print(f"Response: {response.json()}")
            except:
                print(f"Response: {response.text}")
        else:
            print(f"❌ Webhook failed!")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ Connection Error!")
        print("Make sure the backend server is running at http://localhost:8000")
    except Exception as e:
        print(f"❌ Error sending webhook: {e}")

    print(f"\n{'='*60}\n")


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("Usage: python test_webhook.py <event_type>")
        print("\nAvailable event types:")
        print("  - checkout.session.completed")
        print("  - customer.subscription.updated")
        print("  - customer.subscription.deleted")
        print("  - invoice.payment_failed")
        print("\nExample:")
        print("  python test_webhook.py checkout.session.completed")
        sys.exit(1)

    event_type = sys.argv[1]

    # Optional: custom webhook URL
    webhook_url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:8000/api/webhooks/stripe"

    send_webhook_event(event_type, webhook_url)


if __name__ == "__main__":
    main()
