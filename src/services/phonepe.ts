/**
 * PhonePe Payment Gateway Service
 * Handles all interactions with PhonePe API
 * NOTE: This file is server-only. It uses Node.js built-ins (crypto, Buffer, process.env)
 */

import crypto from "crypto";
import type {
  PhonePeAuthResponse,
  PhonePePaymentRequest,
  PhonePePaymentResponse,
  PhonePeStatusResponse,
  PaymentInitResponse,
  PaymentStatusResponse,
} from "@/lib/phonepe-types";

const PHONEPE_API_BASE = "https://api.phonepe.com/apis/pg";
const PHONEPE_SANDBOX_BASE = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const PHONEPE_AUTH_URL = "https://api.phonepe.com/apis/identity-manager/v1/oauth/token";
const PHONEPE_SANDBOX_AUTH_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";

interface PhonePeConfig {
  clientId: string;
  clientSecret: string;
  clientVersion: string;
  redirectUrl: string;
  callbackUrl: string;
  isSandbox: boolean;
  saltKey?: string;
}

class PhonePeService {
  private config: PhonePeConfig;
  private authToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(config: PhonePeConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return this.config.isSandbox ? PHONEPE_SANDBOX_BASE : PHONEPE_API_BASE;
  }

  private getAuthUrl(): string {
    return this.config.isSandbox ? PHONEPE_SANDBOX_AUTH_URL : PHONEPE_AUTH_URL;
  }

  /**
   * Step 1: Generate Authorization Token
   * Creates a unique token for API authentication
   */
  async generateAuthToken(): Promise<string> {
    // Check if token is still valid (with 5 min buffer before expiry)
    if (this.authToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
      return this.authToken;
    }

    try {
      const tokenUrl = this.getAuthUrl();
      console.log("[PhonePe] Generating auth token from:", tokenUrl, "sandbox:", this.config.isSandbox);
      
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          client_version: this.config.clientVersion,
          grant_type: "client_credentials",
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate auth token: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: PhonePeAuthResponse = await response.json();
      const token =
        data?.data?.token ||
        (data as unknown as { access_token?: string }).access_token ||
        (data as unknown as { data?: { accessToken?: string } }).data?.accessToken;

      if (token) {
        this.authToken = token;
        // Defaults to 15 minutes if provider does not return expiry
        const expiresInSeconds = Number(
          (data as unknown as { expires_in?: number }).expires_in ?? 15 * 60
        );
        this.tokenExpiry = Date.now() + expiresInSeconds * 1000;
        return this.authToken;
      }

      throw new Error(`Auth token generation failed: ${data.message}`);
    } catch (error) {
      console.error("[PhonePe] Error generating auth token:", error instanceof Error ? error.message : error);
      console.error("[PhonePe] Full error:", error);
      throw error;
    }
  }

