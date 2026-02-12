/**
 * API Route: PhonePe Payment Initiation
 * POST /api/phonepe/checkout
 * Initiates a payment transaction
 */

import { NextRequest, NextResponse } from "next/server";
import { phonePeService } from "@/services/phonepe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      orderId,
      amount,
      customerName,
      customerPhone,
      customerEmail,
      bookingId,
      eventId,
    } = body;

    // Validate required fields
    if (!orderId || !amount || !customerName || !customerPhone) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0 || typeof amount !== "number") {
      return NextResponse.json(
        { success: false, message: "Invalid amount" },
        { status: 400 }
      );
    }

    // Validate phone number (should be 10 digits)
    const cleanPhone = customerPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number" },
        { status: 400 }
      );
    }

    const result = await phonePeService.initiatePayment({
      orderId,
      amount,
      customerName,
      customerPhone,
      customerEmail,
      bookingId,
      eventId,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Checkout API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Checkout failed",
      },
      { status: 500 }
    );
  }
}
