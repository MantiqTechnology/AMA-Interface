import { notFound } from '../../../utils/errors';
import { FuelSkidRepository } from './repository';
import type { FuelSkidListQuery } from './types';

export class FuelSkidService {
  constructor(private readonly repository: FuelSkidRepository) {}

  list(query: FuelSkidListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Fuel Skid Tank', id);
    return row;
  }
}