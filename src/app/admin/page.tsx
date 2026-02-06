'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from "@/components/admin/DashboardStats";
import { BookCopy, Landmark, Wallet } from "lucide-react";
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Event, Booking } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

type Stats = {
    totalRevenue: number;
    totalBookings: number;
    upcomingEvents: number;
}

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


export default function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const firestore = useFirestore();
    const { user } = useUser();

    useEffect(() => {
        async function fetchStats() {
            if (!firestore || !user) return;
            setIsLoading(true);

            let totalRevenue = 0;
            let totalBookings = 0;
            let upcomingEvents = 0;

            const eventsQuery = query(collection(firestore, 'events'), where('adminId', '==', user.uid));
            const eventsSnapshot = await getDocs(eventsQuery);

            const eventPromises = eventsSnapshot.docs.map(async (eventDoc) => {
                const event = eventDoc.data() as Event;
                if (new Date(event.date) > new Date()) {
                    upcomingEvents++;
                }

                const bookingsQuery = collection(firestore, `events/${eventDoc.id}/bookings`);
                const bookingsSnapshot = await getDocs(bookingsQuery);
                
                totalBookings += bookingsSnapshot.size;
                bookingsSnapshot.forEach(bookingDoc => {
                    const booking = bookingDoc.data() as Booking;
                    totalRevenue += booking.totalAmount;
                });
            });

            await Promise.all(eventPromises);

            setStats({ totalRevenue, totalBookings, upcomingEvents });
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
            title: "Total Bookings",
            value: stats.totalBookings.toLocaleString(),
            icon: BookCopy,
            description: "Total number of tickets booked"
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
                <h2 className="text-2xl font-bold font-headline mb-4">Quick Actions</h2>
                <p className="text-muted-foreground">
                    Navigate to other sections using the sidebar to manage your events, bookings, and more.
                </p>
            </div>
        </div>
    );
}
