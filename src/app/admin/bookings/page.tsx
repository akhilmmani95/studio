import { BookingsClient } from '@/components/admin/BookingsClient';
import { getAllBookings } from '@/lib/actions';

export default async function BookingsPage() {
  const bookings = await getAllBookings();

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold font-headline mb-6">All Bookings</h1>
      <BookingsClient bookings={bookings} />
    </div>
  );
}
