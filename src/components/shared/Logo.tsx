import { Ticket } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="p-2 bg-primary group-hover:bg-accent rounded-lg transition-colors">
        <Ticket className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="text-2xl font-bold font-headline text-foreground">
        TicketVerse
      </span>
    </Link>
  );
}
