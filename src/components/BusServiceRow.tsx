import { useState } from 'react';
import {
  BusService,
  SpeedConfig,
  SMUBuilding,
  UrgencyCalculation
} from '../types/transit';
import { calculateUrgency, formatArrivalSeconds } from '../utils/transitEngine';
import {
  Zap,
  Footprints,
  CheckCircle2,
  XCircle,
  Accessibility,
  Layers,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface BusServiceRowProps {
  service: BusService;
  walkingDistanceMeters: number;
  currentSpeed: SpeedConfig;
  currentBuilding: SMUBuilding;
  isDestinationMatch: boolean;
  onSelectService?: (serviceNo: string) => void;
}

export function BusServiceRow({
  service,
  walkingDistanceMeters,
  currentSpeed,
  currentBuilding,
  isDestinationMatch,
  onSelectService,
}: BusServiceRowProps) {
  const [showDetail, setShowDetail] = useState(false);

  // Compute run vs walk urgency for next bus
  const nextUrgency = calculateUrgency(
    service.nextBus.secondsRemaining,
    walkingDistanceMeters,
    currentSpeed
  );

  // Compute urgency for second bus as well (if you miss the first one, do you have a great second bus?)
  const subsequentUrgency = service.subsequentBus
    ? calculateUrgency(service.subsequentBus.secondsRemaining, walkingDistanceMeters, currentSpeed)
    : null;

  const nextFormatted = formatArrivalSeconds(service.nextBus.secondsRemaining);
  const subFormatted = service.subsequentBus
    ? formatArrivalSeconds(service.subsequentBus.secondsRemaining)
    : null;
  const thirdFormatted = service.thirdBus
    ? formatArrivalSeconds(service.thirdBus.secondsRemaining)
    : null;

  // LTA load color dot
  const getLoadBadge = (load: string) => {
    switch (load) {
      case 'SEATS_AVAILABLE':
        return {
          color: 'bg-emerald-500',
          title: 'Seats Available',
          text: 'Seats',
          textColor: 'text-emerald-400',
        };
      case 'STANDING_AVAILABLE':
        return {
          color: 'bg-amber-500',
          title: 'Standing Available',
          text: 'Standing',
          textColor: 'text-amber-400',
        };
      case 'LIMITED_STANDING':
        return {
          color: 'bg-rose-500',
          title: 'Limited Standing Room',
          text: 'Full',
          textColor: 'text-rose-400',
        };
      default:
        return {
          color: 'bg-slate-500',
          title: 'Normal Load',
          text: 'Normal',
          textColor: 'text-slate-400',
        };
    }
  };

  const nextLoad = getLoadBadge(service.nextBus.load);

  return (
    <div
      className={`border rounded-xl p-3 transition-all ${
        isDestinationMatch
          ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/30'
          : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Bus Service Number & Destination */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            onClick={() => onSelectService?.(service.serviceNo)}
            className={`w-14 h-11 rounded-lg flex items-center justify-center font-mono font-black text-xl shrink-0 cursor-pointer shadow-inner ${
              isDestinationMatch
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
          >
            {service.serviceNo}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100 truncate block">
                {service.destination}
              </span>
              {service.nextBus.type === 'DOUBLE' && (
                <span title="Double Decker Bus" className="text-[10px] font-mono uppercase px-1 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                  DD
                </span>
              )}
              {service.nextBus.type === 'BENDY' && (
                <span title="Bendy Bus" className="text-[10px] font-mono uppercase px-1 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                  Bendy
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
              <span>via {service.keyStopsVia.slice(0, 3).join(', ')}</span>
            </div>
          </div>
        </div>

        {/* Right: Arrival Timings & Urgency Badge */}
        <div className="flex items-center gap-2.5 shrink-0 text-right">
          
          {/* Next Bus Arrival */}
          <div className="min-w-[64px]">
            <div className="flex items-center justify-end gap-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${nextLoad.color}`}
                title={nextLoad.title}
              />
              <span
                className={`font-mono text-xl font-extrabold tabular-nums tracking-tight ${
                  nextFormatted.isArr
                    ? 'text-amber-400 animate-pulse'
                    : service.nextBus.secondsRemaining <= 180
                    ? 'text-white'
                    : 'text-slate-200'
                }`}
              >
                {nextFormatted.primary}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase">
              {nextLoad.text}
            </div>
          </div>

          {/* Subsequent Arrivals */}
          <div className="hidden sm:flex flex-col text-right font-mono text-xs text-slate-400 min-w-[50px] border-l border-slate-800/80 pl-2">
            {subFormatted ? (
              <span className="text-slate-300">{subFormatted.primary}</span>
            ) : (
              <span className="text-slate-600">-</span>
            )}
            {thirdFormatted ? (
              <span className="text-[10px] text-slate-500">{thirdFormatted.primary}</span>
            ) : null}
          </div>

          {/* RUN vs WALK Decision Pill */}
          <div className="shrink-0">
            <button
              onClick={() => setShowDetail(!showDetail)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${nextUrgency.badgeColor}`}
              title="Click to view walk time breakdown"
            >
              {nextUrgency.level === 'SPRINT' && <Zap className="w-3.5 h-3.5" />}
              {nextUrgency.level === 'WALK_NOW' && <Footprints className="w-3.5 h-3.5" />}
              {nextUrgency.level === 'SAFE' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {nextUrgency.level === 'MISSED' && <XCircle className="w-3.5 h-3.5" />}
              
              <span className="whitespace-nowrap">
                {nextUrgency.level === 'SPRINT'
                  ? 'RUN!'
                  : nextUrgency.level === 'WALK_NOW'
                  ? 'Walk Now'
                  : nextUrgency.level === 'SAFE'
                  ? 'Safe Walk'
                  : 'Missed'}
              </span>

              {showDetail ? (
                <ChevronUp className="w-3 h-3 opacity-60" />
              ) : (
                <ChevronDown className="w-3 h-3 opacity-60" />
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Expandable Run vs Walk Mathematical Breakdown */}
      {showDetail && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300 space-y-1.5 bg-slate-950/50 p-2.5 rounded-lg">
          <div className="flex items-center justify-between text-slate-400">
            <span>Walking from <strong>{currentBuilding.name}</strong>:</span>
            <span className="font-mono text-slate-200">
              {walkingDistanceMeters}m · ~{nextUrgency.walkTimeMinutes.toFixed(1)} mins @ {currentSpeed.label}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Next Bus ({service.serviceNo}) arrives in:</span>
            <span className="font-mono text-slate-200">
              {(nextUrgency.busArrivalSeconds / 60).toFixed(1)} mins ({Math.max(0, service.nextBus.secondsRemaining)}s)
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="font-semibold text-slate-300">Time Buffer / Margin:</span>
            <span
              className={`font-mono font-bold ${
                nextUrgency.timeDiffMinutes < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {nextUrgency.timeDiffMinutes >= 0 ? '+' : ''}
              {nextUrgency.timeDiffMinutes.toFixed(1)} minutes (
              {Math.round(nextUrgency.timeDiffMinutes * 60)}s)
            </span>
          </div>

          <div className="text-[11px] text-slate-400 pt-0.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{nextUrgency.actionText}</span>
          </div>

          {subsequentUrgency && (
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
              <span>Subsequent Bus ({subFormatted?.primary}):</span>
              <span className={`font-mono ${subsequentUrgency.textColor}`}>
                {subsequentUrgency.label} (+{subsequentUrgency.timeDiffMinutes.toFixed(1)}m buffer)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
