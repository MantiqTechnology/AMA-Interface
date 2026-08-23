// Standar Fase Kedaruratan menurut ICAO Annex 12
export type IcaoEmergencyPhase = 'INCERFA' | 'ALERFA' | 'DETRESFA';
export type EmergencyStatus = 'ACTIVE' | 'DOWNGRADED' | 'CLOSED';

export interface EmergencyActivationDto {
  id: string;
  activationNumber: string; // Format: SAR-AMA-YYYY-XXXX
  flightOperationId: string | null;
  aircraftId: string | null;
  stationId: string | null;
  
  // Data SAR (Search and Rescue) Standar ICAO / BASARNAS
  icaoPhase: IcaoEmergencyPhase;
  natureOfEmergency: string;
  pob: number | null; // Persons On Board
  endurance: string | null; // Sisa Bahan Bakar (Waktu)
  lkp: string | null; // Last Known Position (Koordinat)
  
  declaredByUserId: string;
  declaredAt: string;
  broadcastStatusJson: string; // Status blast ke BASARNAS API, WhatsApp, Email, SMS
  status: EmergencyStatus;
  closedAt: string | null;
  closureReason: string | null;
  createdAt: string;
}

export interface EmergencyActivationInput {
  flightOperationId?: string;
  aircraftId?: string;
  stationId?: string;
  
  // Data SAR (Search and Rescue) Standar ICAO / BASARNAS
  icaoPhase: IcaoEmergencyPhase;
  natureOfEmergency: string;
  pob?: number;
  endurance?: string;
  lkp?: string;
  
  declaredByUserId: string;
}