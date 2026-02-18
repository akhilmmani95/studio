/**
 * Payment Integration Utilities
 * Client-side helpers for payment flow
 */

"use client";

import type { PaymentInitResponse } from "@/lib/phonepe-types";

/**
 * Initiate Cashfree payment from client
 */
export async function initiatePhonePePayment(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  bookingId?: string;
  eventId?: string;
}): Promise<PaymentInitResponse> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    
    const response = await fetch(`${appUrl}/api/phonepe/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || "Payment initiation failed",
        error: data.error,
      };
    }

    return data;
  } catch (error) {
    console.error("Error initiating payment:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Payment initiation failed",
    };
  }
}

/**
 * Step 3: Invoke Cashfree checkout (redirect flow)
 */
export async function loadPhonePePayPage(
  paymentSessionId: string,
  mode: "sandbox" | "production" = "sandbox"
): Promise<void> {
  if (!paymentSessionId) {
    console.error("No payment session id provided");
    return;
  }

  const scriptId = "cashfree-sdk-js";
  if (!document.getElementById(scriptId)) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
      document.head.appendChild(script);
    });
  }

  const cashfreeFactory = (window as Window & { Cashfree?: (opts: { mode: "sandbox" | "production" }) => any }).Cashfree;
  if (!cashfreeFactory) {
    throw new Error("Cashfree SDK unavailable");
  }

  const cashfree = cashfreeFactory({ mode });
  await cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self",
  });
}

/**
 * Verify payment status via API
 * Can be used to poll for payment status or as fallback to webhook
 */
export async function verifyPaymentStatus(
  merchantTransactionId: string
): Promise<{
  success: boolean;
  state?: "COMPLETED" | "FAILED" | "PENDING";
  message: string;
}> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    
    const response = await fetch(
      `${appUrl}/api/phonepe/status?merchantTransactionId=${merchantTransactionId}`
    );

    const data = await response.json();

    return {
      success: data.success,
      state: data.state,
      message: data.message || "Status check failed",
    };
  } catch (error) {
    console.error("Error verifying payment:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Status check failed",
    };
  }
}

/**
 * Handle PhonePe payment callback
 * Called when user returns from payment page
 */
export async function handlePhonePeCallback(merchantTransactionId: string): Promise<void> {
  try {
    // Verify payment status
    const verification = await verifyPaymentStatus(merchantTransactionId);

    if (verification.success && verification.state === "COMPLETED") {
      // Payment successful
      console.log("Payment verified as completed");
      // Redirect to success page will be handled by the component
      return;
    }

    if (verification.state === "FAILED") {
      throw new Error("Payment verification failed");
    }

    if (verification.state === "PENDING") {
      console.log("Payment is still pending, will be updated via webhook");
      return;
    }

    throw new Error("Unknown payment status");
  } catch (error) {
    console.error("Error handling callback:", error);
    throw error;
  }
}

/**
 * Initialize PhonePe Payment SDK (if using their hosted checkout)
 * Note: Standard Checkout typically handles this automatically
 */
export function initPhonePeSDK(): void {
  // If PhonePe provides a JavaScript SDK, initialize it here
  // For standard checkout via iframe/redirect, this might not be needed

  // Example:
  // const script = document.createElement('script');
  // script.src = 'https://phonepe.com/payment-sdk/v1.js';
  // document.head.appendChild(script);
}
