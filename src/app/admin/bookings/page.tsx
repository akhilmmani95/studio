'use client';

import { BookingsClient } from '@/components/admin/BookingsClient';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Event, Booking } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type BookingWithEvent = Booking & {
    eventName: string;
    ticketTierName: string;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    async function fetchAllBookings() {
      if (!firestore || !user) return;

      setIsLoading(true);
      const allBookings: BookingWithEvent[] = [];

      // 1. Get all events created by this admin
      const eventsQuery = query(collection(firestore, 'events'), where('adminId', '==', user.uid));
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

      // 2. For each event, get all its bookings
      for (const event of events) {
        const bookingsQuery = collection(firestore, `events/${event.id}/bookings`);
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const eventBookings = bookingsSnapshot.docs.map(doc => {
          const bookingData = doc.data() as Booking;
          const ticketTier = event.ticketTiers.find(t => t.id === bookingData.ticketTierId);
          return {
            ...bookingData,
            id: doc.id,
            eventName: event.name,
            ticketTierName: ticketTier?.name || 'N/A',
          }
        }).filter(
          (booking) => booking.paymentStatus !== "FAILED" && booking.paymentStatus !== "PENDING"
        );
        allBookings.push(...eventBookings);
      }

      // Sort by most recent
      allBookings.sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
      
      setBookings(allBookings);
      setIsLoading(false);
    }

    fetchAllBookings();

  }, [firestore, user]);


  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold font-headline mb-6">All Bookings</h1>
      {isLoading ? (
          <div className='space-y-4'>
              <Skeleton className="h-10 w-40 self-end" />
              <Skeleton className="h-[60vh] w-full" />
          </div>
      ) : (
        <BookingsClient bookings={bookings} />
      )}
    </div>
  );
}
