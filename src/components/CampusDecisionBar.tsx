import { useState, useMemo } from 'react';
import {
  SMUBuilding,
  SpeedConfig,
  DestinationRoute,
  BusStop,
  UrgencyCalculation
} from '../types/transit';
import { SMU_BUILDINGS, SPEED_PROFILES, DESTINATIONS_DIRECTORY } from '../data/smuTransitData';
import { calculateUrgency, formatArrivalSeconds } from '../utils/transitEngine';
import {
  Search,
  Building,
  Zap,
  Footprints,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Flame,
  ShieldAlert,
  Sparkles,
  X,
  Gauge
} from 'lucide-react';

interface CampusDecisionBarProps {
  currentBuilding: SMUBuilding;
  onSelectBuilding: (building: SMUBuilding) => void;
  currentSpeed: SpeedConfig;
  onSelectSpeed: (speed: SpeedConfig) => void;
  selectedDestination: DestinationRoute | null;
  onSelectDestination: (dest: DestinationRoute | null) => void;
  busStops: BusStop[];
  onFocusStop: (stopId: string) => void;
}

export function CampusDecisionBar({
  currentBuilding,
  onSelectBuilding,
  currentSpeed,
  onSelectSpeed,
  selectedDestination,
  onSelectDestination,
  busStops,
  onFocusStop,
}: CampusDecisionBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter destinations based on search query
  const filteredDestinations = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return DESTINATIONS_DIRECTORY.filter(
      (d) =>
        d.destinationName.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.busServices.some((s) => s.toLowerCase().includes(q)) ||
        d.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Compute the optimal bus recommendation and RUN vs WALK urgency verdict
  const recommendation = useMemo(() => {
    if (!selectedDestination) {
      // Find the absolute nearest bus stop and the single next departing bus
      let closestStop = busStops[0];
      let minDistance = 9999;
      for (const stop of busStops) {
        const dist = stop.distancesFromBuildings[currentBuilding.id]?.distanceMeters ?? 999;
        if (dist < minDistance) {
          minDistance = dist;
          closestStop = stop;
        }
      }

      // Find the soonest bus at this closest stop
      let soonestBusService = closestStop.services[0];
      let minSec = 99999;
      for (const svc of closestStop.services) {
        if (svc.nextBus.secondsRemaining < minSec && svc.nextBus.secondsRemaining >= 0) {
          minSec = svc.nextBus.secondsRemaining;
          soonestBusService = svc;
        }
      }

      const urgency = calculateUrgency(
        soonestBusService.nextBus.secondsRemaining,
        minDistance,
        currentSpeed
      );

      return {
        stop: closestStop,
        service: soonestBusService,
        distanceMeters: minDistance,
        routeTip: closestStop.distancesFromBuildings[currentBuilding.id]?.routeTip || '',
        urgency,
        isCustomDestination: false,
      };
    }

    // Recommendation for selected destination
    const targetStop = busStops.find((s) => s.id === selectedDestination.recommendedStopId) || busStops[0];
    const distanceMeters = targetStop.distancesFromBuildings[currentBuilding.id]?.distanceMeters ?? 150;
    const routeTip = targetStop.distancesFromBuildings[currentBuilding.id]?.routeTip || '';

    // Find the soonest matching bus service for this destination
    const matchingServices = targetStop.services.filter((s) =>
      selectedDestination.busServices.includes(s.serviceNo)
    );

    let bestService = matchingServices[0] || targetStop.services[0];
    let minSeconds = 99999;

    for (const svc of matchingServices) {
      if (svc.nextBus.secondsRemaining < minSeconds && svc.nextBus.secondsRemaining >= 0) {
        minSeconds = svc.nextBus.secondsRemaining;
        bestService = svc;
      }
    }

    const urgency = calculateUrgency(
      bestService.nextBus.secondsRemaining,
      distanceMeters,
      currentSpeed
    );

    return {
      stop: targetStop,
      service: bestService,
      distanceMeters,
      routeTip,
      urgency,
      isCustomDestination: true,
    };
  }, [selectedDestination, busStops, currentBuilding, currentSpeed]);

  // Quick preset destinations for fast 1-click query
  const quickPresets = [
    { label: '🛍️ Orchard / Somerset', id: 'orchard' },
    { label: '💼 CBD / Raffles Pl', id: 'cbd_raffles' },
    { label: '🍜 Bugis / Haji Lane', id: 'bugis' },
    { label: '🏮 Chinatown', id: 'chinatown' },
    { label: '🍛 Little India', id: 'little_india' },
    { label: '✈️ Changi Airport', id: 'airport' },
    { label: '🌳 Clementi / West', id: 'clementi' },
    { label: '🏙️ Toa Payoh', id: 'toa_payoh' },
  ];

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-4 lg:p-6 transition-all">
      <div className="max-w-[1920px] mx-auto space-y-4">
        
        {/* Controls Row: Current Building + Destination Finder + Walk Speed */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          
          {/* 1. Current Lobby Selector (4 cols) */}
          <div className="md:col-span-4 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="building-select" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                1. Your Current SMU Lobby
              </label>
              <select
                id="building-select"
                value={currentBuilding.id}
                onChange={(e) => {
                  const b = SMU_BUILDINGS.find((item) => item.id === e.target.value);
                  if (b) onSelectBuilding(b);
                }}
                className="w-full bg-transparent text-sm font-bold text-white border-none focus:outline-none focus:ring-0 cursor-pointer truncate pr-2 py-0.5"
              >
                {SMU_BUILDINGS.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white py-1">
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Destination Search & Finder (5 cols) */}
          <div className="md:col-span-5 relative">
            <div className="bg-slate-950/70 border border-slate-800 focus-within:border-indigo-500/80 rounded-xl p-2.5 flex items-center gap-2.5 transition-colors">
              <Search className="w-5 h-5 text-slate-400 shrink-0 ml-1" />
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  2. Where Are You Heading?
                </span>
                <input
                  type="text"
                  placeholder="Type destination, MRT, or bus no. (e.g. Orchard, Airport, 190, Bugis)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="w-full bg-transparent text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none py-0.5"
                />
              </div>
              {selectedDestination && (
                <button
                  onClick={() => {
                    onSelectDestination(null);
                    setSearchQuery('');
                  }}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
                  title="Clear destination filter"
                  aria-label="Clear destination filter"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {isSearchFocused && filteredDestinations.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-800"
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              >
                {filteredDestinations.map((dest) => (
                  <button
                    key={dest.id}
                    onMouseDown={() => {
                      onSelectDestination(dest);
                      setSearchQuery(dest.destinationName);
                      setIsSearchFocused(false);
                      onFocusStop(dest.recommendedStopId);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-950/50 flex items-center justify-between transition-colors group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white group-hover:text-indigo-300">
                        {dest.destinationName}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Buses: <strong>{dest.busServices.join(', ')}</strong></span>
                        <span>·</span>
                        <span>~{dest.estimatedTravelTimeMins} mins</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono px-2 py-1 bg-slate-800 rounded text-slate-300 group-hover:bg-indigo-600 group-hover:text-white">
                      Stop {dest.recommendedStopId}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Walking Pace Selector (3 cols) */}
          <div className="md:col-span-3 bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
            <Gauge className="w-5 h-5 text-amber-400 shrink-0 ml-1" />
            <div className="flex-1 min-w-0">
              <label htmlFor="pace-select" className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                3. Walking Pace
              </label>
              <select
                id="pace-select"
                value={currentSpeed.id}
                onChange={(e) => {
                  const sp = SPEED_PROFILES[e.target.value as keyof typeof SPEED_PROFILES];
                  if (sp) onSelectSpeed(sp);
                }}
                className="w-full bg-transparent text-sm font-bold text-white border-none focus:outline-none focus:ring-0 cursor-pointer truncate py-0.5"
              >
                {Object.values(SPEED_PROFILES).map((sp) => (
                  <option key={sp.id} value={sp.id} className="bg-slate-900 text-white">
                    {sp.label} ({sp.metersPerMinute}m/min)
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Quick Destination Buttons Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 shrink-0 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Popular:
          </span>
          {quickPresets.map((preset) => {
            const isSelected = selectedDestination?.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  if (isSelected) {
                    onSelectDestination(null);
                    setSearchQuery('');
                  } else {
                    const found = DESTINATIONS_DIRECTORY.find((d) => d.id === preset.id);
                    if (found) {
                      onSelectDestination(found);
                      setSearchQuery(found.destinationName);
                      onFocusStop(found.recommendedStopId);
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
              >
                <span>{preset.label}</span>
              </button>
            );
          })}
          {selectedDestination && (
            <button
              onClick={() => {
                onSelectDestination(null);
                setSearchQuery('');
              }}
              className="text-xs text-rose-400 hover:text-rose-300 underline font-medium px-2 py-1 ml-auto whitespace-nowrap shrink-0"
            >
              Reset to All Buses
            </button>
          )}
        </div>

        {/* THE ANSWER BANNER: "WHICH BUS STOP DO WE GO TO & DO WE NEED TO RUN?" */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/90 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 shadow-xl p-4 lg:p-5">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            
            {/* Left: Recommended Bus Stop Target (5 cols) */}
            <div className="lg:col-span-5 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-3 lg:pb-0 lg:pr-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  {recommendation.isCustomDestination ? `Destination: ${selectedDestination?.destinationName}` : 'Nearest Departure Stop'}
                </span>
              </div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">
                  {recommendation.stop.name}
                </h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/40">
                  Stop {recommendation.stop.id}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                <span>{recommendation.stop.roadName}</span>
                <span className="text-slate-600">·</span>
                <span>Distance: <strong className="text-white font-mono">{recommendation.distanceMeters}m</strong> (~{recommendation.urgency.walkTimeMinutes.toFixed(1)}m walk)</span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400">{Math.round(recommendation.stop.shelteredRatio * 100)}% Sheltered</span>
              </p>
              <p className="text-[11px] text-slate-400 italic">
                Tip: {recommendation.routeTip}
              </p>
            </div>

            {/* Center: Next Bus Service & Countdown (3 cols) */}
            <div className="lg:col-span-3 space-y-1 border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-3 lg:pb-0 lg:pr-4">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Next Departing Service
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-1.5 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-mono font-black text-2xl rounded-xl shadow-md">
                  {recommendation.service.serviceNo}
                </div>
                <div>
                  <div className="font-mono text-2xl font-black text-white tabular-nums tracking-tight">
                    {formatArrivalSeconds(recommendation.service.nextBus.secondsRemaining).primary}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                    To {recommendation.service.destination}
                  </div>
                </div>
              </div>
              {recommendation.service.subsequentBus && (
                <div className="text-[11px] text-slate-400 font-mono pt-1">
                  Subsequent: {formatArrivalSeconds(recommendation.service.subsequentBus.secondsRemaining).primary}
                </div>
              )}
            </div>

            {/* Right: THE URGENCY VERDICT: "DO WE NEED TO RUN?" (4 cols) */}
            <div className="lg:col-span-4 flex items-center gap-4">
              <div className={`p-3 rounded-2xl flex items-center justify-center shrink-0 ${
                recommendation.urgency.level === 'SPRINT'
                  ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/50 animate-pulse'
                  : recommendation.urgency.level === 'WALK_NOW'
                  ? 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40'
                  : recommendation.urgency.level === 'MISSED'
                  ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
              }`}>
                {recommendation.urgency.level === 'SPRINT' && <Zap className="w-8 h-8" />}
                {recommendation.urgency.level === 'WALK_NOW' && <Footprints className="w-8 h-8" />}
                {recommendation.urgency.level === 'SAFE' && <CheckCircle2 className="w-8 h-8" />}
                {recommendation.urgency.level === 'MISSED' && <XCircle className="w-8 h-8" />}
              </div>

              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Run vs Walk Verdict
                </div>
                <div className={`text-lg lg:text-xl font-black tracking-tight ${recommendation.urgency.textColor}`}>
                  {recommendation.urgency.label}
                </div>
                <div className="text-xs font-medium text-slate-200">
                  {recommendation.urgency.actionText}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Buffer:{' '}
                  <span className={recommendation.urgency.timeDiffMinutes < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {recommendation.urgency.timeDiffMinutes >= 0 ? '+' : ''}
                    {recommendation.urgency.timeDiffMinutes.toFixed(1)} mins
                  </span>{' '}
                  (Walk: {recommendation.urgency.walkTimeMinutes.toFixed(1)}m · Bus in: {(recommendation.urgency.busArrivalSeconds / 60).toFixed(1)}m)
                </div>
              </div>

              <button
                onClick={() => onFocusStop(recommendation.stop.id)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors shrink-0 hidden sm:block border border-slate-700"
              >
                Jump to Stop
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
