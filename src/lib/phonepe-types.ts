/**
 * PhonePe API Types and Interfaces
 */

export interface PhonePeAuthResponse {
  success?: boolean;
  code?: string;
  message?: string;
  data?: {
    token?: string;
    accessToken?: string;
  };
  access_token?: string;
  expires_in?: number;
}

export interface PhonePePaymentRequest {
  merchantId: string;
  merchantTransactionId: string;
  amount: number;
  redirectUrl: string;
  callbackUrl: string;
  mobileNumber: string;
  paymentInstrument: {
    type: "CARD" | "NETBANKING" | "UPI" | "WALLET" | "EMI";
  };
  merchantUserId: string;
  signalId?: string;
  expireAfter?: number;
  metaInfo?: Record<string, string>;
  paymentModeConfig?: {
    [key: string]: {
      enabled: boolean;
    };
  };
}

export interface PhonePePaymentResponse {
  success: boolean;
  code: string;
  message: string;
  data: {
    merchantId: string;
    merchantTransactionId: string;
    instrumentResponse: {
      type: string;
      redirectUrl: string;
    };
  };
}

export interface PhonePeStatusCheckRequest {
  merchantId: string;
  merchantTransactionId: string;
  ["X-Verify"]: string;
  ["X-MERCHANT-ID"]: string;
}

export interface PhonePeStatusResponse {
  success: boolean;
  code: string;
  message: string;
  data?: {
    merchantId: string;
    merchantTransactionId: string;
    transactionId: string;
    amount: number;
    state: "COMPLETED" | "FAILED" | "PENDING";
    responseCode: string;
    paymentInstrument: Record<string, any>;
  };
  payload?: {
    state?: "COMPLETED" | "FAILED" | "PENDING";
    transactionId?: string;
    merchantTransactionId?: string;
  };
}

export interface PhonePeWebhookPayload {
  event: "checkout.order.completed" | "checkout.order.failed" | "pg.refund.completed" | "pg.refund.failed";
  transactionId: string;
  merchantTransactionId: string;
  merchantId: string;
  amount: number;
  state: "COMPLETED" | "FAILED" | "PENDING";
  responseCode: string;
  paymentInstrument: Record<string, any>;
  timestamp: number;
  ["X-VERIFY"]: string;
}

export interface PaymentInitResponse {
  success: boolean;
  message: string;
  redirectUrl?: string;
  merchantTransactionId?: string;
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  message: string;
  state?: "COMPLETED" | "FAILED" | "PENDING";
  transactionId?: string;
  error?: string;
}
