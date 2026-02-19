'use client';

import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { TicketDisplay } from '@/components/booking/TicketDisplay';
import { Header } from '@/components/shared/Header';
import { PhonePePaymentCallback } from '@/components/phonepe/PaymentCallback';
import { Download } from 'lucide-react';
import type { Booking, Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { generateTicketJwt } from '@/lib/actions';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const router = useRouter();
  
  const eventId = params.eventId as string;
  const bookingId = params.bookingId as string;
  const firestore = useFirestore();
  const ticketRef = useRef<HTMLDivElement>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"COMPLETED" | "FAILED" | "PENDING" | null>(null);

  const eventRef = useMemoFirebase(() => (firestore && eventId) ? doc(firestore, 'events', eventId) : null, [firestore, eventId]);
  const { data: event, isLoading: isLoadingEvent } = useDoc<Event>(eventRef);

  const bookingRef = useMemoFirebase(() => (firestore && eventId && bookingId) ? doc(firestore, `events/${eventId}/bookings`, bookingId) : null, [firestore, eventId, bookingId]);
  const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);

  const [jwt, setJwt] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if(bookingId && eventId && !jwt) {
      generateTicketJwt({ bookingId: bookingId as string, eventId: eventId as string }).then(setJwt);
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
    if (!ticketRef.current || !booking) return;

    html2canvas(ticketRef.current, {
      useCORS: true,
      backgroundColor: null // Use a transparent background
    }).then((canvas) => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `TicketVerse-Ticket-${booking.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
  };
  
  if (!eventId || !bookingId) {
      return (
          <>
              <Header />
              <main className="flex-1 py-12 md:py-16 bg-secondary/50">
                  <SuccessPageSkeleton />
              </main>
          </>
      )
  }

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
  const effectivePaymentStatus = paymentStatus || booking.paymentStatus || null;

  // If we have an order id, show payment verification first.
  const merchantTransactionId =
    searchParams.get('order_id') || searchParams.get('merchantTransactionId');
  if (merchantTransactionId && !paymentVerified) {
    return (
      <>
        <Header />
        <main className="flex-1 py-12 md:py-16 bg-secondary/50">
          <div className="container max-w-2xl mx-auto">
            <PhonePePaymentCallback
              onPaymentVerified={(status) => {
                setPaymentStatus(status);
                if (bookingRef) {
                  updateDoc(bookingRef, { paymentStatus: status }).catch((error) =>
                    console.error("Failed to update booking payment status:", error)
                  );
                }
                // Only mark verification complete for terminal states.
                if (status === "COMPLETED" || status === "FAILED") {
                  setPaymentVerified(true);
                } else {
                  setPaymentVerified(false);
                }
              }}
              onClose={() => {
                if (paymentStatus === "COMPLETED") {
                  // Payment successful, stay on page
                  setPaymentVerified(true);
                } else {
                  // Payment not completed (failed/pending/unknown), redirect back to event
                  router.push(`/events/${eventId}`);
                }
              }}
            />
          </div>
        </main>
      </>
    );
  }

  // If payment failed, show error message
  if (effectivePaymentStatus === "FAILED") {
    return (
      <>
        <Header />
        <main className="flex-1 py-12 md:py-16 bg-secondary/50">
          <div className="container max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertDescription className="mb-4">
                Payment failed. Please try again or contact support.
              </AlertDescription>
              <Button onClick={() => router.push(`/events/${eventId}`)}>
                Back to Event
              </Button>
            </Alert>
          </div>
        </main>
      </>
    );
  }

  if (booking.paymentStatus && booking.paymentStatus !== "COMPLETED") {
    return (
      <>
        <Header />
        <main className="flex-1 py-12 md:py-16 bg-secondary/50">
          <div className="container max-w-2xl mx-auto">
            <Alert variant="destructive">
              <AlertDescription className="mb-4">
                This booking is not confirmed because payment was not completed.
              </AlertDescription>
              <Button onClick={() => router.push(`/events/${eventId}`)}>
                Back to Event
              </Button>
            </Alert>
          </div>
        </main>
      </>
    );
  }

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
          
          <div ref={ticketRef}>
            <TicketDisplay 
                booking={booking}
                event={event}
                ticketTier={ticketTier}
                qrCodeUrl={qrCodeUrl}
            />
          </div>
          
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
