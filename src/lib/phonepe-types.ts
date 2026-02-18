/**
 * Payment API Types and Interfaces
 */

export interface CashfreeCreateOrderResponse {
  order_id: string;
  cf_order_id?: string;
  payment_session_id?: string;
  order_status?: string;
  message?: string;
  code?: string;
}

export interface CashfreeGetOrderResponse {
  order_id: string;
  cf_order_id?: string;
  order_status?: "PAID" | "ACTIVE" | "EXPIRED" | "TERMINATED" | string;
  order_amount?: number;
  order_currency?: string;
  payment_session_id?: string;
  message?: string;
  code?: string;
}

export interface CashfreeWebhookPayload {
  type?: "PAYMENT_SUCCESS_WEBHOOK" | "PAYMENT_FAILED_WEBHOOK" | "PAYMENT_USER_DROPPED_WEBHOOK" | string;
  event_time?: string;
  data?: {
    order?: {
      order_id?: string;
    };
    payment?: {
      cf_payment_id?: string;
      payment_status?: "SUCCESS" | "FAILED" | "USER_DROPPED" | string;
      payment_message?: string;
    };
    error_details?: {
      error_code?: string;
      error_description?: string;
      error_reason?: string;
    };
  };
}

export interface PaymentInitResponse {
  success: boolean;
  message: string;
  paymentSessionId?: string;
  redirectUrl?: string; // kept for backward compatibility
  merchantTransactionId?: string;
  checkoutMode?: "sandbox" | "production";
  error?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  message: string;
  state?: "COMPLETED" | "FAILED" | "PENDING";
  transactionId?: string;
  error?: string;
}
