import { getDbClient } from '../../../db/client';
import { SpiAnalyticsRepository } from './repository';
import { SpiAnalyticsService } from './service';

// Ekspor semua *types*, *repository*, dan *service* agar bisa diakses oleh file lain jika dibutuhkan
export * from './types';
export * from './repository';
export * from './service';

// Factory function untuk menginisialisasi servis beserta dependensi database-nya
export function getSpiAnalyticsService() {
  const db = getDbClient().db;
  return new SpiAnalyticsService(new SpiAnalyticsRepository(db));
}

export interface IncidentCategoryStat {
  name: string;
  count: number;
  percent: number;
}

export interface SpiDashboardDto {
  totalReports: number;
  incidentRate: number;
  openCapas: number;
  topCategories: IncidentCategoryStat[];
}