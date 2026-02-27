"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";

import type { Booking, Event, TicketTier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Ticket } from "lucide-react";
import { BookingSchema } from "@/lib/schemas";
import { initiatePhonePePayment, loadPhonePePayPage } from "@/lib/phonepe-client";
import { useToast } from "@/hooks/use-toast";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";

type BookingFormProps = {
  event: Event;
};

const CheckoutFormSchema = BookingSchema.pick({ name: true, phone: true });
const SERVICE_TAX_PERCENT = Number(process.env.NEXT_PUBLIC_SERVICE_TAX_PERCENT ?? "2");
const SERVICE_TAX_FIXED = Number(process.env.NEXT_PUBLIC_SERVICE_TAX_FIXED ?? "0");

function getSoldCount(tierId: string, bookingData: Booking[]): number {
  return bookingData
    .filter((booking) => booking.ticketTierId === tierId)
    .filter((booking) => booking.paymentStatus !== "FAILED" && booking.paymentStatus !== "PENDING")
    .reduce((sum, booking) => sum + booking.quantity, 0);
}

export function BookingForm({ event }: BookingFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedTier, setSelectedTier] = useState<TicketTier>(event.ticketTiers[0]);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bookingsQuery = useMemoFirebase(
    () => {
      if (!firestore) {
        return null;
      }
      const queryRef = collection(firestore, `events/${event.id}/bookings`);
      (queryRef as { __suppressPermissionError?: boolean }).__suppressPermissionError = true;
      return queryRef;
    },
    [firestore, event.id]
  );
  const { data: bookings, error: bookingsError } = useCollection<Booking>(bookingsQuery);

  const availabilityIsKnown = !bookingsError;
  const soldSeats = availabilityIsKnown ? getSoldCount(selectedTier.id, bookings ?? []) : 0;
  const remainingSeats = availabilityIsKnown ? Math.max(0, selectedTier.totalSeats - soldSeats) : Number.POSITIVE_INFINITY;
  const maxSelectableSeats = availabilityIsKnown ? remainingSeats : selectedTier.totalSeats;
  const isSoldOut = availabilityIsKnown && remainingSeats === 0;

  const form = useForm<z.infer<typeof CheckoutFormSchema>>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  const handleTierChange = (tierId: string) => {
    const tier = event.ticketTiers.find((t) => t.id === tierId);
    if (tier) {
      setSelectedTier(tier);
      setQuantity(1);
    }
  };

  useEffect(() => {
    if (isSoldOut) {
      setQuantity(1);
      return;
    }

    if (Number.isFinite(maxSelectableSeats) && quantity > maxSelectableSeats) {
      setQuantity(maxSelectableSeats);
    }
  }, [isSoldOut, maxSelectableSeats, quantity]);

  const ticketAmount = selectedTier.price * quantity;
  const safeTaxPercent =
    Number.isFinite(SERVICE_TAX_PERCENT) && SERVICE_TAX_PERCENT > 0 && SERVICE_TAX_PERCENT < 100
      ? SERVICE_TAX_PERCENT
      : 0;
  const safeFixedFee = Number.isFinite(SERVICE_TAX_FIXED) && SERVICE_TAX_FIXED > 0 ? SERVICE_TAX_FIXED : 0;
  // Gross-up to recover ticket amount after gateway fixed + percentage deductions.
  const grossPayable =
    safeTaxPercent > 0
      ? (ticketAmount + safeFixedFee) / (1 - safeTaxPercent / 100)
      : ticketAmount + safeFixedFee;
  const serviceTaxAmount = Number((grossPayable - ticketAmount).toFixed(2));
  const totalAmount = Number(grossPayable.toFixed(2));

  async function handlePayment(data: z.infer<typeof CheckoutFormSchema>) {
    if (!firestore) {
      toast({ title: "Error", description: "Database not available.", variant: "destructive" });
      return;
    }

    if (isSoldOut) {
      toast({ title: "Sold out", description: "This ticket tier is sold out.", variant: "destructive" });
      return;
    }

    if (availabilityIsKnown && quantity > remainingSeats) {
      toast({
        title: "Not enough seats",
        description: `Only ${remainingSeats} tickets left in this tier.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (availabilityIsKnown) {
        const latestBookingsSnapshot = await getDocs(collection(firestore, `events/${event.id}/bookings`));
        const latestBookings = latestBookingsSnapshot.docs.map((snapshot) => snapshot.data() as Booking);
        const latestRemainingSeats = Math.max(
          0,
          selectedTier.totalSeats - getSoldCount(selectedTier.id, latestBookings)
        );

        if (latestRemainingSeats <= 0) {
          throw new Error("Sold out");
        }

        if (quantity > latestRemainingSeats) {
          throw new Error(`Only ${latestRemainingSeats} tickets left`);
        }
      }

      const newBookingRef = doc(collection(firestore, `events/${event.id}/bookings`));

      const paymentResult = await initiatePhonePePayment({
        orderId: `ORD_${Date.now()}`,
        amount: totalAmount,
        customerName: data.name,
        customerPhone: data.phone,
        bookingId: newBookingRef.id,
        eventId: event.id,
      });

      if (!paymentResult.success || !paymentResult.paymentSessionId) {
        throw new Error(paymentResult.message || "Payment initiation failed");
      }

      const newBooking: Booking = {
        id: newBookingRef.id,
        eventId: event.id,
        userName: data.name,
        phone: data.phone,
        ticketTierId: selectedTier.id,
        quantity: quantity,
        ticketAmount,
        serviceTaxAmount,
        totalAmount: totalAmount,
        bookingDate: new Date().toISOString(),
        redeemed: false,
        redeemedAt: null,
        paymentId: paymentResult.merchantTransactionId,
        paymentStatus: "PENDING",
      };

      await setDoc(newBookingRef, newBooking);

      if (typeof window !== "undefined") {
        if (paymentResult.merchantTransactionId) {
          sessionStorage.setItem("phonePeMerchantTransactionId", paymentResult.merchantTransactionId);
        }
        sessionStorage.setItem("phonepeBookingId", newBookingRef.id);
        sessionStorage.setItem("phonepeEventId", event.id);
      }

      await loadPhonePePayPage(
        paymentResult.paymentSessionId,
        paymentResult.checkoutMode || "sandbox"
      );
    } catch (error) {
      console.error(error);
      toast({
        title: "Booking Failed",
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong while processing the payment. Please try again.",
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Label htmlFor="ticket-tier">Ticket Tier</Label>
                <Select onValueChange={handleTierChange} defaultValue={selectedTier.id}>
                  <SelectTrigger id="ticket-tier">
                    <SelectValue placeholder="Select a tier" />
                  </SelectTrigger>
                  <SelectContent>
                    {event.ticketTiers.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name} - INR {tier.price}
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
                    disabled={quantity <= 1 || isSoldOut}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input type="number" className="w-16 text-center" value={quantity} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={isSoldOut || quantity >= maxSelectableSeats}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className={`mt-2 text-sm ${remainingSeats === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {availabilityIsKnown
                    ? isSoldOut
                      ? "Sold out"
                      : remainingSeats < 5
                        ? `Only ${remainingSeats} tickets left`
                        : null
                    : null}
                </p>
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

            <div className="space-y-1 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ticket Amount</span>
                <span>INR {ticketAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Service Tax ({safeTaxPercent}%)</span>
                <span>INR {serviceTaxAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-base font-bold">
                <span>Total Payable</span>
                <span>INR {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || isSoldOut}>
              <Ticket className="mr-2 h-5 w-5" />
              {isSoldOut
                ? "Sold out"
                : isSubmitting
                  ? "Processing..."
                  : `Pay INR ${totalAmount.toLocaleString()} & Book Now`}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
