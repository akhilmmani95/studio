'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from "@/components/admin/DashboardStats";
import { BookCopy, Landmark, Wallet } from "lucide-react";
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Event, Booking } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';


type Stats = {
    totalRevenue: number;
    totalBookings: number;
    upcomingEvents: number;
}

type EventWithSeatStatus = Event & {
    id: string;
    seatStatus: {
        tierId: string;
        tierName: string;
        sold: number;
        total: number;
        remaining: number;
    }[];
};

function DashboardSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
            ))}
        </div>
    )
}

function CardSkeleton() {
    return (
        <div className="p-6 border rounded-lg space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
        </div>
    )
}

function EventStatusSkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-md border p-4">
                    <Skeleton className="h-6 w-1/2 mb-4" />
                    <div className="space-y-3">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                </div>
            ))}
        </div>
    )
}


export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [eventsWithStatus, setEventsWithStatus] = useState<EventWithSeatStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const firestore = useFirestore();
    const { user } = useUser();

    useEffect(() => {
        async function fetchStats() {
            if (!firestore || !user) return;
            setIsLoading(true);

            let totalRevenue = 0;
            let totalTicketsSold = 0;
            let upcomingEvents = 0;
            const allEventsWithStatus: EventWithSeatStatus[] = [];

            const eventsQuery = query(collection(firestore, 'events'), where('adminId', '==', user.uid));
            const eventsSnapshot = await getDocs(eventsQuery);

            const eventPromises = eventsSnapshot.docs.map(async (eventDoc) => {
                const event = { ...eventDoc.data(), id: eventDoc.id } as Event & { id: string };
                if (new Date(event.date) > new Date()) {
                    upcomingEvents++;
                }

                const bookingsQuery = collection(firestore, `events/${eventDoc.id}/bookings`);
                const bookingsSnapshot = await getDocs(bookingsQuery);
                const bookings = bookingsSnapshot.docs
                    .map(doc => doc.data() as Booking)
                    .filter(
                        booking => booking.paymentStatus !== "FAILED" && booking.paymentStatus !== "PENDING"
                    );

                bookings.forEach(booking => {
                    totalRevenue += booking.totalAmount;
                    totalTicketsSold += booking.quantity;
                });

                const seatStatus = event.ticketTiers.map(tier => {
                    const sold = bookings
                        .filter(b => b.ticketTierId === tier.id)
                        .reduce((sum, b) => sum + b.quantity, 0);
                    return {
                        tierId: tier.id,
                        tierName: tier.name,
                        sold: sold,
                        total: tier.totalSeats,
                        remaining: tier.totalSeats - sold
                    };
                });
                
                allEventsWithStatus.push({ ...event, seatStatus });
            });

            await Promise.all(eventPromises);

            setStats({ totalRevenue, totalBookings: totalTicketsSold, upcomingEvents });
            allEventsWithStatus.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setEventsWithStatus(allEventsWithStatus);
            setIsLoading(false);
        }

        fetchStats();
    }, [firestore, user]);
    
    const statsData = stats ? [
        {
            title: "Total Revenue",
            value: `₹${stats.totalRevenue.toLocaleString()}`,
            icon: Wallet,
            description: "Total revenue from all bookings"
        },
        {
            title: "Total Tickets Sold",
            value: stats.totalBookings.toLocaleString(),
            icon: BookCopy,
            description: "Total number of tickets sold"
        },
        {
            title: "Upcoming Events",
            value: stats.upcomingEvents.toLocaleString(),
            icon: Landmark,
            description: "Number of events yet to happen"
        }
    ] : [];

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold font-headline mb-6">Admin Dashboard</h1>
            {isLoading || !stats ? (
                <DashboardSkeleton />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {statsData.map(stat => (
                    <DashboardStats
                        key={stat.title}
                        title={stat.title}
                        value={stat.value}
                        icon={stat.icon}
                        description={stat.description}
                    />
                ))}
                </div>
            )}
            
            <div className="mt-12">
                <h2 className="text-2xl font-bold font-headline mb-4">Event Seat Status</h2>
                {isLoading ? (
                    <EventStatusSkeleton />
                ) : eventsWithStatus.length === 0 ? (
                    <p className="text-muted-foreground">You haven't created any events yet.</p>
                ) : (
                    <Accordion type="single" collapsible className="w-full rounded-lg border">
                        {eventsWithStatus.map((event, index) => (
                            <AccordionItem value={event.id} key={event.id} className={cn(index === eventsWithStatus.length -1 && "border-b-0")}>
                                <AccordionTrigger className="p-4 hover:no-underline text-left">
                                    <div>
                                        <p className='font-bold text-lg'>{event.name}</p>
                                        <p className='text-sm text-muted-foreground'>{new Date(event.date).toLocaleDateString('en-US', { dateStyle: 'medium' })} - {event.venue}</p>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <ul className="px-4 pb-4 space-y-4">
                                        {event.seatStatus.map(tier => (
                                            <li key={tier.tierId}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-medium">{tier.tierName}</p>
                                                    <p className="text-sm font-semibold">{tier.sold} / {tier.total} <span className='font-normal text-muted-foreground'>sold</span></p>
                                                </div>
                                                <Progress value={tier.total > 0 ? (tier.sold / tier.total) * 100 : 0} />
                                                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                                                    <span>{tier.remaining} remaining</span>
                                                    <span>{tier.total > 0 ? ((tier.sold / tier.total) * 100).toFixed(0) : 0}% full</span>
                                                </div>
                                            </li>
                                        ))}
                                        {event.seatStatus.length === 0 && <p className='text-muted-foreground text-sm'>This event has no ticket tiers.</p>}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
