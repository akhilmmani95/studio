'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { mockEvents, mockBookings } from '@/lib/mock-data';
import type { Event, Booking } from '@/lib/types';
import { signPayload } from '@/lib/jwt';
import { PlaceHolderImages } from './placeholder-images';
import { notFound } from 'next/navigation';

// A mock database
let events: Event[] = [...mockEvents];
let bookings: Booking[] = [...mockBookings];

export async function getEvents(): Promise<Event[]> {
  // In a real app, you would fetch this from a database
  return Promise.resolve(events);
}

export async function getEventById(id: string): Promise<Event | undefined> {
  return Promise.resolve(events.find((event) => event.id === id));
}

export async function createBooking(formData: {
  name: string;
  phone: string;
  eventId: string;
  ticketTierId: string;
  quantity: number;
}): Promise<string> {
  const event = await getEventById(formData.eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  const ticketTier = event.ticketTiers.find((t) => t.id === formData.ticketTierId);
  if (!ticketTier) {
    throw new Error('Ticket tier not found');
  }

  const newBooking: Booking = {
    id: `booking-${Date.now()}`,
    eventId: formData.eventId,
    userName: formData.name,
    phone: formData.phone,
    ticketTierId: formData.ticketTierId,
    quantity: formData.quantity,
    totalAmount: ticketTier.price * formData.quantity,
    bookingDate: new Date().toISOString(),
    redeemed: false,
    redeemedAt: null,
  };

  bookings.push(newBooking);
  revalidatePath('/admin/bookings');
  revalidatePath('/admin');
  
  redirect(`/booking/${newBooking.id}/success`);
}

export async function getBookingDetails(bookingId: string) {
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) {
    notFound();
  }
  const event = await getEventById(booking.eventId);
  if (!event) {
    notFound();
  }
  const ticketTier = event.ticketTiers.find((t) => t.id === booking.ticketTierId);
  const eventImage = PlaceHolderImages.find(img => img.id === event.image);

  const jwt = signPayload({ bookingId: booking.id, eventId: event.id });

  return {
    booking,
    event: { ...event, imageUrl: eventImage?.imageUrl || '' },
    ticketTier,
    jwt,
  };
}

export async function getAdminDashboardStats() {
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalBookings = bookings.length;
    const upcomingEvents = events.filter(e => new Date(e.date) > new Date()).length;

    return { totalRevenue, totalBookings, upcomingEvents };
}

export async function getAllBookings() {
    const sortedBookings = bookings.map(b => {
        const event = events.find(e => e.id === b.eventId);
        const ticketTier = event?.ticketTiers.find(t => t.id === b.ticketTierId);
        return {
            ...b,
            eventName: event?.name || 'N/A',
            ticketTierName: ticketTier?.name || 'N/A',
        }
    }).sort((a, b) => new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime());
    return Promise.resolve(sortedBookings);
}

export async function generateBookingsCsv() {
    const allBookings = await getAllBookings();
    const headers = ['Booking ID', 'Event', 'User Name', 'Phone', 'Ticket Tier', 'Quantity', 'Amount', 'Date', 'Redeemed'];
    const csvRows = [
        headers.join(','),
        ...allBookings.map(b => [
            b.id,
            `"${b.eventName}"`,
            `"${b.userName}"`,
            b.phone,
            `"${b.ticketTierName}"`,
            b.quantity,
            b.totalAmount,
            new Date(b.bookingDate).toLocaleString(),
            b.redeemed,
        ].join(','))
    ];
    return csvRows.join('\n');
}

export async function getAllValidTicketJWTs() {
    const validBookings = bookings.filter(b => !b.redeemed);
    return validBookings.map(b => signPayload({ bookingId: b.id, eventId: b.eventId }));
}

export async function createEvent(data: { name: string; venue: string; date: Date; description: string; }) {
    const newEvent: Event = {
        ...data,
        date: data.date.toISOString(),
        id: `event-${Date.now()}`,
        image: `event-${(events.length % 6) + 1}`, // Cycle through placeholder images
        ticketTiers: [
            { id: 'tier-1', name: 'General', price: 500 },
            { id: 'tier-2', name: 'VIP', price: 1000 },
            { id: 'tier-3', name: 'VVIP', price: 1500 },
        ],
    };
    events.unshift(newEvent); // Add to the beginning of the array
    revalidatePath('/admin/events');
    revalidatePath('/');
}

export async function getPlaceholderImageById(id: string) {
    return PlaceHolderImages.find(img => img.id === id);
}

export async function markAsRedeemed(bookingId: string) {
    const booking = bookings.find(b => b.id === bookingId);
    if(booking) {
        booking.redeemed = true;
        booking.redeemedAt = new Date().toISOString();
        console.log(`Booking ${bookingId} marked as redeemed.`);
        revalidatePath('/admin/bookings');
    }
}
