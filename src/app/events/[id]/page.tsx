'use client';

import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from '@/components/shared/Header';
import { BookingForm } from '@/components/booking/BookingForm';
import { Calendar, MapPin, Ticket, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function EventPageSkeleton() {
    return (
        <div className="grid md:grid-cols-5 gap-8 lg:gap-12">
            <div className="md:col-span-3">
                <Skeleton className="aspect-[16/9] w-full rounded-lg mb-6" />
                <Skeleton className="h-10 w-3/4 mb-4" />
                <div className="flex gap-4 mb-6">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                </div>
                <div className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-4/5" />
                </div>
            </div>
            <div className="md:col-span-2">
                <Skeleton className="h-[500px] w-full rounded-lg" />
            </div>
        </div>
    )
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;
  const firestore = useFirestore();

  if (!eventId) {
    return (
        <>
            <Header />
            <main className="flex-1">
                <div className="container py-8 md:py-12">
                    <EventPageSkeleton />
                </div>
            </main>
        </>
    );
  }

  const eventRef = useMemoFirebase(() => (firestore && eventId) ? doc(firestore, 'events', eventId) : null, [firestore, eventId]);
  const { data: event, isLoading, error } = useDoc<Event>(eventRef);

  if (isLoading) {
    return (
        <>
            <Header />
            <main className="flex-1">
                <div className="container py-8 md:py-12">
                    <EventPageSkeleton />
                </div>
            </main>
        </>
    );
  }

  if (error || !event) {
    // This will be caught by the not-found mechanism in Next.js
    notFound();
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="container py-8 md:py-12">
          <div className="grid md:grid-cols-5 gap-8 lg:gap-12">
            <div className="md:col-span-3">
              <div className="aspect-[16/9] relative rounded-lg overflow-hidden mb-6 shadow-lg bg-muted">
                {event.imageUrl && (
                  <Image
                    src={event.imageUrl}
                    alt={event.name}
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
