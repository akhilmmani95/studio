'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { mockEvents, mockBookings } from '@/lib/mock-data';
import type { Event, Booking } from '@/lib/types';
import { signPayload } from '@/lib/jwt';
import { PlaceHolderImages } from './placeholder-images';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { EventSchema } from './schemas';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// A mock database
let events: Event[] = [...mockEvents];
let bookings: Booking[] = [...mockBookings];

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function getEvents(): Promise<Event[]> {
  // In a real app, you would fetch this from a database
  return Promise.resolve(events);
}

export async function getEventById(id: string): Promise<Event | undefined> {
  return Promise.resolve(events.find((event) => event.id === id));
}

export async function createRazorpayOrder(amount: number) {
    const options = {
        amount: amount * 100, // amount in the smallest currency unit
        currency: "INR",
        receipt: `receipt_order_${Date.now()}`
    };

    try {
        const order = await razorpay.orders.create(options);
        return { ...order, key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID! };
    } catch (error) {
        console.error("Error creating razorpay order", error);
        throw new Error("Could not create Razorpay order.");
    }
}

export async function createBooking(formData: {
  name: string;
  phone: string;
  eventId: string;
  ticketTierId: string;
  quantity: number;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}) {

  const body = formData.razorpay_order_id + "|" + formData.razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== formData.razorpay_signature) {
    throw new Error('Payment verification failed');
  }

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
    paymentId: formData.razorpay_payment_id,
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
    const headers = ['Booking ID', 'Event', 'User Name', 'Phone', 'Ticket Tier', 'Quantity', 'Amount', 'Date', 'Redeemed', 'Payment ID'];
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
            b.paymentId,
        ].join(','))
    ];
    return csvRows.join('\n');
}

export async function getAllValidTicketJWTs() {
    const validBookings = bookings.filter(b => !b.redeemed);
    return validBookings.map(b => signPayload({ bookingId: b.id, eventId: b.eventId }));
}

export async function createEvent(data: z.infer<typeof EventSchema>) {
    const newEvent: Event = {
        ...data,
        date: data.date.toISOString(),
        id: `event-${Date.now()}`,
        image: `event-${(events.length % 6) + 1}`, // Cycle through placeholder images
        ticketTiers: data.ticketTiers.map((tier, i) => ({
            ...tier,
            id: `tier-${i + 1}-${Date.now()}`,
        })),
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
