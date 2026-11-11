import { useState, useMemo } from 'react';
import {
  BusStop,
  SpeedConfig,
  SMUBuilding,
  DestinationRoute
} from '../types/transit';
import { BusServiceRow } from './BusServiceRow';
import { calculateUrgency } from '../utils/transitEngine';
import {
  MapPin,
  Umbrella,
  ArrowUpDown,
  Navigation,
  Compass,
  Bus,
  Sparkles
} from 'lucide-react';

interface BusStopColumnProps {
  stop: BusStop;
  currentBuilding: SMUBuilding;
  currentSpeed: SpeedConfig;
  selectedDestination: DestinationRoute | null;
  isRecommendedStop: boolean;
  onSelectService?: (serviceNo: string) => void;
}

export function BusStopColumn({
  stop,
  currentBuilding,
  currentSpeed,
  selectedDestination,
  isRecommendedStop,
  onSelectService,
}: BusStopColumnProps) {
  const [sortBy, setSortBy] = useState<'arrival' | 'number'>('arrival');

  // Walking information from current building to this stop
  const walkInfo = stop.distancesFromBuildings[currentBuilding.id] || {
    distanceMeters: 150,
    steps: 200,
    routeTip: 'Walk via campus walkway.',
  };

  const walkTimeMinutes = walkInfo.distanceMeters / currentSpeed.metersPerMinute;

  // Calculate urgency summary counts for this stop
  const urgencyCounts = useMemo(() => {
    let sprint = 0;
    let walkNow = 0;
    let safe = 0;
    let missed = 0;

    for (const service of stop.services) {
      const urg = calculateUrgency(service.nextBus.secondsRemaining, walkInfo.distanceMeters, currentSpeed);
      if (urg.level === 'SPRINT') sprint++;
      else if (urg.level === 'WALK_NOW') walkNow++;
      else if (urg.level === 'SAFE') safe++;
      else if (urg.level === 'MISSED') missed++;
    }

    return { sprint, walkNow, safe, missed };
  }, [stop.services, walkInfo.distanceMeters, currentSpeed]);

  // Sort and filter services
  const sortedServices = useMemo(() => {
    const list = [...stop.services];

    if (sortBy === 'arrival') {
      list.sort((a, b) => a.nextBus.secondsRemaining - b.nextBus.secondsRemaining);
    } else {
      list.sort((a, b) => a.serviceNo.localeCompare(b.serviceNo, undefined, { numeric: true }));
    }

    // If destination is selected, prioritize matching services to the top!
    if (selectedDestination) {
      list.sort((a, b) => {
        const aMatch = selectedDestination.busServices.includes(a.serviceNo) ? 1 : 0;
        const bMatch = selectedDestination.busServices.includes(b.serviceNo) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return list;
  }, [stop.services, sortBy, selectedDestination]);

  return (
    <div
      id={`bus-stop-${stop.id}`}
      className={`flex flex-col h-full rounded-2xl border transition-all duration-300 min-w-[340px] max-w-[420px] flex-1 ${
        isRecommendedStop
          ? 'bg-slate-900/95 border-amber-500/80 shadow-2xl shadow-amber-950/30 ring-2 ring-amber-500/40'
          : 'bg-slate-900/75 border-slate-800/90 hover:border-slate-700 shadow-lg'
      }`}
    >
      {/* Column Header */}
      <div className={`p-4 border-b rounded-t-2xl ${
        isRecommendedStop
          ? 'bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/30'
          : 'bg-slate-950/40 border-slate-800/80'
      }`}>
        
        {/* Recommendation pill if active */}
        {isRecommendedStop && (
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 mb-2 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recommended Stop for Destination</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {stop.id}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {stop.roadName}
              </span>
            </div>
            <h3 className="text-base lg:text-lg font-bold text-white mt-1 leading-snug tracking-tight">
              {stop.name}
            </h3>
          </div>

          {/* Sheltered ratio */}
          <div
            className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md shrink-0 border border-slate-700/60"
            title={`${Math.round(stop.shelteredRatio * 100)}% of route is sheltered walkway`}
          >
            <Umbrella className="w-3.5 h-3.5 text-sky-400" />
            <span>{Math.round(stop.shelteredRatio * 100)}%</span>
          </div>
        </div>

        {/* Distance & Walking Time from Current SMU Building */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              From {currentBuilding.shortName}: <strong className="text-white font-mono">{walkInfo.distanceMeters}m</strong>
            </span>
          </div>
          <div className="font-mono text-emerald-400 font-semibold">
            ~{walkTimeMinutes.toFixed(1)} mins
          </div>
        </div>

        {/* Urgency Summary Ticker */}
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono">
          {urgencyCounts.sprint > 0 && (
            <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 flex items-center gap-1">
              🏃 {urgencyCounts.sprint} Sprint
            </span>
          )}
          {urgencyCounts.walkNow > 0 && (
            <span className="text-sky-300 font-medium px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/30">
              🚶 {urgencyCounts.walkNow} Walk Now
            </span>
          )}
          <span className="text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
            🟢 {urgencyCounts.safe} Safe
          </span>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortBy(sortBy === 'arrival' ? 'number' : 'arrival')}
            className="ml-auto text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
            title={`Sorting by ${sortBy === 'arrival' ? 'Arrival time' : 'Bus number'}. Click to toggle.`}
          >
            <ArrowUpDown className="w-3 h-3" />
            <span className="text-[10px] uppercase font-sans">
              {sortBy === 'arrival' ? 'Time' : 'Bus #'}
            </span>
          </button>
        </div>

      </div>

      {/* Services Departures List */}
      <div className="p-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] flex-1">
        {sortedServices.map((service) => {
          const isMatch = selectedDestination
            ? selectedDestination.busServices.includes(service.serviceNo)
            : false;

          return (
            <BusServiceRow
              key={service.serviceNo}
              service={service}
              walkingDistanceMeters={walkInfo.distanceMeters}
              currentSpeed={currentSpeed}
              currentBuilding={currentBuilding}
              isDestinationMatch={isMatch}
              onSelectService={onSelectService}
            />
          );
        })}
      </div>

      {/* Footer: Landmark description */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 rounded-b-2xl text-[11px] text-slate-400 flex items-center justify-between">
        <span className="truncate" title={stop.landmark}>
          📍 {stop.landmark}
        </span>
        <span className="font-mono text-slate-500 shrink-0 ml-2">
          {stop.services.length} services
        </span>
      </div>

    </div>
  );
}
