'use client';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { TicketDisplay } from '@/components/booking/TicketDisplay';
import { Header } from '@/components/shared/Header';
import { Download } from 'lucide-react';
import type { Booking, Event } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { generateTicketJwt } from '@/lib/actions';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';

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

function BookingSuccessPageContents() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;
  const bookingId = searchParams.get('bookingId');
  const firestore = useFirestore();
  
  if (!eventId || !bookingId) {
    return (
        <>
            <Header />
            <main className="flex-1 py-12 md:py-16 bg-secondary/50">
                <SuccessPageSkeleton />
            </main>
        </>
    );
  }

  const eventRef = useMemoFirebase(() => (firestore && eventId) ? doc(firestore, 'events', eventId) : null, [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  const bookingRef = useMemoFirebase(() => (firestore && eventId && bookingId) ? doc(firestore, `events/${eventId}/bookings`, bookingId) : null, [firestore, eventId, bookingId]);
  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

  const [jwt, setJwt] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if(bookingId && eventId && !jwt) {
      generateTicketJwt({ bookingId, eventId }).then(setJwt);
    }
  }, [bookingId, eventId, jwt]);

  useEffect(() => {
    if (jwt) {
      QRCode.toDataURL(jwt, { width: 400, margin: 2 })
        .then(setQrCodeUrl)
        .catch(console.error);
    }
  }, [jwt]);

  const handleDownload = () => {
    if (!qrCodeUrl || !booking) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `TicketVerse-Ticket-${booking.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = isLoadingEvent || isLoadingBooking || !qrCodeUrl;
  
  if (isLoading) {
    return (
        <>
            <Header />
            <main className="flex-1 py-12 md:py-16 bg-secondary/50">
                <SuccessPageSkeleton />
            </main>
        </>
    );
  }

  if (!event || !booking) {
    notFound();
  }

  const ticketTier = event.ticketTiers.find(t => t.id === booking.ticketTierId);
  const eventImage = PlaceHolderImages.find(img => img.id === event.image);
  
  const eventWithImage = {
      ...event,
      imageUrl: eventImage?.imageUrl || '', // Provide a fallback
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-16 bg-secondary/50">
        <div className="container max-w-3xl mx-auto">
          <div className="text-center mb-10">
             <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
              Booking Confirmed!
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Your ticket is ready! You will receive an SMS confirmation shortly.
            </p>
          </div>
          
          <TicketDisplay 
            booking={booking}
            event={eventWithImage}
            ticketTier={ticketTier}
            qrCodeUrl={qrCodeUrl}
          />
          
          <div className="mt-8 flex justify-center">
            <Button onClick={handleDownload} size="lg" disabled={!qrCodeUrl}>
              <Download className="mr-2 h-5 w-5" />
              Download Ticket
            </Button>
          </div>

        </div>
      </main>
    </>
  );
}

export default function BookingSuccessPage() {
    return (
        <Suspense fallback={
            <>
                <Header />
                <main className="flex-1 py-12 md:py-16 bg-secondary/50">
                    <SuccessPageSkeleton />
                </main>
            </>
        }>
            <BookingSuccessPageContents />
        </Suspense>
    )
}
