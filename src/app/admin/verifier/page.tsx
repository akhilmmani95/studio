'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Booking } from '@/lib/types';
import { generateTicketJwt } from '@/lib/actions';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function VerifierDataPage() {
  const [jwts, setJwts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    async function fetchValidJwts() {
      if (!firestore || !user) {
        return;
      }

      setIsLoading(true);
      const unredeemedBookings: { id: string; eventId: string; }[] = [];

      // 1. Get all events created by this admin
      const eventsQuery = query(collection(firestore, 'events'), where('adminId', '==', user.uid));
      const eventsSnapshot = await getDocs(eventsQuery);

      // 2. For each event, get all its unredeemed bookings
      for (const eventDoc of eventsSnapshot.docs) {
        const bookingsQuery = query(collection(firestore, `events/${eventDoc.id}/bookings`), where('redeemed', '==', false));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const eventBookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          eventId: eventDoc.id,
        }));
        unredeemedBookings.push(...eventBookings);
      }

      // 3. Generate JWTs for each unredeemed booking
      if (unredeemedBookings.length > 0) {
        const jwtPromises = unredeemedBookings.map(booking => 
          generateTicketJwt({ bookingId: booking.id, eventId: booking.eventId })
        );
        const resolvedJwts = await Promise.all(jwtPromises);
        setJwts(resolvedJwts);
      } else {
        setJwts([]);
      }
      
      setIsLoading(false);
    }

    fetchValidJwts();
  }, [firestore, user]);

  const jwtsAsString = jwts.join('\n');

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-4 mb-6">
        <QrCode className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold font-headline">Verifier App Sync Data</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        This page provides all the necessary data for the offline ticket verifier app.
        Before an event, copy this data and paste it into the verifier app to sync all valid, unredeemed tickets.
        This enables offline verification at the gate.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Valid Ticket JWTs</CardTitle>
          <CardDescription>
            A list of all valid tickets that have not yet been redeemed.
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
                value={jwtsAsString}
                className="h-96 font-mono text-xs"
                placeholder="No valid tickets found."
              />
              <p className="text-sm text-muted-foreground mt-2">
                {jwts.length} valid ticket(s) found.
              </p>
            </>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
}
