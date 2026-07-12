import { getDbClient } from '../../db/client';
import {
  flightOrders,
  aircraft,
  routes,
  stations,
  customers,
  refStations,
  refRoutes
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { defineApiEventHandler } from '../../utils/api-response';
import { nanoid } from 'nanoid';

interface OccFlightOperation {
  id: string;
  flight_number: string;
  flight_date: string;
  flight_type: string;
  aircraft_registration?: string;
  origin_code: string;
  destination_code: string;
  customer_name?: string;
  scheduled_departure_at?: string;
  scheduled_arrival_at?: string;
}

export default defineApiEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { db, sqlite } = getDbClient(config.dbPath);
  const body = await readBody(event);

  if (!body.flightOperationId) {
    throw createError({ statusCode: 400, message: 'Missing flightOperationId' });
  }

  // Fetch the OCC flight operation
  const flightOp = sqlite
    .prepare(
      `
      SELECT f.*, 
             a.registration_number as aircraft_registration,
             o.station_code as origin_code,
             d.station_code as destination_code,
             c.account_name as customer_name
      FROM flight_operations f
      LEFT JOIN ref_aircraft a ON a.id = f.aircraft_id
      LEFT JOIN ref_stations o ON o.id = f.origin_station_id
      LEFT JOIN ref_stations d ON d.id = f.destination_station_id
      LEFT JOIN ref_customers c ON c.id = f.customer_id
      WHERE f.id = ?
    `
    )
    .get(body.flightOperationId) as OccFlightOperation | undefined;

  if (!flightOp) {
    throw createError({ statusCode: 404, message: 'Flight Operation not found in OCC database' });
  }

  // Check if ticket sales are already open for this flight number
  const existingOrder = await db
    .select()
    .from(flightOrders)
    .where(eq(flightOrders.flightNumber, flightOp.flight_number))
    .get();

  if (existingOrder) {
    throw createError({
      statusCode: 400,
      message: `Penjualan tiket untuk penerbangan ${flightOp.flight_number} sudah pernah dibuka.`
    });
  }

  // Map OCC aircraft to commercial aircraft
  let targetAircraftId = 'ac-caravan-001'; // Default backup
  if (flightOp.aircraft_registration) {
    const acRow = await db
      .select()
      .from(aircraft)
      .where(eq(aircraft.tailNumber, flightOp.aircraft_registration))
      .get();
    if (acRow) {
      targetAircraftId = acRow.id;
    }
  }

  // Map OCC stations (IATA) to commercial stations (ICAO)
  const stationIataToIcao: Record<string, string> = {
    DJJ: 'WAJJ',
    WMX: 'WAVV',
    TIM: 'WABP',
    MKQ: 'WAKK',
    SOQ: 'WASS',
    OKS: 'WAJO',
    DEX: 'WAVD',
    NBX: 'WABI'
  };
  const originIcao = stationIataToIcao[flightOp.origin_code] || flightOp.origin_code;
  const destIcao = stationIataToIcao[flightOp.destination_code] || flightOp.destination_code;

  // Verify and dynamically create origin station if missing in commercial stations
  let originSt = await db.select().from(stations).where(eq(stations.code, originIcao)).get();
  if (!originSt && flightOp.origin_code) {
    const refOrigin = await db
      .select()
      .from(refStations)
      .where(eq(refStations.stationCode, flightOp.origin_code))
      .get();
    if (refOrigin) {
      const newStId = `st-${flightOp.origin_code.toLowerCase()}`;
      await db.insert(stations).values({
        id: newStId,
        code: originIcao,
        name: refOrigin.stationName.replace(' Demo', ''),
        province: refOrigin.province,
        isActive: true
      });
      originSt = await db.select().from(stations).where(eq(stations.id, newStId)).get();
    }
  }

  // Verify and dynamically create destination station if missing in commercial stations
  let destSt = await db.select().from(stations).where(eq(stations.code, destIcao)).get();
  if (!destSt && flightOp.destination_code) {
    const refDest = await db
      .select()
      .from(refStations)
      .where(eq(refStations.stationCode, flightOp.destination_code))
      .get();
    if (refDest) {
      const newStId = `st-${flightOp.destination_code.toLowerCase()}`;
      await db.insert(stations).values({
        id: newStId,
        code: destIcao,
        name: refDest.stationName.replace(' Demo', ''),
        province: refDest.province,
        isActive: true
      });
      destSt = await db.select().from(stations).where(eq(stations.id, newStId)).get();
    }
  }

  // Fallback if stations could not be found or created
  if (!originSt)
    originSt = await db.select().from(stations).where(eq(stations.id, 'st-sentani')).get();
  if (!destSt) destSt = await db.select().from(stations).where(eq(stations.id, 'st-wamena')).get();

  // Map OCC route to commercial routes (or create route dynamically if missing)
  let targetRouteId = 'rt-sentani-wamena'; // Default backup
  if (originSt && destSt) {
    const routeRow = await db
      .select()
      .from(routes)
      .where(
        and(eq(routes.originStationId, originSt.id), eq(routes.destinationStationId, destSt.id))
      )
      .get();

    if (routeRow) {
      targetRouteId = routeRow.id;
    } else {
      // Find OCC reference route info
      const refOriginSt = await db
        .select()
        .from(refStations)
        .where(eq(refStations.stationCode, flightOp.origin_code))
        .get();
      const refDestSt = await db
        .select()
        .from(refStations)
        .where(eq(refStations.stationCode, flightOp.destination_code))
        .get();

      let distanceNm = 150;
      let estimatedBlockMinutes = 60;

      if (refOriginSt && refDestSt) {
        const refRouteRow = await db
          .select()
          .from(refRoutes)
          .where(
            and(
              eq(refRoutes.originStationId, refOriginSt.id),
              eq(refRoutes.destinationStationId, refDestSt.id)
            )
          )
          .get();
        if (refRouteRow) {
          distanceNm = refRouteRow.distanceKm ? Math.round(refRouteRow.distanceKm / 1.852) : 150;
          estimatedBlockMinutes = refRouteRow.estimatedDurationMinutes || 60;
        }
      }

      const newRouteId = `rt-${originSt.id.replace('st-', '')}-${destSt.id.replace('st-', '')}`;
      await db.insert(routes).values({
        id: newRouteId,
        originStationId: originSt.id,
        destinationStationId: destSt.id,
        distanceNm,
        estimatedBlockMinutes
      });
      targetRouteId = newRouteId;
    }
  }

  // Map OCC customer to commercial customer (using valid customer IDs to avoid foreign key failures)
  let targetCustomerId = 'cu-yayasan-lentera'; // Guaranteed fallback default
  if (flightOp.customer_name) {
    const cleanName = flightOp.customer_name.replace(' Demo', '').trim();
    const custRow = await db.select().from(customers).where(eq(customers.name, cleanName)).get();
    if (custRow) {
      targetCustomerId = custRow.id;
    } else {
      // Fuzzy type match to preserve customer domain
      const allCustomers = await db.select().from(customers).all();
      const lowerCustName = flightOp.customer_name.toLowerCase();
      if (lowerCustName.includes('cargo') || lowerCustName.includes('logistics')) {
        const cargoCust = allCustomers.find((c) => c.id === 'cu-pt-kargo-timur');
        if (cargoCust) targetCustomerId = cargoCust.id;
      } else if (lowerCustName.includes('medevac') || lowerCustName.includes('dinkes')) {
        const medevacCust = allCustomers.find((c) => c.id === 'cu-dinkes-mamberamo');
        if (medevacCust) targetCustomerId = medevacCust.id;
      } else {
        if (allCustomers.length > 0) {
          targetCustomerId = allCustomers[0].id;
        }
      }
    }
  }

  const nowStr = new Date().toISOString();
  const scheduledDeparture = flightOp.scheduled_departure_at || nowStr;
  const scheduledArrival = flightOp.scheduled_arrival_at || nowStr;

  // Insert into flightOrders
  const newOrder = {
    id: flightOp.id, // Using same ID as flight operation for perfect synchronization
    flightNumber: flightOp.flight_number,
    orderNumber: `ORD-${nanoid(8).toUpperCase()}`,
    scheduledDeparture,
    scheduledArrival,
    status: 'scheduled' as const,
    aircraftId: targetAircraftId,
    routeId: targetRouteId,
    customerId: targetCustomerId,
    purpose: flightOp.flight_type || 'Charter',
    quotedAmount: 15000000, // Nominal quote price
    currency: 'IDR'
  };

  await db.insert(flightOrders).values(newOrder);

  return {
    success: true,
    flightOrder: newOrder
  };
});
