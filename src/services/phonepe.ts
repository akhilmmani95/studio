/**
 * Cashfree Payment Gateway Service
 * NOTE: File path kept as phonepe.ts to avoid breaking imports.
 */

import crypto from "crypto";
import type {
  CashfreeCreateOrderResponse,
  CashfreeGetOrderResponse,
  PaymentInitResponse,
  PaymentStatusResponse,
} from "@/lib/phonepe-types";

const CASHFREE_API_BASE = "https://api.cashfree.com/pg";
const CASHFREE_SANDBOX_BASE = "https://sandbox.cashfree.com/pg";

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  apiVersion: string;
  redirectUrl: string;
  callbackUrl: string;
  isSandbox: boolean;
}

class PhonePeService {
  private config: CashfreeConfig;

  constructor(config: CashfreeConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return this.config.isSandbox ? CASHFREE_SANDBOX_BASE : CASHFREE_API_BASE;
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      "x-client-id": this.config.appId,
      "x-client-secret": this.config.secretKey,
      "x-api-version": this.config.apiVersion,
    };
  }

  private buildReturnUrl(eventId?: string, bookingId?: string, orderId?: string): string {
    let returnUrl = this.config.redirectUrl;

    if (eventId) {
      returnUrl = returnUrl.replace("[eventId]", encodeURIComponent(eventId));
    }
    if (bookingId) {
      returnUrl = returnUrl.replace("[bookingId]", encodeURIComponent(bookingId));
    }

    // Cashfree appends order_id. Keep explicit fallback for consistency.
    if (orderId && !returnUrl.includes("order_id=")) {
      const separator = returnUrl.includes("?") ? "&" : "?";
      returnUrl = `${returnUrl}${separator}order_id=${encodeURIComponent(orderId)}`;
    }

    return returnUrl;
  }

  async initiatePayment(params: {
    orderId: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    bookingId?: string;
    eventId?: string;
  }): Promise<PaymentInitResponse> {
    try {
      const customerId = params.bookingId
        ? `booking_${params.bookingId}`
        : `cust_${Date.now()}`;

      const createOrderBody = {
        order_id: params.orderId,
        order_amount: Number(params.amount.toFixed(2)),
        order_currency: "INR",
        customer_details: {
          customer_id: customerId,
          customer_name: params.customerName,
          customer_phone: params.customerPhone,
          ...(params.customerEmail ? { customer_email: params.customerEmail } : {}),
        },
        order_meta: {
          return_url: this.buildReturnUrl(params.eventId, params.bookingId, params.orderId),
          notify_url: this.config.callbackUrl,
        },
        order_note: `Payment for ${params.orderId}`,
      };

      const response = await fetch(`${this.getBaseUrl()}/orders`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(createOrderBody),
      });

      const data: CashfreeCreateOrderResponse = await response.json();

      if (!response.ok || !data.payment_session_id) {
        return {
          success: false,
          message: data.message || "Failed to create Cashfree order",
          error: data.code,
        };
      }

      return {
        success: true,
        message: "Payment initiated",
        paymentSessionId: data.payment_session_id,
        // Keep field name for compatibility with existing UI/state.
        merchantTransactionId: data.order_id || params.orderId,
        checkoutMode: this.config.isSandbox ? "sandbox" : "production",
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Payment initiation failed",
      };
    }
  }

  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const data: CashfreeGetOrderResponse = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Status check failed",
          error: data.code,
        };
      }

      const status = data.order_status || "ACTIVE";
      if (status === "PAID") {
        return {
          success: true,
          state: "COMPLETED",
          message: "Payment COMPLETED",
          transactionId: data.cf_order_id,
        };
      }

      if (status === "ACTIVE") {
        return {
          success: true,
          state: "PENDING",
          message: "Payment PENDING",
          transactionId: data.cf_order_id,
        };
      }

      return {
        success: true,
        state: "FAILED",
        message: `Payment ${status}`,
        transactionId: data.cf_order_id,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
    try {
      const signedPayload = `${timestamp}${payload}`;
      const expected = crypto
        .createHmac("sha256", this.config.secretKey)
        .update(signedPayload)
        .digest("base64");

      if (expected.length !== signature.length) {
        return false;
      }

      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}

function initPhonePeService(): PhonePeService {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const apiVersion = process.env.CASHFREE_API_VERSION || "2023-08-01";
  const redirectUrl = process.env.CASHFREE_REDIRECT_URL;
  const callbackUrl = process.env.CASHFREE_CALLBACK_URL;

  if (!appId || !secretKey || !redirectUrl || !callbackUrl) {
    throw new Error("Cashfree environment variables are not configured");
  }

  return new PhonePeService({
    appId,
    secretKey,
    apiVersion,
    redirectUrl,
    callbackUrl,
    isSandbox: process.env.CASHFREE_SANDBOX === "true",
  });
}

export const phonePeService = initPhonePeService();
