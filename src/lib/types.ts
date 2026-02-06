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
  image: string;
  ticketTiers: TicketTier[];
};

export type Booking = {
  id: string;
  eventId: string;
  userName: string;
  phone: string;
  ticketTierId: string;
  quantity: number;
  totalAmount: number;
  bookingDate: string;
  redeemed: boolean;
  redeemedAt: string | null;
  paymentId?: string;
};

export type JWTPayload = {
  bookingId: string;
  eventId: string;
  iat: number;
};
