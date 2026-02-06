"use client";

import { z } from "zod";

export const BookingSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().regex(/^\d{10}$/, { message: "Please enter a valid 10-digit phone number." }),
  eventId: z.string(),
  ticketTierId: z.string(),
  quantity: z.number().min(1),
});

export const FraudAnalysisFormSchema = z.object({
  bookingFrequency: z.coerce.number().min(0),
  locationAnomalies: z.string().min(1, { message: "This field is required" }),
  paymentMethod: z.string().min(1, { message: "This field is required" }),
  unusualPaymentMethods: z.boolean(),
  ipAddress: z.string().ip({ message: "Please enter a valid IP address." }),
});

export const EventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  venue: z.string().min(3, "Venue must be at least 3 characters"),
  date: z.date(),
  description: z.string().min(10, "Description must be at least 10 characters"),
});
