/**
 * API Route: Payment Webhook Handler
 * POST /api/phonepe/webhook
 * File path is preserved for compatibility.
 */

import { NextRequest, NextResponse } from "next/server";
import { phonePeService } from "@/services/phonepe";
import type { CashfreeWebhookPayload } from "@/lib/phonepe-types";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,x-webhook-signature,x-webhook-timestamp",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature");
    const timestamp = request.headers.get("x-webhook-timestamp");

    if (signature && timestamp) {
      const valid = phonePeService.verifyWebhookSignature(rawBody, signature, timestamp);
      if (!valid) {
        return NextResponse.json(
          { success: false, message: "Invalid signature" },
          { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
    }

    const payload: CashfreeWebhookPayload = JSON.parse(rawBody);
    const result = await processPaymentStatus(payload);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

async function processPaymentStatus(
  payload: CashfreeWebhookPayload
): Promise<{ success: boolean; message: string }> {
  try {
    const type = payload.type;
    const orderId = payload.data?.order?.order_id;
    const paymentStatus = payload.data?.payment?.payment_status;
    const cfPaymentId = payload.data?.payment?.cf_payment_id;
    const failureReason =
      payload.data?.payment?.payment_message ||
      payload.data?.error_details?.error_description ||
      payload.data?.error_details?.error_reason;

    if (!type || !orderId) {
      return { success: false, message: "Missing webhook type or order_id" };
    }

    if (type === "PAYMENT_SUCCESS_WEBHOOK" || paymentStatus === "SUCCESS") {
      await updateBookingPaymentStatus(orderId, {
        paymentStatus: "COMPLETED",
        paymentId: cfPaymentId,
        completedAt: new Date().toISOString(),
      });
      return { success: true, message: "Payment completed and booking updated" };
    }

    if (type === "PAYMENT_FAILED_WEBHOOK" || paymentStatus === "FAILED") {
      await updateBookingPaymentStatus(orderId, {
        paymentStatus: "FAILED",
        failureReason,
        failedAt: new Date().toISOString(),
      });
      return { success: true, message: "Payment failure recorded" };
    }

    if (type === "PAYMENT_USER_DROPPED_WEBHOOK" || paymentStatus === "USER_DROPPED") {
      await updateBookingPaymentStatus(orderId, {
        paymentStatus: "FAILED",
        failureReason: "USER_DROPPED",
        failedAt: new Date().toISOString(),
      });
      return { success: true, message: "User dropped payment flow" };
    }

    return { success: true, message: "Event recorded" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

async function updateBookingPaymentStatus(orderId: string, updates: Record<string, unknown>): Promise<void> {
  // In production, query booking by paymentId/orderId and apply updates via Firebase Admin SDK.
  console.log(`Updating booking by orderId: ${orderId}`, updates);
}
