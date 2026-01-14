/**
 * Stripe API client for managing subscriptions and payments
 */

import apiClient from "./client";

export interface CreateCheckoutSessionRequest {
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CreateCheckoutSessionResponse {
  checkout_url: string;
  message: string;
}

export interface CancelSubscriptionRequest {
  immediately?: boolean;
}

export interface CancelSubscriptionResponse {
  message: string;
  immediately: boolean;
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  subscription_status: string | null;
  subscription_period_end: string | null;
  plan: string;
  cancel_at_period_end?: boolean;
  current_period_start?: string;
  current_period_end?: string;
}

/**
 * Create a Stripe Checkout session for subscription purchase
 */
export async function createCheckoutSession(
  request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  const response = await apiClient.post<CreateCheckoutSessionResponse>(
    "/api/stripe/create-checkout-session",
    request
  );
  return response.data;
}

/**
 * Cancel user's subscription
 */
export async function cancelSubscription(
  request: CancelSubscriptionRequest = {}
): Promise<CancelSubscriptionResponse> {
  const response = await apiClient.post<CancelSubscriptionResponse>(
    "/api/stripe/cancel-subscription",
    request
  );
  return response.data;
}

/**
 * Get user's subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await apiClient.get<SubscriptionStatus>(
    "/api/stripe/subscription-status"
  );
  return response.data;
}

/**
 * Verify checkout session status
 */
export async function verifySession(sessionId: string): Promise<{ verified: boolean; message: string }> {
  const response = await apiClient.post<{ verified: boolean; message: string }>(
    `/api/stripe/verify-session/${sessionId}`
  );
  return response.data;
}

/**
 * Price IDs for different subscription plans
 * These should match the Stripe Price IDs configured in the backend
 */
export const STRIPE_PRICE_IDS = {
  PREMIUM_MONTHLY: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID || "",
  PREMIUM_ANNUAL: import.meta.env.VITE_STRIPE_PREMIUM_ANNUAL_PRICE_ID || "",
  ENTERPRISE_MONTHLY: import.meta.env.VITE_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || "",
  ENTERPRISE_ANNUAL: import.meta.env.VITE_STRIPE_ENTERPRISE_ANNUAL_PRICE_ID || "",
} as const;

/**
 * Helper function to redirect to Stripe Checkout
 */
export async function redirectToCheckout(
  priceId: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<void> {
  const baseUrl = window.location.origin;
  const response = await createCheckoutSession({
    price_id: priceId,
    success_url: successUrl || `${baseUrl}/account?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${baseUrl}/account?payment=cancelled`,
  });

  // Redirect to Stripe Checkout
  window.location.href = response.checkout_url;
}
