import { getAdminDashboardStats } from "@/lib/actions";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { BookCopy, Landmark, Wallet } from "lucide-react";

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats();
    
    const statsData = [
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
    ];

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold font-headline mb-6">Admin Dashboard</h1>
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
            
            <div className="mt-12">
                <h2 className="text-2xl font-bold font-headline mb-4">Quick Actions</h2>
                <p className="text-muted-foreground">
                    Navigate to other sections using the sidebar to manage your events, bookings, and more.
                </p>
            </div>
        </div>
    );
}
