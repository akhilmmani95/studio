'use client';

import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { CreateEventForm } from '@/components/admin/CreateEventForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventCard } from '@/components/events/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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
  const { toast } = useToast();
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Only fetch events created by the current admin
  const eventsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'events'), where('adminId', '==', user.uid));
  }, [firestore, user]);
  
  const { data: events, isLoading } = useCollection<Event>(eventsQuery);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingEvents = (events ?? [])
    .filter((event) => new Date(event.date) >= todayStart)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleDeleteEvent = async () => {
    if (!eventToDelete || !firestore) return;

    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'events', eventToDelete.id));

       toast({
           title: 'Event Deleted',
           description: `"${eventToDelete.name}" has been successfully removed.`,
       });

    } catch (error) {
        console.error('Error deleting event:', error);
        toast({
            title: 'Deletion Failed',
            description: 'Could not delete the event. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsDeleting(false);
        setEventToDelete(null);
    }
  };

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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="relative group/event">
                    <EventCard event={event} />
                    <div className="absolute top-4 right-4 z-10 flex gap-2 opacity-0 group-hover/event:opacity-100 transition-opacity">
                        <Button
                            variant="secondary"
                            size="icon"
                            asChild
                            aria-label="Edit event"
                        >
                            <Link href={`/admin/events/edit/${event.id}`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => setEventToDelete(event)}
                            aria-label="Delete event"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                ))}
                {upcomingEvents.length === 0 && (
                    <p className="text-muted-foreground col-span-2">No upcoming events found.</p>
                )}
              </div>
            </>
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
      <AlertDialog open={!!eventToDelete} onOpenChange={(open) => !open && setEventToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the event
                    <span className="font-bold"> {eventToDelete?.name}</span>. Associated bookings will not be deleted but will become inaccessible.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteEvent}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Event
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
