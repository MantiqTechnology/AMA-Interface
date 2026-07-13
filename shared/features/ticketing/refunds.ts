import { z } from 'zod';

const emptyQueryValue = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export const ticketRefundIdParamsSchema = z.object({ id: z.string().trim().min(1) });

export const ticketRefundListQuerySchema = z.object({
  subjectType: z.preprocess(emptyQueryValue, z.enum(['PASSENGER', 'CARGO']).optional()),
  status: z.preprocess(emptyQueryValue, z.enum(['REQUESTED', 'APPROVED', 'REJECTED']).optional())
});

export const requestTicketRefundSchema = z.object({
  reason: z.string().trim().min(10).max(500)
});

export const decideTicketRefundSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  note: z.string().trim().min(3).max(500)
});

export type TicketRefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED';
export type TicketRefundListQuery = z.infer<typeof ticketRefundListQuerySchema>;
export type RequestTicketRefundInput = z.infer<typeof requestTicketRefundSchema>;
export type DecideTicketRefundInput = z.infer<typeof decideTicketRefundSchema>;

export type TicketRefundSummaryDto = {
  id: string;
  status: TicketRefundStatus;
  reason: string;
  requestedAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
};

export type TicketRefundRequestDto = TicketRefundSummaryDto & {
  subjectType: 'PASSENGER' | 'CARGO';
  subjectId: string;
  referenceNumber: string;
  flightNumber: string;
  routeLabel: string;
  customerName: string;
  amount: number;
  currencyCode: string;
  requestedByUserId: string;
  decidedByUserId: string | null;
};
