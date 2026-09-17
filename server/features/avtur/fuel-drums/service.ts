import { notFound } from '../../../utils/errors';
import { FuelDrumRepository } from './repository';
import type { FuelDrumListQuery } from './types';

export class FuelDrumService {
  constructor(private readonly repository: FuelDrumRepository) {}

  list(query: FuelDrumListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const row = await this.repository.getById(id);
    if (!row) throw notFound('Fuel Drum', id);
    return row;
  }
}