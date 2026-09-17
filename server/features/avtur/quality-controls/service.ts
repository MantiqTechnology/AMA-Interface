import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../utils/errors';
import { QualityControlRepository } from './repository';
import type { VerifyCocInput } from './types';

export class QualityControlService {
  constructor(private readonly repository: QualityControlRepository) {}

  listByAsset(assetId: string) {
    return this.repository.listByAsset(assetId);
  }

  async verifyCoc(input: VerifyCocInput) {
    if (!input.physicalSnInput || !input.cocDocumentSnInput) {
      throw new DomainError('QC_SN_MISSING', 'Physical SN and CoC Document SN are required.', 422);
    }

    const isMatch = input.physicalSnInput.trim() === input.cocDocumentSnInput.trim();
    const result = isMatch ? 'MATCH_OK' : 'MISMATCH_REJECT';
    
    const id = 'qc-' + randomUUID();
    const now = new Date().toISOString();

    return this.repository.createVerification(id, input, result, now);
  }
}