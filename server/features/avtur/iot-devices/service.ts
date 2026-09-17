import { randomUUID } from 'node:crypto';
import { DomainError, notFound } from '../../../utils/errors';
import { BleIotDeviceRepository } from './repository';
import type {
  BleDeviceListQuery,
  BleTelemetrySyncInput,
  BleUltrasonicDeviceInput,
  TelemetrySyncResultDto
} from './types';

export class BleIotDeviceService {
  constructor(private readonly repository: BleIotDeviceRepository) {}

  list(query: BleDeviceListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Avtur Asset Hardware', id);
    return row;
  }

  async registerDevice(input: BleUltrasonicDeviceInput) {
    this.validateInput(input);

    const existingAsset = await this.repository.getByAssetCode(input.assetCode);
    if (existingAsset) {
      throw new DomainError(
        'AVTUR_ASSET_CODE_DUPLICATE',
        `Asset dengan Kode ${input.assetCode} sudah terdaftar.`,
        409
      );
    }

    try {
      const id = 'asset-' + randomUUID();
      const now = new Date().toISOString();
      return await this.repository.create(id, input, now);
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async syncEfbTelemetry(input: BleTelemetrySyncInput): Promise<TelemetrySyncResultDto> {
    const asset = await this.get(input.deviceId);

    if (asset.operationalStatus === 'QUARANTINE' || asset.operationalStatus === 'DECOMMISSIONED') {
      throw new DomainError(
        'AVTUR_ASSET_NOT_OPERATIONAL',
        `Aset ${asset.assetCode} dalam status ${asset.operationalStatus} dan tidak boleh digunakan.`,
        400
      );
    }

    const fluidHeightCm = Math.max(0, input.tankHeightCm - input.rawDistanceCm);
    const calculatedVolumeLiter = Math.round(fluidHeightCm * 10 * 100) / 100;

    const now = new Date().toISOString();

    return {
      deviceId: asset.id,
      assetCode: asset.assetCode,
      calculatedVolumeLiter,
      remainingFluidHeightCm: fluidHeightCm,
      syncedAt: now
    };
  }

  private validateInput(input: BleUltrasonicDeviceInput) {
    if (!input.stationId) {
      throw new DomainError('AVTUR_STATION_REQUIRED', 'Station ID is mandatory.', 422);
    }
    if (!input.assetCode || input.assetCode.trim().length < 3) {
      throw new DomainError('AVTUR_ASSET_CODE_INVALID', 'Asset code must be at least 3 characters long.', 422);
    }
    if (!input.serialNumberPhysical || !input.serialNumberCoc) {
      throw new DomainError('AVTUR_SN_REQUIRED', 'Both Physical and CoC Serial Numbers are mandatory.', 422);
    }
  }

  private rethrowWriteError(error: unknown): never {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE constraint failed')) {
      throw new DomainError('AVTUR_ASSET_DUPLICATE', 'Asset Code already exists.', 409);
    }
    if (message.includes('FOREIGN KEY constraint failed')) {
      throw new DomainError('AVTUR_RELATION_INVALID', 'Related Station ID does not exist.', 422);
    }
    throw error;
  }
}