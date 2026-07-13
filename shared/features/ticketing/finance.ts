export type TicketingLedgerEntryDto = {
  id: string;
  entryType: 'PASSENGER' | 'CARGO' | 'PASSENGER_REFUND' | 'CARGO_REFUND';
  referenceNumber: string;
  flightNumber: string;
  routeLabel: string;
  customerName: string;
  agentName: string | null;
  amount: number;
  currencyCode: string;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  occurredAt: string;
};

export type TicketingLedgerDto = {
  totals: Array<{
    currencyCode: string;
    passengerRevenue: number;
    cargoRevenue: number;
    refunds: number;
    totalRevenue: number;
  }>;
  unpaidCount: number;
  entries: TicketingLedgerEntryDto[];
};
