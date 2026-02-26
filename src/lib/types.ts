export type TicketTier = {
  id: string;
  name: string;
  price: number;
  totalSeats: number;
};

export type Event = {
  id: string;
  name:string;
  date: string;
  venue: string;
  description: string;
  imageUrl: string;
  ticketTiers: TicketTier[];
  adminId: string;
};

export type Booking = {
  id: string;
  eventId: string;
  userName: string;
  phone: string;
  ticketTierId: string;
  quantity: number;
  ticketAmount?: number;
  serviceTaxAmount?: number;
  totalAmount: number;
  bookingDate: string;
  redeemed: boolean;
  redeemedAt: string | null;
  paymentId?: string;
  paymentStatus?: "COMPLETED" | "FAILED" | "PENDING";
};

export type JWTPayload = {
  bookingId: string;
  eventId: string;
  iat: number;
};
