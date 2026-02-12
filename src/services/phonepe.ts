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
  PhonePeWebhookPayload,
  PaymentInitResponse,
  PaymentStatusResponse,
} from "@/lib/phonepe-types";

const PHONEPE_API_BASE = "https://api.phonepe.com/apis/hermes";
const PHONEPE_SANDBOX_BASE = "https://api-preprod.phonepe.com/apis/hermes";
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
  }): Promise<PaymentInitResponse> {
    try {
      console.log("[PhonePe] Initiating payment for order:", params.orderId);
      const authToken = await this.generateAuthToken();
      console.log("[PhonePe] Auth token obtained");
      const merchantTransactionId = `${this.config.clientId}_${params.orderId}_${Date.now()}`;

      const paymentRequest: PhonePePaymentRequest = {
        merchantId: this.config.clientId,
        merchantTransactionId,
        amount: Math.round(params.amount * 100), // Convert to paise
        redirectUrl: `${this.config.redirectUrl}?merchantTransactionId=${merchantTransactionId}`,
        callbackUrl: this.config.callbackUrl,
        mobileNumber: params.customerPhone.replace(/\D/g, "").slice(-10),
        merchantUserId: params.bookingId || `user_${params.customerPhone}`,
        paymentInstrument: {
          type: "UPI",
        },
        expireAfter: 600, // 10 minutes
        metaInfo: {
          bookingId: params.bookingId || "",
          eventId: params.eventId || "",
          customerName: params.customerName,
          customerEmail: params.customerEmail || "",
        },
      };

      const base64Request = Buffer.from(JSON.stringify(paymentRequest)).toString("base64");
      const checksum = this.generateChecksum(base64Request, "PAY");

      const payUrl = `${this.getBaseUrl()}/pg/v1/pay`;
      console.log("[PhonePe] Payment request URL:", payUrl);
      
      const response = await fetch(payUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CLIENT-ID": this.config.clientId,
          "X-VERIFY": checksum,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          request: base64Request,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[PhonePe] Payment API error:", response.status, errorText);
        throw new Error(`Payment initiation failed: ${response.statusText} - ${errorText}`);
      }

      const data: PhonePePaymentResponse = await response.json();
      console.log("[PhonePe] Payment response:", data);

      if (data.success && data.data?.instrumentResponse?.redirectUrl) {
        return {
          success: true,
          message: "Payment initiated",
          redirectUrl: data.data.instrumentResponse.redirectUrl,
          merchantTransactionId: merchantTransactionId,
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
      const checksum = this.generateChecksum(
        `/pg/v1/status/${this.config.clientId}/${merchantTransactionId}`,
        "STATUS"
      );

      const response = await fetch(
        `${this.getBaseUrl()}/pg/v1/status/${this.config.clientId}/${merchantTransactionId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-CLIENT-ID": this.config.clientId,
            "X-VERIFY": checksum,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data: PhonePeStatusResponse = await response.json();

      if (data.success) {
        return {
          success: true,
          message: `Payment ${data.data.state}`,
          state: data.data.state,
          transactionId: data.data.transactionId,
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
        clientId: this.config.clientId,
        originalMerchantTransactionId: params.originalMerchantTransactionId,
        merchantRefundId,
        refundAmount: Math.round(params.refundAmount * 100),
        refundReason: params.refundReason || "Customer requested refund",
      };

      const base64Request = Buffer.from(JSON.stringify(refundRequest)).toString("base64");
      const checksum = this.generateChecksum(base64Request, "REFUND");

      const response = await fetch(`${this.getBaseUrl()}/pg/v1/refund`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CLIENT-ID": this.config.clientId,
          "X-VERIFY": checksum,
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          request: base64Request,
        }),
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
