import { BusArrival, BusService, LoadStatus, BusType } from '../types/transit';

export interface LtaNextBusRaw {
  OriginCode?: string;
  DestinationCode?: string;
  EstimatedArrival?: string;
  Latitude?: string;
  Longitude?: string;
  VisitNumber?: string;
  Load?: 'SEA' | 'SDA' | 'LSD' | string;
  Feature?: 'WAB' | string;
  Type?: 'SD' | 'DD' | 'BD' | string;
}

export interface LtaServiceRaw {
  ServiceNo: string;
  Operator: string;
  NextBus?: LtaNextBusRaw;
  NextBus2?: LtaNextBusRaw;
  NextBus3?: LtaNextBusRaw;
}

export interface LtaBusArrivalResponse {
  'odata.metadata'?: string;
  BusStopCode: string;
  Services: LtaServiceRaw[];
  configured?: boolean;
  status?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp: string;
  ltaKeyConfigured: boolean;
  endpoints: Record<string, string>;
}

function parseLtaLoad(load?: string): LoadStatus {
  switch (load) {
    case 'SEA':
      return 'SEATS_AVAILABLE';
    case 'SDA':
      return 'STANDING_AVAILABLE';
    case 'LSD':
      return 'LIMITED_STANDING';
    default:
      return 'SEATS_AVAILABLE';
  }
}

function parseLtaType(type?: string): BusType {
  switch (type) {
    case 'DD':
      return 'DOUBLE';
    case 'BD':
      return 'BENDY';
    case 'SD':
    default:
      return 'SINGLE';
  }
}

function parseArrival(raw?: LtaNextBusRaw, serviceNo: string = ''): BusArrival | undefined {
  if (!raw || !raw.EstimatedArrival) return undefined;

  const arrivalDate = new Date(raw.EstimatedArrival);
  const now = Date.now();
  const secondsRemaining = Math.max(0, Math.round((arrivalDate.getTime() - now) / 1000));

  return {
    estimatedArrival: arrivalDate,
    secondsRemaining,
    load: parseLtaLoad(raw.Load),
    type: parseLtaType(raw.Type),
    wheelchair: raw.Feature === 'WAB',
    busNumber: `SG-${serviceNo}`,
  };
}

/**
 * Check LTA DataMall backend health & key configuration
 */
export async function checkLtaHealth(): Promise<HealthCheckResponse | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch live arrivals for a bus stop from the /api/nextbus proxy
 */
export async function fetchLiveBusArrivals(
  busStopCode: string,
  serviceNo?: string
): Promise<LtaBusArrivalResponse | null> {
  try {
    const params = new URLSearchParams({ BusStopCode: busStopCode });
    if (serviceNo) params.append('ServiceNo', serviceNo);

    const res = await fetch(`/api/nextbus?${params.toString()}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Merge live LTA Datamall arrivals into our local bus stop dataset
 */
export function mergeLtaArrivals(
  existingServices: BusService[],
  ltaServices: LtaServiceRaw[]
): BusService[] {
  if (!ltaServices || ltaServices.length === 0) return existingServices;

  const ltaMap = new Map<string, LtaServiceRaw>();
  for (const s of ltaServices) {
    ltaMap.set(s.ServiceNo, s);
  }

  return existingServices.map((svc) => {
    const liveMatch = ltaMap.get(svc.serviceNo);
    if (!liveMatch || !liveMatch.NextBus || !liveMatch.NextBus.EstimatedArrival) {
      return svc;
    }

    const nextBus = parseArrival(liveMatch.NextBus, svc.serviceNo);
    const subBus = parseArrival(liveMatch.NextBus2, svc.serviceNo);
    const thirdBus = parseArrival(liveMatch.NextBus3, svc.serviceNo);

    if (!nextBus) return svc;

    return {
      ...svc,
      nextBus,
      subsequentBus: subBus || svc.subsequentBus,
      thirdBus: thirdBus || svc.thirdBus,
    };
  });
}
