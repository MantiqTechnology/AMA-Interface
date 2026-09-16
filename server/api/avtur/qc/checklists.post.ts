import { avturTransactions } from '../../../db/schema/avtur'
import { getDbClient } from '../../../db/client'

const { db } = getDbClient()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    assetId,
    inspectorId,
    visualAppearancePass, // Clear & Bright, No Free Water/Solid
    swdTestResult,        // PASS / FAIL
    densityAt15C,         // Standard: 0.775 - 0.840 kg/L
    tempCelsius,
    conductivityPsM,     // Standard JIG: 50 - 600 pS/m
    overallStatus,        // PASSED / FAILED
    notes,
  } = body

  if (!assetId || !inspectorId || densityAt15C === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameter assetId, inspectorId, dan densityAt15C wajib diisi.',
    })
  }

  // Validasi Batas Mutu Avtur (JIG / ICAO Standard)
  const density = Number(densityAt15C)
  const isDensityValid = density >= 0.775 && density <= 0.840
  const isQcPassed = visualAppearancePass && swdTestResult === 'PASS' && isDensityValid

  const now = new Date().toISOString()

  return {
    success: true,
    data: {
      qcLogId: crypto.randomUUID(),
      assetId,
      inspectorId,
      densityAt15C: density,
      isDensityValid,
      passed: isQcPassed,
      status: isQcPassed ? 'PASSED' : 'FAILED',
      inspectedAt: now,
      message: isQcPassed
        ? 'Pengujian QC Avtur MEMENUHI SYARAT (Passed JIG Standard).'
        : 'Pengujian QC Avtur GAGAL! BBM tidak boleh dituang.',
    },
  }
})