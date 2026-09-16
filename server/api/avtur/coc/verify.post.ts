import { eq } from 'drizzle-orm'
import { avturAssets, avturCocVerifications } from '../../../db/schema/avtur'
import { getDbClient } from '../../../db/client'

const { db } = getDbClient()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { assetId, physicalSerialNumber, cocSerialNumber, verifiedBy, notes } = body

  if (!assetId || !physicalSerialNumber || !cocSerialNumber || !verifiedBy) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameter assetId, physicalSerialNumber, cocSerialNumber, dan verifiedBy wajib diisi.',
    })
  }

  const physicalSn = physicalSerialNumber.trim().toUpperCase()
  const cocSn = cocSerialNumber.trim().toUpperCase()
  const isMatched = physicalSn === cocSn

  // Pemetaan Enum berdasarkan skema Drizzle
  const verificationResult = isMatched ? 'MATCH_OK' : 'MISMATCH_REJECT'
  const cocStatus = isMatched ? 'OK' : 'REJECT'
  const operationalStatus = isMatched ? 'ACTIVE' : 'QUARANTINE'
  const now = new Date().toISOString()

  // 1. Simpan Log Audit CoC
  const [auditLog] = await db
    .insert(avturCocVerifications)
    .values({
      id: crypto.randomUUID(),
      assetId,
      verifiedBy,
      physicalSnInput: physicalSn,
      cocDocumentSnInput: cocSn,
      verificationResult,
      notes: notes || null,
      verifiedAt: now,
    })
    .returning()

  // 2. Update status aset
  await db
    .update(avturAssets)
    .set({
      cocStatus,
      operationalStatus,
    })
    .where(eq(avturAssets.id, assetId))

  return {
    success: true,
    data: {
      isMatched,
      verificationResult,
      cocStatus,
      operationalStatus,
      auditId: auditLog.id,
      message: isMatched
        ? 'Verifikasi CoC Berhasil. Status CoC OK & Aset ACTIVE.'
        : 'Mismatch Serial Number! Status CoC REJECT & Aset QUARANTINE.',
    },
  }
})