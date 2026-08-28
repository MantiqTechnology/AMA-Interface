import { randomUUID } from 'node:crypto';
import type { EmergencyActivationInput } from './types';
import { DomainError, notFound } from '../../../utils/errors';
import { EmergencyActivationRepository } from './repository';

export class EmergencyActivationService {
  constructor(private readonly repository: EmergencyActivationRepository) {}

  async getActive() {
    return this.repository.getActiveActivations();
  }

  // --- LOGIKA ONE-CLICK ERP (BRD Fitur 10 & ICAO Annex 12) ---
  async declareEmergency(input: EmergencyActivationInput) {
    // 1. Validasi Konteks Darurat (Wajib ada minimal satu entitas yang terkena dampak)
    if (!input.flightOperationId && !input.aircraftId && !input.stationId) {
      throw new DomainError(
        'ERP_MISSING_CONTEXT',
        'Harus menyertakan referensi Flight, Aircraft, atau Station yang mengalami keadaan darurat.',
        422
      );
    }

    // 2. Validasi Standar SAR ICAO
    if (!input.icaoPhase || !input.natureOfEmergency) {
      throw new DomainError(
        'ERP_MISSING_CRITICAL_INFO',
        'Fase Kedaruratan ICAO dan Sifat Darurat wajib diisi sebelum Broadcast.',
        422
      );
    }

    try {
      const id = 'erp-' + randomUUID();
      const year = new Date().toISOString().slice(0, 4);
      // Ambil 4 karakter pertama dari UUID sebagai short ID
      const shortId = id.split('-')[1].substring(0, 4).toUpperCase();

      // Ubah format nomor aktivasi menjadi format SAR
      const activationNumber = `SAR-AMA-${year}-${shortId}`;

      // Simpan ke database melalui repository
      const activation = await this.repository.create(
        id,
        activationNumber,
        input,
        new Date().toISOString()
      );

      // TODO: Panggil Integration Provider di masa depan
      // await this.basarnasApiService.transmitDistressSignal(activation);
      // await this.notificationService.broadcastEmergency(activation);

      return activation;
    } catch (error) {
      // Re-throw error agar bisa ditangkap oleh controller/router API
      throw error;
    }
  }

  async closeEmergency(id: string, reason: string) {
    // Validasi alasan penutupan (wajib untuk pelacakan audit SMS)
    if (!reason || reason.trim().length < 5) {
      throw new DomainError(
        'ERP_CLOSURE_REASON_REQUIRED',
        'Alasan penutupan keadaan darurat wajib diisi minimal 5 karakter.',
        422
      );
    }

    const row = await this.repository.close(id, reason, new Date().toISOString());
    if (!row) throw notFound('Emergency Activation', id);

    return row;
  }
}
