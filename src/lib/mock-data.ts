import type { Event, Booking } from '@/lib/types';

const ticketTiers = [
    { id: 'tier-1', name: 'General', price: 500, totalSeats: 200 },
    { id: 'tier-2', name: 'VIP', price: 1000, totalSeats: 100 },
    { id: 'tier-3', name: 'VVIP', price: 1500, totalSeats: 50 },
];

export const mockEvents: Event[] = [
    {
        id: 'event-1',
        name: 'Starlight Music Festival',
        date: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(),
        venue: 'City Arena',
        description: 'An unforgettable night under the stars with the world\'s top DJs. Expect a spectacular light show and immersive soundscapes.',
        image: 'event-1',
        ticketTiers: ticketTiers,
    },
    {
        id: 'event-2',
        name: 'Comedy Extravaganza',
        date: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
        venue: 'The Grand Theater',
        description: 'A lineup of the funniest comedians in the business. Get ready to laugh your heart out in an evening of pure entertainment.',
        image: 'event-2',
        ticketTiers: [
            { id: 'tier-1', name: 'General', price: 600, totalSeats: 300 },
            { id: 'tier-2', name: 'Premium', price: 1200, totalSeats: 150 },
        ],
    },
    {
        id: 'event-3',
        name: 'The Phantom of the Opera',
        date: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(),
        venue: 'Royal Opera House',
        description: 'Experience the classic, mesmerizing tale of love and obsession. A timeless production with a breathtaking score.',
        image: 'event-3',
        ticketTiers: ticketTiers,
    },
    {
        id: 'event-4',
        name: 'Gourmet Food Fair',
        date: new Date(new Date().setDate(new Date().getDate() + 25)).toISOString(),
        venue: 'Downtown Park',
        description: 'A culinary journey featuring international cuisines, celebrity chefs, and live cooking demonstrations. A feast for the senses.',
        image: 'event-4',
        ticketTiers: [{ id: 'tier-1', name: 'Entry', price: 250, totalSeats: 1000 }],
    },
    {
        id: 'event-5',
        name: 'Future Wave EDM Night',
        date: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
        venue: 'Warehouse District',
        description: 'Dive into the future of electronic dance music. Featuring rising stars and underground legends.',
        image: 'event-5',
        ticketTiers: [
            { id: 'tier-1', name: 'Early Bird', price: 700, totalSeats: 150 },
            { id: 'tier-2', name: 'Regular', price: 900, totalSeats: 250 },
        ],
    },
    {
        id: 'event-6',
        name: 'Champions League Final Screening',
        date: new Date(new Date().setDate(new Date().getDate() + 35)).toISOString(),
        venue: 'Stadium Sports Bar',
        description: 'Watch the biggest game of the year on a giant screen with fellow fans. The next best thing to being there!',
        image: 'event-6',
        ticketTiers: [{ id: 'tier-1', name: 'Standard', price: 300, totalSeats: 120 }],
    },
];

export const mockBookings: Booking[] = [
    {
        id: 'booking-1',
        eventId: 'event-1',
        userName: 'John Doe',
        phone: '1234567890',
        ticketTierId: 'tier-2',
        quantity: 2,
        totalAmount: 2000,
        bookingDate: new Date().toISOString(),
        redeemed: false,
        redeemedAt: null,
    },
    {
        id: 'booking-2',
        eventId: 'event-2',
        userName: 'Jane Smith',
        phone: '0987654321',
        ticketTierId: 'tier-1',
        quantity: 4,
        totalAmount: 2400,
        bookingDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        redeemed: true,
        redeemedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
    },
];
