import { desc, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../../db/client';
import { avturCocVerifications, avturAssets } from '../../../db/schema';
import type { QualityControlVerificationDto, VerifyCocInput } from './types';

function toDto(row: typeof avturCocVerifications.$inferSelect): QualityControlVerificationDto {
  return {
    id: row.id,
    assetId: row.assetId,
    verifiedBy: row.verifiedBy,
    physicalSnInput: row.physicalSnInput,
    cocDocumentSnInput: row.cocDocumentSnInput,
    verificationResult: row.verificationResult as QualityControlVerificationDto['verificationResult'],
    notes: row.notes,
    verifiedAt: row.verifiedAt
  };
}

export class QualityControlRepository {
  constructor(private readonly db: AppDatabase) {}

  async listByAsset(assetId: string): Promise<QualityControlVerificationDto[]> {
    const rows = await this.db
      .select()
      .from(avturCocVerifications)
      .where(eq(avturCocVerifications.assetId, assetId))
      .orderBy(desc(avturCocVerifications.verifiedAt));

    return rows.map(toDto);
  }

  async createVerification(
    id: string,
    input: VerifyCocInput,
    result: 'MATCH_OK' | 'MISMATCH_REJECT',
    timestamp: string
  ): Promise<QualityControlVerificationDto> {
    const row = await this.db
      .insert(avturCocVerifications)
      .values({
        id,
        assetId: input.assetId,
        verifiedBy: input.verifiedBy,
        physicalSnInput: input.physicalSnInput,
        cocDocumentSnInput: input.cocDocumentSnInput,
        verificationResult: result,
        notes: input.notes ?? null,
        verifiedAt: timestamp
      })
      .returning()
      .get();

    // Update status CoC di master asset
    await this.db
      .update(avturAssets)
      .set({ cocStatus: result === 'MATCH_OK' ? 'OK' : 'REJECT' })
      .where(eq(avturAssets.id, input.assetId));

    return toDto(row);
  }
}