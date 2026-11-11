const LTA_DATAMALL_ENDPOINT = 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival';

export const BOARD_STOP_IDS = ['04121', '04019', '08069', '04159', '04029', '04179'];

export const BOARD_STOP_NAMES = {
  '04121': 'SMU (Bras Basah Rd)',
  '04019': 'SMU / Opp Li Ka Shing Lib (Stamford Rd)',
  '08069': 'Hotel Rendezvous / SMU (Bras Basah Rd)',
  '04159': 'Aft Chijmes / SMU Admin (Victoria St)',
  '04029': 'Bencoolen Stn Exit B / Opp SMU (Bencoolen St)',
  '04179': 'NTUC Income Ctr / Bras Basah Stn (Bras Basah Rd)',
};

/**
 * Fetch live arrivals from LTA DataMall v3 API for a single bus stop
 */
export async function fetchLtaBusArrival(busStopCode, serviceNo = '') {
  const accountKey =
    process.env.LTA_DATAMALL_ACCOUNT_KEY ||
    process.env.LTA_ACCOUNT_KEY ||
    process.env.ACCOUNT_KEY ||
    '';

  if (!accountKey || accountKey.trim() === '') {
    return {
      ok: false,
      status: 401,
      error: 'AccountKey is missing in environment variables',
      source: 'LTA DataMall',
    };
  }

  const url = new URL(LTA_DATAMALL_ENDPOINT);
  url.searchParams.append('BusStopCode', String(busStopCode).trim());
  if (serviceNo && String(serviceNo).trim() !== '') {
    url.searchParams.append('ServiceNo', String(serviceNo).trim());
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 8000);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        AccountKey: accountKey.trim(),
        accept: 'application/json',
      },
      signal: abortController.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        error: errorText || `HTTP ${response.status}`,
        source: 'LTA DataMall',
      };
    }

    const data = await response.json();
    return {
      ok: true,
      status: 200,
      data,
      source: 'LTA DataMall',
    };
  } catch (err) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: err.name === 'AbortError' ? 504 : 500,
      error: err.message || 'Request failed',
      source: 'LTA DataMall',
    };
  }
}

/**
 * Convert an ISO timestamp into minutes from now
 */
export function calculateMinutesFromNow(estimatedArrivalStr, nowMs = Date.now()) {
  if (!estimatedArrivalStr) return null;
  const arrDate = new Date(estimatedArrivalStr);
  const diffMs = arrDate.getTime() - nowMs;
  return Math.max(0, Math.round(diffMs / 60000));
}

/**
 * Simplify LTA raw services array into clean service minutes
 */
export function simplifyLtaServices(services = [], nowMs = Date.now()) {
  if (!Array.isArray(services)) return [];

  const results = [];
  for (const svc of services) {
    const serviceNo = svc.ServiceNo;
    const nextMin = calculateMinutesFromNow(svc.NextBus?.EstimatedArrival, nowMs);
    const next2Min = calculateMinutesFromNow(svc.NextBus2?.EstimatedArrival, nowMs);

    if (nextMin !== null) {
      results.push({
        serviceNo,
        nextBusMinutes: nextMin,
        nextBus2Minutes: next2Min,
      });
    }
  }

  // Sort by service number numerically
  results.sort((a, b) => a.serviceNo.localeCompare(b.serviceNo, undefined, { numeric: true }));
  return results;
}

/**
 * Get the full board reading for all 6 SMU bus stops
 */
export async function getBoardReading(nowMs = Date.now()) {
  const accountKey =
    process.env.LTA_DATAMALL_ACCOUNT_KEY ||
    process.env.LTA_ACCOUNT_KEY ||
    process.env.ACCOUNT_KEY ||
    '';

  if (!accountKey || accountKey.trim() === '') {
    return {
      ok: false,
      status: 401,
      source: 'LTA DataMall',
      error: 'AccountKey is missing in environment variables',
    };
  }

  const stops = [];

  for (const stopId of BOARD_STOP_IDS) {
    const res = await fetchLtaBusArrival(stopId);
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        source: 'LTA DataMall',
        error: `Failed for stop ${stopId}: ${res.error}`,
      };
    }

    const simplifiedServices = simplifyLtaServices(res.data?.Services || [], nowMs);

    // Find the soonest bus across all services at this stop
    let soonestBus = null;
    let minMinutes = 9999;
    for (const s of simplifiedServices) {
      if (s.nextBusMinutes !== null && s.nextBusMinutes < minMinutes) {
        minMinutes = s.nextBusMinutes;
        soonestBus = { serviceNo: s.serviceNo, minutes: s.nextBusMinutes };
      }
    }

    stops.push({
      stopId,
      stopName: BOARD_STOP_NAMES[stopId] || stopId,
      soonestBus,
      services: simplifiedServices,
    });
  }

  return {
    ok: true,
    status: 200,
    stops,
    source: 'LTA DataMall',
  };
}

/**
 * Baseline SMU bus stop services used for fallback or when mock/simulated reading is requested
 */
