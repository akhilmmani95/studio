
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signPayload, verifyPayload } from '@/lib/jwt';
import { PlaceHolderImages } from './placeholder-images';
import { notFound } from 'next/navigation';
import type { Booking, Event, JWTPayload } from './types';

// In a real production app, you would fetch from Firestore here using the Admin SDK.
// Since we are limited to the client-side SDK for this project,
// most data fetching and mutations are now handled on the client.
// This file is kept for server-exclusive logic like payment verification.


export async function processPhonePePayment(data: { 
    amount: number;
    orderId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    bookingId?: string;
    eventId?: string;
  }) {
    try {
      // Call the checkout API route instead of calling PhonePe service directly
      // This keeps the integration in the API layer where environment vars are available
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/phonepe/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: data.orderId || `ORD_${Date.now()}`,
          amount: data.amount,
          customerName: data.customerName || 'Guest',
          customerPhone: data.customerPhone || '0000000000',
          customerEmail: data.customerEmail,
          bookingId: data.bookingId,
          eventId: data.eventId,
        }),
      });

      const result = await response.json();

      if (result.success && result.merchantTransactionId) {
        revalidatePath('/admin/bookings');
        revalidatePath('/admin');
        
        return { 
          success: true, 
          paymentId: result.merchantTransactionId,
          redirectUrl: result.redirectUrl,
        };
      }

      return { 
        success: false, 
        error: result.message || 'Payment initiation failed' 
      };
    } catch (error) {
      console.error('Error processing PhonePe payment:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment failed' 
      };
    }
}

export async function generateTicketJwt(payload: Omit<JWTPayload, 'iat'>): Promise<string> {
    return signPayload(payload);
}

export async function verifyTicketJwt(token: string): Promise<JWTPayload | null> {
    return verifyPayload(token);
}


// Note: getBookingDetails, getEvents, etc., are now handled client-side using hooks.
// This function remains as an example or for potential server-side needs.
export async function getPlaceholderImageById(id: string) {
    return PlaceHolderImages.find(img => img.id === id);
}

export async function uploadImage(formData: FormData): Promise<{ imageUrl?: string; error?: string; }> {
    const imageFile = formData.get('image') as File;
    if (!imageFile) {
        return { error: 'No image file provided.' };
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        console.error('IMGBB_API_KEY is not set in environment variables.');
        return { error: 'Image upload service is not configured.' };
    }

    const uploadFormData = new FormData();
    uploadFormData.append('image', imageFile);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: uploadFormData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            return { error: `Image upload failed: ${result.error?.message || 'Unknown error'}` };
        }

        return { imageUrl: result.data.url };

    } catch (error) {
        console.error('Error uploading to ImgBB:', error);
        return { error: 'An unexpected error occurred during image upload.' };
    }
}


// This function is now client-side as it needs a Firestore instance.
// It is left here as a placeholder to avoid breaking imports, but it's not used.
export async function markAsRedeemed(bookingId: string) {
   // No longer implemented on the server. See VerifierClient.tsx
   console.log(`Attempted to mark booking ${bookingId} as redeemed via server action.`);
}
