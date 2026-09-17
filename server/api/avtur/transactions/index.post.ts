import { avturTransactions } from '../../../db/schema/avtur'
import { getDbClient } from '../../../db/client'

const { db } = getDbClient()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const {
    workflowType,
    sourceAssetId,
    targetAssetId,
    flightMissionId,
    aircraftTailNo,
    flowmeterStartKg,
    flowmeterEndKg,
    totalVolumeLiters,
    densityMeasured,
    temperatureCelsius,
    groundingVerified,
    swdTestPassed,
    sealIntact,
    settlingTimePassed,
    operatorId,
    syncedFromDevice,
  } = body

  if (!workflowType || !sourceAssetId || !operatorId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Parameter workflowType, sourceAssetId, dan operatorId wajib diisi.',
    })
  }

  // Hard-Lock Safety Interlock Check
  const violations: string[] = []
  if (!groundingVerified) violations.push('Kabel Grounding terputus')
  if (!swdTestPassed) violations.push('Uji SWD (Shell Water Detector) belum dilakukan/gagal')
  if (!sealIntact) violations.push('Segel drum/tangki rusak')
  if (!settlingTimePassed) violations.push('Settling time drum belum terpenuhi')

  let solenoidCutoffTriggered = false
  if (violations.length > 0) {
    solenoidCutoffTriggered = true
    throw createError({
      statusCode: 422,
      statusMessage: `Safety Interlock Active (Solenoid Closed): ${violations.join(' | ')}`,
    })
  }

  const transactionNo = `TRX-AVT-${Date.now()}`
  const now = new Date().toISOString()

  const [transaction] = await db
    .insert(avturTransactions)
    .values({
      id: crypto.randomUUID(),
      transactionNo,
      workflowType,
      sourceAssetId,
      targetAssetId: targetAssetId || null,
      flightMissionId: flightMissionId || null,
      aircraftTailNo: aircraftTailNo || null,
      flowmeterStartKg: Number(flowmeterStartKg) || 0,
      flowmeterEndKg: Number(flowmeterEndKg) || 0,
      totalVolumeLiters: Number(totalVolumeLiters) || 0,
      densityMeasured: Number(densityMeasured) || 0,
      temperatureCelsius: Number(temperatureCelsius) || 0,
      groundingVerified: Boolean(groundingVerified),
      swdTestPassed: Boolean(swdTestPassed),
      sealIntact: Boolean(sealIntact),
      settlingTimePassed: Boolean(settlingTimePassed),
      solenoidCutoffTriggered,
      operatorId,
      syncedFromDevice: Boolean(syncedFromDevice),
      createdTimestamp: now,
    })
    .returning()

  return {
    success: true,
    data: transaction,
    message: 'Transaksi penuangan Avtur berhasil direkam.',
  }
})