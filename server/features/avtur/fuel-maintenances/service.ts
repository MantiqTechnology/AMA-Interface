import { notFound } from '../../../utils/errors';
import { FuelMaintenanceRepository } from './repository';
import type { UpdateCalibrationInput } from './types';

export class FuelMaintenanceService {
  constructor(private readonly repository: FuelMaintenanceRepository) {}

  async updateCalibration(input: UpdateCalibrationInput) {
    const updated = await this.repository.updateCalibrationDate(input.assetId, input.calibratedAt);
    if (!updated) throw notFound('Avtur Asset for Maintenance', input.assetId);
    return updated;
  }
}