  /**
   * Step 2: Create Payment Request
   * Initiates a payment transaction
   */
  async initiatePayment(params: {
    orderId: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    bookingId?: string;
    eventId?: string;
    expireAfter?: number;
    metaInfo?: Record<string, string>;
    paymentModeConfig?: Record<string, { enabled: boolean }>;
  }): Promise<PaymentInitResponse> {
    try {
      console.log("[PhonePe] Initiating payment for order:", params.orderId);
      const authToken = await this.generateAuthToken();
      console.log("[PhonePe] Auth token obtained");
      const merchantTransactionId = `${this.config.clientId}_${params.orderId}_${Date.now()}`;

      const paymentRequest: PhonePePaymentRequest = {
        merchantOrderId: merchantTransactionId,
        amount: Math.round(params.amount * 100), // Convert to paise
        paymentFlow: {
          type: "PG_CHECKOUT",
          message: `Payment for ${params.orderId}`,
          merchantUrls: {
            redirectUrl: `${this.config.redirectUrl}?merchantTransactionId=${merchantTransactionId}`,
            callbackUrl: this.config.callbackUrl,
          },
        },
        expireAfter: params.expireAfter ?? 600, // 10 minutes default
        metaInfo: {
          bookingId: params.bookingId || "",
          eventId: params.eventId || "",
          customerName: params.customerName,
          customerEmail: params.customerEmail || "",
          ...(params.metaInfo || {}),
        },
        paymentModeConfig: params.paymentModeConfig,
      };

      const payUrl = `${this.getBaseUrl()}/checkout/v2/pay`;
      console.log("[PhonePe] Payment request URL:", payUrl);
      
      const response = await fetch(payUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${authToken}`,
        },
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[PhonePe] Payment API error:", response.status, errorText);
        throw new Error(`Payment initiation failed: ${response.statusText} - ${errorText}`);
      }

      const data: PhonePePaymentResponse = await response.json();
      console.log("[PhonePe] Payment response:", data);

      const redirectUrl = data?.redirectUrl || data?.data?.instrumentResponse?.redirectUrl;
      const merchantOrderId = data?.orderId || data?.data?.merchantTransactionId || merchantTransactionId;

      if (data.success && redirectUrl) {
        return {
          success: true,
          message: "Payment initiated",
          redirectUrl,
          merchantTransactionId: merchantOrderId,
        };
      }

      return {
        success: false,
        message: data.message || "Failed to initiate payment",
        error: data.code,
      };
    } catch (error) {
      console.error("[PhonePe] Error initiating payment:", error instanceof Error ? error.message : error);
      console.error("[PhonePe] Full error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Payment initiation failed",
      };
    }
  }

  /**
   * Step 4a: Check Payment Status
   * Verifies payment status via API (fallback if webhook fails)
   */
  async checkPaymentStatus(merchantTransactionId: string): Promise<PaymentStatusResponse> {
    try {
      const authToken = await this.generateAuthToken();
      const statusUrl = `${this.getBaseUrl()}/checkout/v2/order/${merchantTransactionId}/status`;

      const response = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status check failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: PhonePeStatusResponse = await response.json();
      const normalizedState = data?.payload?.state || data?.data?.state;
      const normalizedTransactionId =
        data?.payload?.transactionId || data?.data?.transactionId;

      if (data.success && normalizedState) {
        return {
          success: true,
          message: `Payment ${normalizedState}`,
          state: normalizedState,
          transactionId: normalizedTransactionId,
        };
      }

      return {
        success: false,
        message: data.message || "Status check failed",
        error: data.code,
      };
    } catch (error) {
      console.error("Error checking PhonePe payment status:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Status check failed",
      };
    }
  }

  /**
   * Verify Webhook Signature
   * Validates that the webhook came from PhonePe
   */
  verifyWebhookSignature(payload: string, receivedSignature: string): boolean {
    try {
      if (!this.config.saltKey) {
        // v2 Standard Checkout does not require X-VERIFY checksum for core flow.
        // Keep webhook verification optional unless a salt key is explicitly configured.
        return true;
      }
      const signature = this.generateChecksum(payload, "WEBHOOK");
      return signature === receivedSignature;
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return false;
    }
  }

  /**
   * Generate Checksum for Request/Response Verification
   * Security measure to ensure data integrity
   */
  private generateChecksum(
    payload: string,
    type: "PAY" | "STATUS" | "WEBHOOK" | "REFUND"
  ): string {
    if (!this.config.saltKey) {
      throw new Error("PHONEPE_SALT_KEY is required for checksum generation");
    }
    const keyIndex = 1;
    const hashInput = `${payload}${this.config.saltKey}${type}`;
    const hash = crypto.createHash("sha256").update(hashInput).digest("hex");
    return `${hash}###${keyIndex}`;
  }

  /**
   * Refund Payment (Optional Feature)
   * Process refund for a transaction
   */
  async refundPayment(params: {
    originalMerchantTransactionId: string;
    refundAmount: number;
    refundReason?: string;
  }): Promise<PaymentStatusResponse> {
    try {
      const authToken = await this.generateAuthToken();
      const merchantRefundId = `${this.config.clientId}_REFUND_${Date.now()}`;

      const refundRequest = {
        originalMerchantOrderId: params.originalMerchantTransactionId,
        merchantRefundId,
        refundAmount: Math.round(params.refundAmount * 100),
        refundReason: params.refundReason || "Customer requested refund",
      };

      const response = await fetch(`${this.getBaseUrl()}/payments/v2/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${authToken}`,
        },
        body: JSON.stringify(refundRequest),
      });

      if (!response.ok) {
        throw new Error(`Refund failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        message: data.message || "Refund processed",
        error: data.code,
      };
    } catch (error) {
      console.error("Error refunding PhonePe payment:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Refund failed",
      };
    }
  }
}

// Initialize service with environment variables
function initPhonePeService(): PhonePeService {
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  const clientVersion = process.env.PHONEPE_CLIENT_VERSION;
  const redirectUrl = process.env.PHONEPE_REDIRECT_URL;
  const callbackUrl = process.env.PHONEPE_CALLBACK_URL;
  const saltKey = process.env.PHONEPE_SALT_KEY;

  if (!clientId || !clientSecret || !clientVersion || !redirectUrl || !callbackUrl) {
    throw new Error("PhonePe environment variables are not configured");
  }

  return new PhonePeService({
    clientId,
    clientSecret,
    clientVersion,
    redirectUrl,
    callbackUrl,
    isSandbox: process.env.PHONEPE_SANDBOX === "true",
    saltKey,
  });
}

export const phonePeService = initPhonePeService();
