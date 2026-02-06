import { getEvents } from '@/lib/actions';
import { EventCard } from '@/components/events/EventCard';
import { Header } from '@/components/shared/Header';

export default async function Home() {
  const events = await getEvents();

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="container py-8 md:py-12">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
              Your Universe of Events
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
              Discover and book tickets for the most exciting events in town. From music festivals to comedy shows, your next great experience starts here.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
