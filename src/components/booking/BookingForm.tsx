"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, collection, setDoc } from 'firebase/firestore';

import type { Event, TicketTier, Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Ticket } from 'lucide-react';
import { BookingSchema } from '@/lib/schemas';
import { initiatePhonePePayment, loadPhonePePayPage } from '@/lib/phonepe-client';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';

type BookingFormProps = {
  event: Event;
};

const CheckoutFormSchema = BookingSchema.pick({ name: true, phone: true });

export function BookingForm({ event }: BookingFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [selectedTier, setSelectedTier] = useState<TicketTier>(event.ticketTiers[0]);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof CheckoutFormSchema>>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const handleTierChange = (tierId: string) => {
    const tier = event.ticketTiers.find((t) => t.id === tierId);
    if (tier) {
      setSelectedTier(tier);
    }
  };

  const totalAmount = selectedTier.price * quantity;

  async function handlePayment(data: z.infer<typeof CheckoutFormSchema>) {
    if (!firestore) {
        toast({ title: "Error", description: "Database not available.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    
    try {
      // Step 1 & 2: Generate authorization token and create payment request
      const paymentResult = await initiatePhonePePayment({
        orderId: `ORD_${Date.now()}`,
        amount: totalAmount,
        customerName: data.name,
        customerPhone: data.phone,
        bookingId: event.id,
        eventId: event.id,
      });

      if (!paymentResult.success || !paymentResult.redirectUrl) {
        throw new Error(paymentResult.message || "Payment initiation failed");
      }

      // Create booking first with pending status before redirecting to PhonePe
      const newBookingRef = doc(collection(firestore, `events/${event.id}/bookings`));
      const newBooking: Booking = {
        id: newBookingRef.id,
        eventId: event.id,
        userName: data.name,
        phone: data.phone,
        ticketTierId: selectedTier.id,
        quantity: quantity,
        totalAmount: totalAmount,
        bookingDate: new Date().toISOString(),
        redeemed: false,
        redeemedAt: null,
        paymentId: paymentResult.merchantTransactionId,
      };

      await setDoc(newBookingRef, newBooking);

      // Store merchant transaction ID in session/localStorage for callback verification
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('phonePeMerchantTransactionId', paymentResult.merchantTransactionId!);
        sessionStorage.setItem('phonepeBookingId', newBookingRef.id);
        sessionStorage.setItem('phonepeEventId', event.id);
      }

      // Step 3: Invoke PayPage - Redirect to PhonePe payment gateway
      loadPhonePePayPage(paymentResult.redirectUrl);

    } catch (error) {
      console.error(error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Something went wrong while processing the payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Book Your Tickets</CardTitle>
        <CardDescription>Select your ticket and quantity.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handlePayment)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="ticket-tier">Ticket Tier</Label>
                    <Select onValueChange={handleTierChange} defaultValue={selectedTier.id}>
                        <SelectTrigger id="ticket-tier">
                        <SelectValue placeholder="Select a tier" />
                        </SelectTrigger>
                        <SelectContent>
                        {event.ticketTiers.map((tier) => (
                            <SelectItem key={tier.id} value={tier.id}>
                            {tier.name} - ₹{tier.price}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Quantity</Label>
                    <div className="flex items-center gap-2">
                        <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                        <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                        type="number"
                        className="w-16 text-center"
                        value={quantity}
                        readOnly
                        />
                        <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        >
                        <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your Mobile Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-2xl font-bold text-right">
              Total: ₹{totalAmount.toLocaleString()}
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              <Ticket className="mr-2 h-5 w-5" />
              {isSubmitting ? "Processing..." : `Pay ₹${totalAmount.toLocaleString()} & Book Now`}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
