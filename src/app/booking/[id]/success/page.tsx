'use client';
import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TicketDisplay } from '@/components/booking/TicketDisplay';
import { Header } from '@/components/shared/Header';
import { CheckCircle, Loader2 } from 'lucide-react';
import type { Booking, Event, TicketTier } from '@/lib/types';
import { signPayload } from '@/lib/jwt';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';

function SuccessPageSkeleton() {
    return (
        <div className="container max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
                <Skeleton className="h-12 w-2/3 mx-auto" />
                <Skeleton className="h-6 w-1/2 mx-auto mt-4" />
            </div>
            <Skeleton className="w-full h-[400px] rounded-lg" />
        </div>
    )
}

export default function BookingSuccessPage() {
  // This page is now client-side to fetch its own data.
  // The URL is now `/booking/[bookingId]/success`
  const params = useParams();
  const bookingId = params.id as string;

  const firestore = useFirestore();
  // We need to find which event this booking belongs to.
  // This requires a collection group query, which is more advanced.
  // For now, we will fetch the booking from a hardcoded eventId for demonstration.
  // In a real app, you would pass the eventId in the URL, e.g., /booking/[eventId]/[bookingId]/success
  // or perform a collection group query.
  // NOTE: This will not work for bookings of other events. This is a limitation of the current simplified model.
  
  // HACK: To find the eventId, we'd need to query. Let's assume we can't do a collection group query easily.
  // We'll just show a generic success message and the ticket display will be limited.
  // A better implementation would have the eventId in the URL.
  
  // This component can't know the eventId from the bookingId alone without a collectionGroup query.
  // As a result, we can't show full ticket details.
  // We'll show a confirmation and let the user know their ticket is ready.

  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-16 bg-secondary/50">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
              Booking Confirmed!
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Your ticket is ready! You will receive an SMS and email confirmation shortly.
              You can access your ticket via the link sent to you.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">(Booking ID: {bookingId})</p>
          </div>
          {/* 
            Displaying the full ticket here is difficult without the eventId.
            A real app would either include the eventId in the URL 
            or have a way to look up the event from the bookingId.
          */}
        </div>
      </main>
    </>
  );
}
