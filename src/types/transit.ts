export type LoadStatus = 'SEATS_AVAILABLE' | 'STANDING_AVAILABLE' | 'LIMITED_STANDING';
export type BusType = 'SINGLE' | 'DOUBLE' | 'BENDY';

export interface BusArrival {
  estimatedArrival: Date; // Timestamp
  secondsRemaining: number;
  load: LoadStatus;
  type: BusType;
  wheelchair: boolean;
  busNumber: string;
}

export interface BusService {
  serviceNo: string;
  destination: string;
  keyStopsVia: string[];
  nextBus: BusArrival;
  subsequentBus?: BusArrival;
  thirdBus?: BusArrival;
}

export interface SMUBuilding {
  id: string;
  name: string;
  shortName: string;
  code: string;
  description: string;
  coordinates: { x: number; y: number }; // Relative coordinate on campus map (0-100)
}

export interface WalkingInfo {
  distanceMeters: number;
  steps: number;
  routeTip: string;
}

export interface BusStop {
  id: string; // e.g. '04121'
  name: string; // e.g. 'SMU (Bras Basah Rd)'
  roadName: string; // e.g. 'Bras Basah Road'
  landmark: string; // e.g. 'Outside Li Ka Shing Library'
  coordinates: { x: number; y: number }; // Relative coordinate on campus map (0-100)
  shelteredRatio: number; // 0 to 1 (how much of the path is sheltered during rain)
  services: BusService[];
  distancesFromBuildings: Record<string, WalkingInfo>;
}

export type UrgencyLevel = 'SAFE' | 'WALK_NOW' | 'SPRINT' | 'MISSED';

export interface UrgencyCalculation {
  level: UrgencyLevel;
  label: string;
  actionText: string;
  timeDiffMinutes: number; // busArrivalMinutes - walkTimeMinutes
  walkTimeMinutes: number;
  busArrivalMinutes: number;
  busArrivalSeconds: number;
  walkTimeSeconds: number;
  badgeColor: string;
  textColor: string;
  icon: string;
}

export interface DestinationRoute {
  id: string;
  destinationName: string;
  region: string; // e.g. 'Central', 'East', 'West', 'North'
  category: 'Shopping' | 'CBD/Work' | 'Food & Nightlife' | 'Transit Hub' | 'Residential' | 'Airport';
  recommendedStopId: string;
  busServices: string[];
  estimatedTravelTimeMins: number;
  transferInfo?: string;
}

export type WalkingSpeedProfile = 'LEISURE' | 'NORMAL' | 'FAST';

export interface SpeedConfig {
  id: WalkingSpeedProfile;
  label: string;
  metersPerMinute: number;
  description: string;
}
