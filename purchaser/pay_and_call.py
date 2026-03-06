#!/usr/bin/env python3
"""
pay_and_call.py — CloudAGI purchaser agent (Python).

Purchases access to a Nevermined-registered agent via x402 payment protocol,
then calls the agent's endpoint with a message.

Usage:
  export NVM_API_KEY="your-api-key"
  python3 pay_and_call.py \
    --url https://agent.example.com/v1/services/gpu-compute/execute \
    --message '{"command": ["python3", "-c", "print(42)"]}' \
    --plan-id did:nv:abc123 \
    --agent-id did:nv:def456

  # Optional: --timeout 120, --environment sandbox
"""
import argparse, json, os, sys, requests
from payments_py import Payments, PaymentOptions


def get_payments():
    api_key = os.environ.get("NVM_API_KEY")
    if not api_key:
        print("ERROR: NVM_API_KEY environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return Payments.get_instance(PaymentOptions(
        nvm_api_key=api_key,
        environment=os.environ.get("NVM_ENVIRONMENT", "sandbox"),
        app_id="cloudagi-purchaser",
        version="1.0.0"
    ))


def call_agent(url, message, plan_id, agent_id, timeout=120):
    payments = get_payments()

    # Check balance
    balance = payments.plans.get_plan_balance(plan_id)
    print(f"Credits remaining: {balance.balance}")

    if balance.balance <= 0:
        print("No credits. Ordering plan...")
        payments.plans.order_plan(plan_id)
        balance = payments.plans.get_plan_balance(plan_id)
        print(f"Credits after order: {balance.balance}")

    # Get x402 access token
    access = payments.x402.get_x402_access_token(plan_id, agent_id)
    token = access["accessToken"]
    print(f"Calling {url}...")

    # Call the seller's endpoint
    response = requests.post(
        url,
        headers={
            "payment-signature": token,
            "Content-Type": "application/json",
        },
        json={"message": message},
        timeout=timeout,
    )

    print(f"Status: {response.status_code}")

    try:
        data = response.json()
        print(json.dumps(data, indent=2))
        return data
    except Exception:
        print(f"Raw: {response.text[:500]}")


def main():
    parser = argparse.ArgumentParser(
        description="CloudAGI Purchaser — buy and call Nevermined agents"
    )
    parser.add_argument("--url", required=True, help="Agent endpoint URL")
    parser.add_argument("--message", required=True, help="Message/payload to send")
    parser.add_argument("--plan-id", required=True, help="Nevermined plan DID")
    parser.add_argument("--agent-id", required=True, help="Nevermined agent DID")
    parser.add_argument("--timeout", type=int, default=120, help="Request timeout in seconds")
    args = parser.parse_args()

    call_agent(args.url, args.message, args.plan_id, args.agent_id, args.timeout)


if __name__ == "__main__":
    main()
