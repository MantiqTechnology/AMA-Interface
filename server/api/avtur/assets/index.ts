import { eq, and } from 'drizzle-orm'
import { avturAssets } from '../../../db/schema/avtur'
import { getDbClient } from '../../../db/client'

const { db } = getDbClient()

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  // GET: Fetch list aset dengan filter opsional
  if (method === 'GET') {
    const query = getQuery(event)
    const { stationId, category, operationalStatus } = query

    const conditions = []
    if (stationId) conditions.push(eq(avturAssets.stationId, String(stationId)))
    if (category) conditions.push(eq(avturAssets.category, String(category) as any))
    if (operationalStatus) conditions.push(eq(avturAssets.operationalStatus, String(operationalStatus) as any))

    const assets = conditions.length > 0
      ? await db.select().from(avturAssets).where(and(...conditions))
      : await db.select().from(avturAssets)

    return {
      success: true,
      data: assets,
    }
  }

  // POST: Registrasi unit aset Ex-Proof baru
  if (method === 'POST') {
    const body = await readBody(event)
    const {
      assetCode,
      assetName,
      category,
      brandModel,
      serialNumberPhysical,
      serialNumberCoc,
      exRating,
      stationId,
    } = body

    if (!assetCode || !assetName || !category || !serialNumberPhysical || !serialNumberCoc || !stationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Parameter mandatory (assetCode, assetName, category, serialNumberPhysical, serialNumberCoc, stationId) harus diisi.',
      })
    }

    const [newAsset] = await db
      .insert(avturAssets)
      .values({
        id: crypto.randomUUID(),
        assetCode,
        assetName,
        category,
        brandModel: brandModel || null,
        serialNumberPhysical,
        serialNumberCoc,
        exRating: exRating || null,
        stationId,
        cocStatus: 'PENDING',
        operationalStatus: 'ACTIVE',
        installedAt: new Date().toISOString(),
      })
      .returning()

    return {
      success: true,
      data: newAsset,
    }
  }
})