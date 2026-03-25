'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Check, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateTicketJwt } from '@/lib/actions';
import QRCode from 'qrcode';
import type { Booking } from '@/lib/types';

type BookingWithEvent = Booking & {
    eventName: string;
    ticketTierName: string;
};

type BookingsClientProps = {
  bookings: BookingWithEvent[];
};

function generateBookingsCsv(bookings: BookingWithEvent[]) {
    const headers = ['Booking ID', 'Event', 'User Name', 'Phone', 'Ticket Tier', 'Quantity', 'Amount', 'Date', 'Redeemed', 'Payment ID'];
    const csvRows = [
        headers.join(','),
        ...bookings.map(b => [
            b.id,
            `"${b.eventName}"`,
            `"${b.userName}"`,
            b.phone,
            `"${b.ticketTierName}"`,
            b.quantity,
            b.totalAmount,
            new Date(b.bookingDate).toLocaleString(),
            b.redeemed,
            b.paymentId,
        ].join(','))
    ];
    return csvRows.join('\n');
}

export function BookingsClient({ bookings }: BookingsClientProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const csvData = generateBookingsCsv(bookings);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `bookings-${new Date().toISOString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download CSV', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadQr = async (booking: BookingWithEvent) => {
    setIsDownloadingQr(booking.id);
    try {
      const jwt = await generateTicketJwt({ bookingId: booking.id, eventId: booking.eventId });
      const qrDataUrl = await QRCode.toDataURL(jwt, { width: 400, margin: 2 });
      const link = document.createElement('a');
      link.setAttribute('href', qrDataUrl);
      link.setAttribute('download', `ticket-${booking.id}.png`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download QR', error);
    } finally {
      setIsDownloadingQr(null);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Generating...' : 'Export CSV'}
        </Button>
      </div>
      <ScrollArea className="h-[60vh] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead>Booking ID</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Redeemed</TableHead>
              <TableHead className="text-center">QR</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                <TableCell className="font-medium">{booking.eventName}</TableCell>
                <TableCell>{booking.userName}</TableCell>
                <TableCell>{booking.ticketTierName}</TableCell>
                <TableCell className="text-right">₹{booking.totalAmount.toLocaleString()}</TableCell>
                <TableCell>{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-center">
                  {booking.redeemed ? (
                     <Badge variant="secondary" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        <Check className="mr-1 h-3 w-3" /> Yes
                     </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                        <X className="mr-1 h-3 w-3" /> No
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadQr(booking)}
                    disabled={isDownloadingQr !== null}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    {isDownloadingQr === booking.id ? 'Downloading…' : 'Download QR'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
             {bookings.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No bookings yet.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
