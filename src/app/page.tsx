'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { EventCard } from '@/components/events/EventCard';
import { Header } from '@/components/shared/Header';
import { Skeleton } from '@/components/ui/skeleton';

function EventGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                    <Skeleton className="aspect-[3/2] w-full" />
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                     <div className="p-4 pt-0">
                         <Skeleton className="h-12 w-full" />
                     </div>
                </div>
            ))}
        </div>
    )
}

export default function Home() {
  const firestore = useFirestore();
  const eventsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'events') : null, [firestore]);
  const { data: events, isLoading } = useCollection<Event>(eventsQuery);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingEvents = (events ?? [])
    .filter((event) => new Date(event.date) >= todayStart)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="container py-8 md:py-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
              Your Universe of Events
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Discover and book tickets for the most exciting events in town. From music festivals to comedy shows, your next great experience starts here.
            </p>
          </div>
          
          {isLoading || !events ? (
              <EventGridSkeleton/>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                ))}
            </div>
          )}

        </section>
      </main>
    </>
  );
}
