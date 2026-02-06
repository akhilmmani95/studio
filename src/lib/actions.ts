'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signPayload } from '@/lib/jwt';
import { PlaceHolderImages } from './placeholder-images';
import { notFound } from 'next/navigation';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import type { Booking, Event, JWTPayload } from './types';

// In a real production app, you would fetch from Firestore here using the Admin SDK.
// Since we are limited to the client-side SDK for this project,
// most data fetching and mutations are now handled on the client.
// This file is kept for server-exclusive logic like payment verification.


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createRazorpayOrder(amount: number) {
    const options = {
        amount: amount * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: `receipt_order_${Date.now()}`
    };

    try {
        const order = await razorpay.orders.create(options);
        return { ...order, key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID! };
    } catch (error) {
        console.error("Error creating razorpay order", error);
        throw new Error("Could not create Razorpay order.");
    }
}

export async function verifyRazorpayPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");
  
    if (expectedSignature !== data.razorpay_signature) {
      throw new Error('Payment verification failed');
    }

    // Since this is a server action, we revalidate paths that show booking data.
    revalidatePath('/admin/bookings');
    revalidatePath('/admin');
    
    return { success: true };
}

export async function generateTicketJwt(payload: Omit<JWTPayload, 'iat'>): Promise<string> {
    return signPayload(payload);
}


// Note: getBookingDetails, getEvents, etc., are now handled client-side using hooks.
// This function remains as an example or for potential server-side needs.
export async function getPlaceholderImageById(id: string) {
    return PlaceHolderImages.find(img => img.id === id);
}

// This function is now client-side as it needs a Firestore instance.
// It is left here as a placeholder to avoid breaking imports, but it's not used.
export async function markAsRedeemed(bookingId: string) {
   // No longer implemented on the server. See VerifierClient.tsx
   console.log(`Attempted to mark booking ${bookingId} as redeemed via server action.`);
}
