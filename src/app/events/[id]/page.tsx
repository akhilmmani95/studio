import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getEventById, getPlaceholderImageById } from '@/lib/actions';
import { Header } from '@/components/shared/Header';
import { BookingForm } from '@/components/booking/BookingForm';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type EventPageProps = {
  params: {
    id: string;
  };
};

export default async function EventPage({ params }: EventPageProps) {
  const event = await getEventById(params.id);

  if (!event) {
    notFound();
  }

  const eventImage = await getPlaceholderImageById(event.image);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container py-8 md:py-12">
          <div className="grid md:grid-cols-5 gap-8 lg:gap-12">
            <div className="md:col-span-3">
              <div className="aspect-[16/9] relative rounded-lg overflow-hidden mb-6 shadow-lg">
                {eventImage && (
                  <Image
                    src={eventImage.imageUrl}
                    alt={eventImage.description}
                    data-ai-hint={eventImage.imageHint}
                    fill
                    className="object-cover"
                    priority
                  />
                )}
              </div>
              <h1 className="text-4xl font-bold font-headline mb-4">{event.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mb-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">{new Date(event.date).toLocaleDateString('en-US', { dateStyle: 'full' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-medium">{event.venue}</span>
                </div>

              </div>
              <div className="prose dark:prose-invert max-w-none text-lg">
                <p>{event.description}</p>
              </div>

                <div className="mt-6">
                    <h2 className="text-2xl font-bold font-headline mb-3">Ticket Options</h2>
                    <div className="flex flex-wrap gap-3">
                        {event.ticketTiers.map(tier => (
                            <Badge key={tier.id} variant="secondary" className="px-4 py-2 text-base">
                                <Ticket className="w-4 h-4 mr-2"/>
                                {tier.name}: ₹{tier.price}
                            </Badge>
                        ))}
                    </div>
                </div>

            </div>
            <div className="md:col-span-2">
              <div className="sticky top-24">
                <BookingForm event={event} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
