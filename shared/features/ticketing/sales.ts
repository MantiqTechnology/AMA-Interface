import { z } from 'zod';

export const ticketingServiceTypeSchema = z.enum(['PASSENGER', 'CARGO']);

export const availableTicketingFlightsQuerySchema = z.object({
  serviceType: ticketingServiceTypeSchema,
  originStationId: z.string().trim().min(1).optional(),
  destinationStationId: z.string().trim().min(1).optional()
});

export const openTicketingSalesSchema = z.object({
  flightOperationId: z.string().trim().min(1)
});

export type TicketingServiceType = z.infer<typeof ticketingServiceTypeSchema>;
export type TicketingCargoPriceBasis = 'ACTUAL_WEIGHT' | 'VOLUME_WEIGHT' | 'CHARGEABLE_WEIGHT';
export type AvailableTicketingFlightsQuery = z.infer<typeof availableTicketingFlightsQuerySchema>;
export type OpenTicketingSalesInput = z.infer<typeof openTicketingSalesSchema>;

export type AvailableTicketingFlightDto = {
  id: string;
  flightNumber: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  serviceType: TicketingServiceType;
  routeId: string;
  originStationId: string;
  originCode: string;
  originName: string;
  destinationStationId: string;
  destinationCode: string;
  destinationName: string;
  aircraftId: string;
  aircraftRegistration: string;
  passengerCapacity: number;
  cargoCapacityKg: number;
  baseRate: number;
  minimumCharge: number | null;
  cargoPriceBasis: TicketingCargoPriceBasis | null;
  currencyCode: string;
};

export type TicketingSalesOpeningDto = {
  id: string;
  flightOperationId: string;
  flightOrderId: string;
  flightNumber: string;
  serviceType: TicketingServiceType;
  openedAt: string;
};

export type TicketingOccFlightDto = {
  flightOperationId: string;
  orderNumber: string;
  flightNumber: string;
  flightDate: string;
  flightType: string;
  serviceType: string;
  operationStatus: string;
  routeId: string;
  originCode: string;
  destinationCode: string;
  customerName: string | null;
  aircraftRegistration: string | null;
  pilotInCommandName: string | null;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
  sales: TicketingSalesOpeningDto | null;
  ticketingServiceType: TicketingServiceType;
  canOpenSales: boolean;
  blockers: string[];
};
