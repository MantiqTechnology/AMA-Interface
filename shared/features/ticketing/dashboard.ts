import { z } from 'zod';

export const ticketingDashboardQuerySchema = z.object({
  dateFrom: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD')
    .optional()
});

export type TicketingDashboardQuery = z.infer<typeof ticketingDashboardQuerySchema>;

export type TicketingDashboardDto = {
  totalPassengerTickets: number;
  totalCargoBookings: number;
  checkedInCount: number;
  deliveredCargoCount: number;
  pendingRefundCount: number;
  unpaidTicketCount: number;
  unpaidCargoCount: number;
  revenueByCurrency: Array<{
    currencyCode: string;
    passengerRevenue: number;
    cargoRevenue: number;
    totalRevenue: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: 'PASSENGER' | 'CARGO';
    referenceNumber: string;
    flightNumber: string;
    routeLabel: string;
    customerName: string;
    amount: number;
    currencyCode: string;
    paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
    createdAt: string;
  }>;
  salesByRoute: Array<{
    routeLabel: string;
    passengerCount: number;
    cargoCount: number;
    totalRevenue: number;
    currencyCode: string;
  }>;
};
