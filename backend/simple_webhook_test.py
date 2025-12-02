"""Simple webhook test script without Unicode characters."""

import json
import time
import hashlib
import hmac
import requests
from app.config import settings


def test_webhook():
    """Test the webhook endpoint."""

    # Create test event
    event = {
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
                    "user_id": "1",
                    "phone_number": "+5511999999999"
                },
                "amount_total": 2990,
                "currency": "brl",
                "mode": "subscription"
            }
        }
    }

    # Convert to JSON
    payload = json.dumps(event, indent=2)

    print("\n" + "=" * 60)
    print("Testing Stripe Webhook: checkout.session.completed")
    print("=" * 60 + "\n")

    print("Event Payload:")
    print(payload)
    print()

    # Generate signature
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"

    secret_bytes = settings.stripe_webhook_secret.encode('utf-8')
    signed_payload_bytes = signed_payload.encode('utf-8')
    signature = hmac.new(secret_bytes, signed_payload_bytes, hashlib.sha256).hexdigest()
    webhook_signature = f"t={timestamp},v1={signature}"

    print(f"Webhook Secret (first 20 chars): {settings.stripe_webhook_secret[:20]}...")
    print(f"Generated Signature: {webhook_signature[:50]}...\n")

    # Send request
    headers = {
        "Content-Type": "application/json",
        "Stripe-Signature": webhook_signature
    }

    print(f"Sending POST request to: http://localhost:8000/api/webhooks/stripe")
    print(f"Headers: {headers}\n")

    try:
        response = requests.post(
            "http://localhost:8000/api/webhooks/stripe",
            data=payload,
            headers=headers,
            timeout=10
        )

        print("=" * 60)
        print(f"Response Status: {response.status_code}")
        print("=" * 60)

        if response.status_code == 200:
            print("[SUCCESS] Webhook received successfully!")
            try:
                print(f"Response: {response.json()}")
            except:
                print(f"Response: {response.text}")
        else:
            print(f"[FAILED] Webhook failed!")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("[ERROR] Connection Error!")
        print("Make sure the backend server is running at http://localhost:8000")
    except Exception as e:
        print(f"[ERROR] Error sending webhook: {e}")

    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    test_webhook()
