/**
 * API Route: PhonePe Webhook Handler
 * POST /api/phonepe/webhook
 * Receives payment status updates from PhonePe
 */

import { NextRequest, NextResponse } from "next/server";
import { phonePeService } from "@/services/phonepe";

// Firebase Admin SDK will need to be initialized in production
// Import from 'firebase-admin/firestore' and set up credentials

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Verify, X-CLIENT-ID",
    },
  });
}

interface WebhookPayload {
  event?: string;
  transactionId?: string;
  merchantTransactionId?: string;
  merchantId?: string;
  amount?: number;
  state?: "COMPLETED" | "FAILED" | "PENDING";
  responseCode?: string;
  paymentInstrument?: Record<string, any>;
  timestamp?: number;
  payload?: {
    state?: "COMPLETED" | "FAILED" | "PENDING";
    transactionId?: string;
    merchantTransactionId?: string;
    merchantId?: string;
    amount?: number;
    responseCode?: string;
    paymentInstrument?: Record<string, any>;
    timestamp?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("X-Verify");

    if (!signature) {
      console.warn("Missing X-Verify header in webhook");
      return NextResponse.json(
        { success: false, message: "Missing verification header" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Verify webhook signature
    if (!phonePeService.verifyWebhookSignature(rawBody, signature)) {
      console.warn("Invalid webhook signature");
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const payload: WebhookPayload = JSON.parse(rawBody);
    const normalizedState = payload?.payload?.state || payload?.state;
    const normalizedMerchantTxnId =
      payload?.payload?.merchantTransactionId || payload?.merchantTransactionId;

    console.log("Webhook received:", {
      event: payload.event,
      state: normalizedState,
      merchantTransactionId: normalizedMerchantTxnId,
    });

    // Process payment status update
    const result = await processPaymentStatus(payload);

    if (!result.success) {
      return NextResponse.json(result, {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Return success to PhonePe
    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed",
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Webhook processing failed",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

/**
 * Process payment status based on webhook event
 */
async function processPaymentStatus(
  payload: WebhookPayload
): Promise<{ success: boolean; message: string }> {
  try {
    const event = payload.event;
    const state = payload?.payload?.state || payload?.state;
    const merchantTransactionId =
      payload?.payload?.merchantTransactionId || payload?.merchantTransactionId;
    const transactionId = payload?.payload?.transactionId || payload?.transactionId;
    const responseCode = payload?.payload?.responseCode || payload?.responseCode;

    if (!event) {
      return { success: false, message: "Missing webhook event" };
    }

    if (!merchantTransactionId) {
      return { success: false, message: "Missing merchantTransactionId in webhook payload" };
    }

    console.log(`Processing payment: ${merchantTransactionId}, State: ${state}`);

    switch (event) {
      case "checkout.order.completed":
        if (state === "COMPLETED") {
          // Payment successful - update booking status in Firestore
          await updateBookingPaymentStatus(merchantTransactionId, {
            paymentStatus: "COMPLETED",
            paymentId: transactionId,
            completedAt: new Date().toISOString(),
          });

          return {
            success: true,
            message: "Payment completed and booking updated",
          };
        }
        break;

      case "checkout.order.failed": {
        // Payment failed - update booking status
        await updateBookingPaymentStatus(merchantTransactionId, {
          paymentStatus: "FAILED",
          failureReason: responseCode,
          failedAt: new Date().toISOString(),
        });

        return {
          success: true,
          message: "Payment failure recorded",
        };
      }

      case "pg.refund.completed": {
        // Refund successful
        await updateBookingPaymentStatus(merchantTransactionId, {
          refundStatus: "COMPLETED",
          refundedAt: new Date().toISOString(),
        });

        return {
          success: true,
          message: "Refund completed",
        };
      }

      case "pg.refund.failed": {
        // Refund failed
        await updateBookingPaymentStatus(merchantTransactionId, {
          refundStatus: "FAILED",
        });

        return {
          success: true,
          message: "Refund failure recorded",
        };
      }

      default:
        console.warn(`Unknown webhook event: ${event}`);
        return {
          success: true,
          message: "Event recorded",
        };
    }

    return {
      success: true,
      message: "Payment status processed",
    };
  } catch (error) {
    console.error("Error processing payment status:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Processing failed",
    };
  }
}

/**
 * Update booking payment status in Firestore
 * Note: This requires proper Firebase Admin SDK setup in production
 */
async function updateBookingPaymentStatus(
  merchantTransactionId: string,
  updates: Record<string, any>
): Promise<void> {
  try {
    // In a production environment, you would:
    // 1. Query Firestore to find the booking with this merchantTransactionId
    // 2. Update the booking document with payment status

    // For now, we'll log the update
    console.log(`Updating booking with merchantTransactionId: ${merchantTransactionId}`, updates);

    // Uncomment below when you have Firebase Admin SDK set up:
    /*
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('merchantTransactionId', '==', merchantTransactionId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.warn(`No booking found for merchantTransactionId: ${merchantTransactionId}`);
      return;
    }

    const bookingDoc = querySnapshot.docs[0];
    await updateDoc(bookingDoc.ref, updates);
    */
  } catch (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
}
