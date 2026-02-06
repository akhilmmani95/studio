'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { CreateEventForm } from '@/components/admin/CreateEventForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventCard } from '@/components/events/EventCard';
import { Skeleton } from '@/components/ui/skeleton';

function AdminEventGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
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

export default function EventsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // Only fetch events created by the current admin
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'events'), where('adminId', '==', user.uid));
  }, [firestore, user]);
  
  const { data: events, isLoading } = useCollection<Event>(eventsQuery);

  return (
    <div className="p-4 md:p-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h1 className="text-3xl font-bold font-headline mb-6">Manage Events</h1>
          <p className="text-muted-foreground mb-6">
            View, edit, and manage all your events. New events will appear here and on the main page.
          </p>
          {isLoading || !events ? (
            <AdminEventGridSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
              {events.length === 0 && (
                  <p className="text-muted-foreground col-span-2">You haven't created any events yet.</p>
              )}
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
            <div className="sticky top-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CreateEventForm />
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
