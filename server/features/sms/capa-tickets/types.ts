export type CapaStatus = 'NEW' | 'INVESTIGATION' | 'ACTION' | 'VERIFIED' | 'CLOSED';
export type CapaPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CapaTicketDto {
  id: string;
  ticketNumber: string;
  sourceReportId: string | null;
  subject: string;
  description: string;
  status: CapaStatus;
  priority: CapaPriority;
  assignedToUserId: string | null;
  dueDate: string;
  isOverdueEscalated: boolean;
  escalatedToUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CapaTicketInput {
  sourceReportId?: string; // ID dari Safety Report (Hazard/Incident)
  subject: string;
  description: string;
  priority?: CapaPriority;
  assignedToUserId?: string;
  dueDate: string; // Batas waktu pengerjaan
}

export interface CapaListQuery {
  status?: CapaStatus;
  priority?: CapaPriority;
  assignedToUserId?: string;
  isOverdueEscalated?: boolean;
  search?: string;
}