export const BASELINE_BOARD_DATA = {
  '04121': [
    { serviceNo: '7', nextBusMinutes: 2, nextBus2Minutes: 11 },
    { serviceNo: '14', nextBusMinutes: 4, nextBus2Minutes: 13 },
    { serviceNo: '16', nextBusMinutes: 7, nextBus2Minutes: 16 },
    { serviceNo: '36', nextBusMinutes: 3, nextBus2Minutes: 9 },
    { serviceNo: '77', nextBusMinutes: 1, nextBus2Minutes: 11 },
    { serviceNo: '106', nextBusMinutes: 5, nextBus2Minutes: 12 },
    { serviceNo: '111', nextBusMinutes: 8, nextBus2Minutes: null },
    { serviceNo: '175', nextBusMinutes: 2, nextBus2Minutes: 10 },
    { serviceNo: '857', nextBusMinutes: 4, nextBus2Minutes: 13 },
  ],
  '04019': [
    { serviceNo: '190', nextBusMinutes: 1, nextBus2Minutes: 6 },
    { serviceNo: '7', nextBusMinutes: 4, nextBus2Minutes: 12 },
    { serviceNo: '14', nextBusMinutes: 6, nextBus2Minutes: null },
    { serviceNo: '106', nextBusMinutes: 3, nextBus2Minutes: 9 },
    { serviceNo: '124', nextBusMinutes: 6, nextBus2Minutes: 15 },
    { serviceNo: '147', nextBusMinutes: 4, nextBus2Minutes: 11 },
    { serviceNo: '166', nextBusMinutes: 5, nextBus2Minutes: 14 },
    { serviceNo: '174', nextBusMinutes: 8, nextBus2Minutes: 17 },
  ],
  '08069': [
    { serviceNo: '175', nextBusMinutes: 1, nextBus2Minutes: 9 },
    { serviceNo: '7', nextBusMinutes: 2, nextBus2Minutes: 9 },
    { serviceNo: '36', nextBusMinutes: 2, nextBus2Minutes: 8 },
    { serviceNo: '111', nextBusMinutes: 7, nextBus2Minutes: null },
    { serviceNo: '167', nextBusMinutes: 4, nextBus2Minutes: 13 },
    { serviceNo: '502', nextBusMinutes: 6, nextBus2Minutes: null },
  ],
  '04159': [
    { serviceNo: '147', nextBusMinutes: 2, nextBus2Minutes: 8 },
    { serviceNo: '2', nextBusMinutes: 5, nextBus2Minutes: null },
    { serviceNo: '12', nextBusMinutes: 4, nextBus2Minutes: 11 },
    { serviceNo: '33', nextBusMinutes: 9, nextBus2Minutes: null },
    { serviceNo: '130', nextBusMinutes: 6, nextBus2Minutes: 15 },
    { serviceNo: '133', nextBusMinutes: 7, nextBus2Minutes: null },
    { serviceNo: '960', nextBusMinutes: 3, nextBus2Minutes: 10 },
  ],
  '04029': [
    { serviceNo: '139', nextBusMinutes: 2, nextBus2Minutes: 9 },
    { serviceNo: '64', nextBusMinutes: 3, nextBus2Minutes: 12 },
    { serviceNo: '65', nextBusMinutes: 5, nextBus2Minutes: 13 },
    { serviceNo: '147', nextBusMinutes: 4, nextBus2Minutes: 10 },
    { serviceNo: '166', nextBusMinutes: 6, nextBus2Minutes: null },
  ],
  '04179': [
    { serviceNo: '518', nextBusMinutes: 2, nextBus2Minutes: 10 },
    { serviceNo: '7', nextBusMinutes: 3, nextBus2Minutes: null },
    { serviceNo: '36', nextBusMinutes: 4, nextBus2Minutes: null },
    { serviceNo: '131', nextBusMinutes: 3, nextBus2Minutes: 11 },
    { serviceNo: '167', nextBusMinutes: 5, nextBus2Minutes: null },
  ],
};

/**
 * Returns baseline board reading
 */
export function getSimulatedBoardReading() {
  const stops = [];
  for (const stopId of BOARD_STOP_IDS) {
    const services = BASELINE_BOARD_DATA[stopId] || [];
    let soonestBus = null;
    let minMinutes = 9999;
    for (const s of services) {
      if (s.nextBusMinutes !== null && s.nextBusMinutes < minMinutes) {
        minMinutes = s.nextBusMinutes;
        soonestBus = { serviceNo: s.serviceNo, minutes: s.nextBusMinutes };
      }
    }
    stops.push({
      stopId,
      stopName: BOARD_STOP_NAMES[stopId] || stopId,
      soonestBus,
      services,
    });
  }
  return {
    ok: true,
    status: 200,
    stops,
    source: 'LTA DataMall',
  };
}

/**
 * Standard Express handler for GET /api/bus & GET /api/nextbus
 */
export default async function busHandler(req, res) {
  const busStopCode = req.query.BusStopCode || req.query.busStopCode || req.query.stopId || '';
  const serviceNo = req.query.ServiceNo || req.query.serviceNo || '';

  if (!busStopCode) {
    return res.status(400).json({
      error: 'Missing required query parameter: BusStopCode',
      example: '/api/bus?BusStopCode=83139&ServiceNo=15',
    });
  }

  res.setHeader('Cache-Control', 's-maxage=20, stale-while-revalidate=40');

  const result = await fetchLtaBusArrival(busStopCode, serviceNo);

  if (!result.ok) {
    if (result.status === 401) {
      return res.status(200).json({
        status: 'notice',
        configured: false,
        message: 'LTA_DATAMALL_ACCOUNT_KEY is not yet configured in environment.',
        BusStopCode: busStopCode,
        Services: [],
      });
    }

    return res.status(result.status).json({
      error: result.error,
      busStopCode,
    });
  }

  return res.status(200).json({
    ...result.data,
    configured: true,
    cachedAt: new Date().toISOString(),
  });
}
