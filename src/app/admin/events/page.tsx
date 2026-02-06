import { getEvents } from '@/lib/actions';
import { CreateEventForm } from '@/components/admin/CreateEventForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EventCard } from '@/components/events/EventCard';

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="p-4 md:p-8">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h1 className="text-3xl font-bold font-headline mb-6">Manage Events</h1>
          <p className="text-muted-foreground mb-6">
            View, edit, and manage all your events. New events will appear here and on the main page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
            <div className="sticky top-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Event</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CreateEventForm />
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
