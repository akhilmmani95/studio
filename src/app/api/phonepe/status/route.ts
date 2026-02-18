/**
 * API Route: Check Payment Status
 * GET /api/phonepe/status?merchantTransactionId=...
 * Check payment status via API (fallback if webhook fails)
 */

import { NextRequest, NextResponse } from "next/server";
import { phonePeService } from "@/services/phonepe";

export async function GET(request: NextRequest) {
  try {
    const orderId =
      request.nextUrl.searchParams.get("order_id") ||
      request.nextUrl.searchParams.get("orderId") ||
      request.nextUrl.searchParams.get("merchantTransactionId");

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Missing order_id" },
        { status: 400 }
      );
    }

    const result = await phonePeService.checkPaymentStatus(orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Status check API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 }
    );
  }
}
