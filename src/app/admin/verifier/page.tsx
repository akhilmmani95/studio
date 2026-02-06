'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function VerifierDataPage() {
  const [syncData, setSyncData] = useState<string>('');
  const [ticketCount, setTicketCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    async function fetchValidBookingIds() {
      if (!firestore || !user) {
        return;
      }

      setIsLoading(true);
      const unredeemedBookings: { bookingId: string; eventId: string; }[] = [];

      // 1. Get all events created by this admin
      const eventsQuery = query(collection(firestore, 'events'), where('adminId', '==', user.uid));
      const eventsSnapshot = await getDocs(eventsQuery);

      // 2. For each event, get all its unredeemed bookings
      for (const eventDoc of eventsSnapshot.docs) {
        const bookingsQuery = query(collection(firestore, `events/${eventDoc.id}/bookings`), where('redeemed', '==', false));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const eventBookings = bookingsSnapshot.docs.map(doc => ({
          bookingId: doc.id,
          eventId: eventDoc.id,
        }));
        unredeemedBookings.push(...eventBookings);
      }
      
      // 3. Create a JSON string of the booking identifiers
      setSyncData(JSON.stringify(unredeemedBookings, null, 2));
      setTicketCount(unredeemedBookings.length);
      setIsLoading(false);
    }

    fetchValidBookingIds();
  }, [firestore, user]);


  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <QrCode className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Verifier App Sync Data</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        This page provides all the necessary data for the offline ticket verifier app.
        Before an event, copy this JSON data and paste it into the verifier app to sync all valid, unredeemed tickets.
        This enables offline verification at the gate.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Valid Ticket Data (JSON)</CardTitle>
          <CardDescription>
            A JSON array of all valid tickets that have not yet been redeemed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-5 w-40" />
            </div>
          ) : (
            <>
              <Textarea
                readOnly
                value={syncData}
                className="h-96 font-mono text-xs"
                placeholder="No valid tickets found."
              />
              <p className="text-sm text-muted-foreground mt-2">
                {ticketCount} valid ticket(s) found.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
}
