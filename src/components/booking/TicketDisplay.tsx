'use client';

import Image from 'next/image';
import type { Booking, Event, TicketTier } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, User, Ticket as TicketIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type TicketDisplayProps = {
  booking: Booking;
  event: Event;
  ticketTier: TicketTier | undefined;
  qrCodeUrl: string;
};

export function TicketDisplay({
  booking,
  event,
  ticketTier,
  qrCodeUrl,
}: TicketDisplayProps) {

  return (
    <Card className="overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative h-48 md:h-64 bg-secondary">
        {event.imageUrl && (
            <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                className="object-cover"
            />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <CardHeader className="relative z-10 text-primary-foreground p-6">
            <p className='text-lg font-medium text-primary-foreground/80'>{new Date(event.date).toLocaleDateString('en-US', { dateStyle: 'full' })}</p>
            <CardTitle className="text-4xl font-headline">{event.name}</CardTitle>
        </CardHeader>
      </div>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="md:col-span-2 p-6 space-y-4 border-b md:border-b-0 md:border-r">
                <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-sm text-muted-foreground">Booked By</p>
                        <p className="font-semibold">{booking.userName}</p>
                    </div>
                </div>
                 <div className="flex items-center gap-3">
                    <TicketIcon className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-sm text-muted-foreground">Ticket Type</p>
                        <p className="font-semibold">{ticketTier?.name || 'N/A'} ({booking.quantity}x)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-sm text-muted-foreground">Venue</p>
                        <p className="font-semibold">{event.venue}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-sm text-muted-foreground">Booking ID</p>
                        <p className="font-semibold font-mono text-xs">{booking.id}</p>
                    </div>
                </div>
            </div>
            <div className="p-6 flex flex-col items-center justify-center">
                {qrCodeUrl ? (
                <Image
                    src={qrCodeUrl}
                    alt="Ticket QR Code"
                    width={200}
                    height={200}
                    className="rounded-lg shadow-md"
                />
                ) : (
                    <Skeleton className='w-[200px] h-[200px] rounded-lg'/>
                )}
                <p className="mt-4 text-sm text-muted-foreground text-center">Scan at entry</p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
