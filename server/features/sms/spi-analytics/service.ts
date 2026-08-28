import { SpiAnalyticsRepository } from './repository';
import type { SpiDashboardDto } from './types';

export class SpiAnalyticsService {
  constructor(private readonly repository: SpiAnalyticsRepository) {}

  async getDashboardMetrics(): Promise<SpiDashboardDto> {
    // Mengeksekusi keempat query ke database secara bersamaan agar sangat cepat
    const [totalReports, incidents, openCapas, categoriesRaw] = await Promise.all([
      this.repository.getTotalReportsCount(),
      this.repository.getIncidentCount(),
      this.repository.getOpenCapaCount(),
      this.repository.getReportsByCategory()
    ]);

    // Asumsi Baseline: 10,000 jam terbang (Sesuai standar ALoSP ICAO)
    const assumedFlightHours = 10000;
    const incidentRate = (incidents / assumedFlightHours) * 10000;

    // Kalkulasi Persentase Kategori Bahaya/Insiden
    const topCategories = categoriesRaw
      .map((cat) => ({
        name: cat.category.replace('_', ' '), // Membersihkan teks TECHNICAL_FINDING
        count: cat.count,
        percent: totalReports > 0 ? Math.round((cat.count / totalReports) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count); // Urutkan dari yang terbesar

    return {
      totalReports,
      incidentRate,
      openCapas,
      topCategories
    };
  }
}
