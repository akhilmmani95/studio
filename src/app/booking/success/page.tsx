'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/shared/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function BookingSuccessBridgePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const merchantTransactionId = searchParams.get('merchantTransactionId') || '';
    const bookingId =
      typeof window !== 'undefined' ? sessionStorage.getItem('phonepeBookingId') : null;
    const eventId = typeof window !== 'undefined' ? sessionStorage.getItem('phonepeEventId') : null;

    if (eventId && bookingId) {
      const query = merchantTransactionId
        ? `?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`
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
