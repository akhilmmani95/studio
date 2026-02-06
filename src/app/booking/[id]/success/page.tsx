import { getBookingDetails } from '@/lib/actions';
import { TicketDisplay } from '@/components/booking/TicketDisplay';
import { Header } from '@/components/shared/Header';
import { CheckCircle } from 'lucide-react';

type BookingSuccessPageProps = {
  params: { id: string };
};

export default async function BookingSuccessPage({ params }: BookingSuccessPageProps) {
  const details = await getBookingDetails(params.id);

  if (!details) {
    // getBookingDetails will call notFound(), but for type safety:
    return null;
  }

  const { booking, event, ticketTier, jwt } = details;

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
              Your ticket is ready. Present the QR code at the event entrance.
            </p>
          </div>
          <TicketDisplay
            booking={booking}
            event={event}
            ticketTier={ticketTier}
            jwt={jwt}
          />
        </div>
      </main>
    </>
  );
}
