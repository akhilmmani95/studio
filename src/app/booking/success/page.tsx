'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/shared/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

function BookingSuccessBridgeContents() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get('order_id') || searchParams.get('merchantTransactionId') || '';
    const bookingId =
      typeof window !== 'undefined' ? sessionStorage.getItem('phonepeBookingId') : null;
    const eventId = typeof window !== 'undefined' ? sessionStorage.getItem('phonepeEventId') : null;

    if (eventId && bookingId) {
      const query = orderId
        ? `?order_id=${encodeURIComponent(orderId)}`
        : '';
      router.replace(`/booking/${eventId}/${bookingId}/success${query}`);
      return;
    }

    // Fallback when session data is unavailable (e.g. opened in a new browser session).
    router.replace(`/`);
  }, [router, searchParams]);

  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-16 bg-secondary/50">
        <div className="container max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Finalizing Payment</CardTitle>
              <CardDescription>Redirecting to your booking confirmation page.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Please wait...
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

export default function BookingSuccessBridgePage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className="flex-1 py-12 md:py-16 bg-secondary/50">
            <div className="container max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Finalizing Payment</CardTitle>
                  <CardDescription>Preparing your confirmation page.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait...
                </CardContent>
              </Card>
            </div>
          </main>
        </>
      }
    >
      <BookingSuccessBridgeContents />
    </Suspense>
  );
}
