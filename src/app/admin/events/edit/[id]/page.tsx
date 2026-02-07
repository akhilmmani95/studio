'use client';

import { useParams, notFound } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Event } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { EditEventForm } from '@/components/admin/EditEventForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Pencil } from 'lucide-react';

function EditEventPageSkeleton() {
    return (
        <div className="p-4 md:p-8">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <Skeleton className="h-4 w-2/3 mb-8" />
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function EditEventPage() {
    const params = useParams();
    const eventId = params.id as string;
    const firestore = useFirestore();

    const eventRef = useMemoFirebase(() => (firestore && eventId) ? doc(firestore, 'events', eventId) : null, [firestore, eventId]);
    const { data: event, isLoading } = useDoc<Event>(eventRef);

    if (isLoading) {
        return <EditEventPageSkeleton />;
    }

    if (!event) {
        notFound();
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <Pencil className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold font-headline">Edit Event</h1>
            </div>
            <p className="text-muted-foreground mb-8 max-w-3xl">
                Modify the details of your event below. Changes will be reflected across the site.
            </p>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Editing: {event.name}</CardTitle>
                    <CardDescription>Make your changes and click save.</CardDescription>
                </CardHeader>
                <CardContent>
                    <EditEventForm event={event} />
                </CardContent>
            </Card>
        </div>
    );
}
