'use client';

import { useDeferredValue, useEffect, useState } from 'react';
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
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
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
    const headers = [
      'Booking ID',
      'Event',
      'User Name',
      'Phone',
      'Ticket Tier',
      'Quantity',
      'Amount',
      'Date',
      'Payment Status',
      'Failure Reason',
      'Redeemed',
      'Payment ID',
      'Gateway Payment ID'
    ];
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
            `"${getPaymentStatusLabel(b)}"`,
            `"${b.paymentFailureReason || ''}"`,
            b.redeemed,
            b.paymentId || '',
            b.gatewayPaymentId || '',
        ].join(','))
    ];
    return csvRows.join('\n');
}

function getPaymentStatusLabel(booking: BookingWithEvent) {
  if (booking.paymentStatus === 'COMPLETED') {
    return 'SUCCESS';
  }

  if (booking.paymentFailureReason === 'USER_DROPPED') {
    return 'USER_DROPPED';
  }

  if (booking.paymentStatus === 'FAILED') {
    return 'FAILED';
  }

  if (booking.paymentStatus === 'PENDING') {
    return 'PENDING';
  }

  return 'UNKNOWN';
}

function getPaymentStatusBadgeClass(booking: BookingWithEvent) {
  if (booking.paymentStatus === 'COMPLETED') {
    return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  }

  if (booking.paymentFailureReason === 'USER_DROPPED') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
  }

  if (booking.paymentStatus === 'FAILED') {
    return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  }

  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

export function BookingsClient({ bookings }: BookingsClientProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [bookingRows, setBookingRows] = useState(bookings);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloadingQr, setIsDownloadingQr] = useState<string | null>(null);
  const [isGeneratingTicket, setIsGeneratingTicket] = useState<string | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    setBookingRows(bookings);
  }, [bookings]);

  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
  const filteredBookings = bookingRows.filter((booking) => {
    if (!normalizedSearchTerm) {
      return true;
    }

    const searchableText = [
      booking.id,
      booking.eventName,
      booking.userName,
      booking.phone,
      booking.ticketTierName,
      booking.paymentId,
      booking.gatewayPaymentId,
      booking.paymentFailureReason,
      getPaymentStatusLabel(booking),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedSearchTerm);
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const csvData = generateBookingsCsv(filteredBookings);
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

  const handleAdminGenerateTicket = async (booking: BookingWithEvent) => {
    if (!firestore) {
      toast({
        title: 'Database unavailable',
        description: 'Unable to update this booking right now.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingTicket(booking.id);

    try {
      const bookingRef = doc(firestore, `events/${booking.eventId}/bookings`, booking.id);
      const paymentCompletedAt = new Date().toISOString();

      await updateDoc(bookingRef, {
        paymentStatus: 'COMPLETED',
        paymentCompletedAt,
      });

      const updatedBooking = {
        ...booking,
        paymentStatus: 'COMPLETED' as const,
        paymentCompletedAt,
      };

      setBookingRows((current) =>
        current.map((row) => (row.id === booking.id ? updatedBooking : row))
      );

      toast({
        title: 'Ticket generated',
        description: 'Booking marked as paid. Downloading the ticket QR now.',
      });

      await handleDownloadQr(updatedBooking);
    } catch (error) {
      console.error('Failed to generate admin ticket', error);
      toast({
        title: 'Ticket generation failed',
        description:
          error instanceof Error ? error.message : 'Unable to mark this booking as paid.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingTicket(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-sm">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, phone, booking ID, event, payment ID..."
          />
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <p className="text-sm text-muted-foreground">
            Showing {filteredBookings.length} of {bookingRows.length} transactions
          </p>
        <Button onClick={handleDownload} disabled={isDownloading}>
          <Download className="mr-2 h-4 w-4" />
          {isDownloading ? 'Generating...' : 'Export CSV'}
        </Button>
        </div>
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
              <TableHead>Payment</TableHead>
              <TableHead className="text-center">Redeemed</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-xs">{booking.id}</TableCell>
                <TableCell className="font-medium">{booking.eventName}</TableCell>
                <TableCell>{booking.userName}</TableCell>
                <TableCell>{booking.ticketTierName}</TableCell>
                <TableCell className="text-right">₹{booking.totalAmount.toLocaleString()}</TableCell>
                <TableCell>{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Badge variant="secondary" className={getPaymentStatusBadgeClass(booking)}>
                      {getPaymentStatusLabel(booking)}
                    </Badge>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {booking.paymentId && <p>Order: {booking.paymentId}</p>}
                      {booking.gatewayPaymentId && <p>Gateway: {booking.gatewayPaymentId}</p>}
                      {booking.paymentFailureReason && booking.paymentFailureReason !== 'USER_DROPPED' && (
                        <p>Reason: {booking.paymentFailureReason}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
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
                  <div className="flex flex-col items-center gap-2">
                    {booking.paymentStatus !== 'COMPLETED' && (
                      <Button
                        size="sm"
                        onClick={() => handleAdminGenerateTicket(booking)}
                        disabled={isGeneratingTicket !== null || isDownloadingQr !== null}
                      >
                        {isGeneratingTicket === booking.id ? 'Generating…' : 'Mark Paid & Generate Ticket'}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadQr(booking)}
                      disabled={isDownloadingQr !== null || isGeneratingTicket !== null}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      {isDownloadingQr === booking.id ? 'Downloading…' : 'Download QR'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
             {filteredBookings.length === 0 && (
                <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                        {bookingRows.length === 0 ? 'No transactions yet.' : 'No matching transactions found.'}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
