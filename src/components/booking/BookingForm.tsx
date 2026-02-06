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
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';

type BookingFormProps = {
  event: Event;
};

const CheckoutFormSchema = BookingSchema.pick({ name: true, phone: true });

declare global {
  interface Window {
    Razorpay: any;
  }
}

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
      const orderData = await createRazorpayOrder(totalAmount);
      if (!orderData || !orderData.key) {
        throw new Error('Order creation failed');
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'TicketVerse',
        description: `Booking for ${event.name}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            await verifyRazorpayPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
            });

            // Payment verified, now create booking in Firestore
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
                paymentId: response.razorpay_payment_id,
            };

            await setDoc(newBookingRef, newBooking);
            
            router.push(`/booking/${event.id}/${newBooking.id}/success`);

          } catch (error) {
            console.error(error);
            toast({
              title: "Booking Failed",
              description: "Payment verification failed. Please contact support.",
              variant: "destructive"
            });
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: data.name,
          contact: data.phone,
        },
        theme: {
          color: '#8B5CF6',
        },
        modal: {
            ondismiss: function() {
                setIsSubmitting(false);
                toast({
                    title: "Payment Cancelled",
                    description: "You can try booking again.",
                    variant: "default"
                });
            }
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error(error);
      toast({
        title: "Booking Failed",
        description: "Something went wrong while setting up the payment. Please try again.",
        variant: "destructive",
      });
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
                    <Input placeholder="John Doe" {...field} />
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
                    <Input placeholder="9876543210" {...field} />
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
