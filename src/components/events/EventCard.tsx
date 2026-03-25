'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Calendar, MapPin, Tag, QrCode } from 'lucide-react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QRCode from 'qrcode';
import type { Event } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

type EventCardProps = {
  event: Event;
};

export function EventCard({ event }: EventCardProps) {
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const minPrice = event.ticketTiers.length > 0
    ? Math.min(...event.ticketTiers.map((t) => t.price))
    : 0;

  const downloadEventQr = async () => {
    setIsDownloadingQR(true);
    try {
      const url = `${window.location.origin}/events/${event.id}`;
      const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `event-${event.id}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download event QR code:', error);
    } finally {
      setIsDownloadingQR(false);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden h-full transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader className="p-0">
        <Link href={`/events/${event.id}`} className="block">
          <div className="aspect-[3/2] relative bg-muted">
            {event.imageUrl && (
              <Image
                src={event.imageUrl}
                alt={event.name}
                fill
                className="object-contain"
              />
            )}
             <div className="absolute bottom-2 right-2">
                <Badge variant="secondary" className="text-lg">₹{minPrice}+</Badge>
            </div>
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <h3 className="font-headline text-xl font-bold mb-2">
          <Link href={`/events/${event.id}`}>{event.name}</Link>
        </h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span>{event.venue}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 space-y-2">
        <Button onClick={downloadEventQr} size="lg" variant="secondary" disabled={isDownloadingQR}>
          <QrCode className="mr-2 h-4 w-4" />
          {isDownloadingQR ? 'Downloading QR…' : 'Download Event QR'}
        </Button>
        <Button asChild className="w-full" size="lg">
          <Link href={`/events/${event.id}`}>
            <Tag className="mr-2 h-4 w-4" />
            Book Tickets
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
