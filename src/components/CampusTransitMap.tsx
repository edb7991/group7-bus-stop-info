import { useState } from 'react';
import {
  SMUBuilding,
  BusStop,
  SpeedConfig,
  DestinationRoute
} from '../types/transit';
import { SMU_BUILDINGS } from '../data/smuTransitData';
import {
  MapPin,
  Navigation,
  Compass,
  Bus,
  Footprints,
  Umbrella,
  X,
  ExternalLink,
  Layers
} from 'lucide-react';

interface CampusTransitMapProps {
  currentBuilding: SMUBuilding;
  onSelectBuilding: (building: SMUBuilding) => void;
  busStops: BusStop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
  currentSpeed: SpeedConfig;
  selectedDestination: DestinationRoute | null;
  onClose?: () => void;
}

export function CampusTransitMap({
  currentBuilding,
  onSelectBuilding,
  busStops,
  selectedStopId,
  onSelectStop,
  currentSpeed,
  selectedDestination,
  onClose,
}: CampusTransitMapProps) {
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [hoveredStop, setHoveredStop] = useState<string | null>(null);

  // SVG dimensions
  const width = 1000;
  const height = 580;

  // Scale map coordinates (0-100) to SVG viewbox
  const mapX = (x: number) => (x / 100) * (width - 120) + 60;
  const mapY = (y: number) => (y / 100) * (height - 100) + 50;

  const currentCoords = {
    x: mapX(currentBuilding.coordinates.x),
    y: mapY(currentBuilding.coordinates.y),
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 lg:p-6 shadow-2xl relative overflow-hidden">
      
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
              Interactive Campus Spatial Map
            </span>
            <span className="text-xs text-slate-400">
              Click any building to change starting lobby
            </span>
          </div>
          <h2 className="text-lg lg:text-xl font-extrabold text-white tracking-tight mt-1">
            SMU Transit & Perimeter Bus Stops
          </h2>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-400/30 inline-block" />
            <span>Current Lobby: <strong>{currentBuilding.shortName}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
            <span>Bus Stop</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Close Map"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Interactive Campus SVG Canvas */}
      <div className="relative mt-4 bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
        
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          style={{ minHeight: '440px' }}
        >
          {/* Subtle Grid Pattern */}
          <defs>
            <pattern id="campus-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width={width} height={height} fill="#030712" />
          <rect width={width} height={height} fill="url(#campus-grid)" />

          {/* Major Roads */}
          {/* Bras Basah Road (Main Boulevard) */}
          <g id="road-bras-basah">
            <rect x="20" y="165" width={width - 40} height="52" fill="#111827" rx="6" />
            <line x1="30" y1="191" x2={width - 30} y2="191" stroke="#374151" strokeWidth="2" strokeDasharray="8 6" />
            <text x="70" y="196" fill="#9CA3AF" fontSize="12" fontWeight="700" letterSpacing="2" fontFamily="monospace">
              BRAS BASAH ROAD (EASTBOUND TO SUNTEC / BUGIS) ──▶
            </text>
          </g>

          {/* Stamford Road */}
          <g id="road-stamford">
            <rect x="20" y="380" width={width - 40} height="48" fill="#111827" rx="6" />
            <line x1="30" y1="404" x2={width - 30} y2="404" stroke="#374151" strokeWidth="2" strokeDasharray="8 6" />
            <text x="70" y="409" fill="#9CA3AF" fontSize="12" fontWeight="700" letterSpacing="2" fontFamily="monospace">
              ◀── STAMFORD ROAD (WESTBOUND TO ORCHARD / CHINATOWN)
            </text>
          </g>

          {/* Victoria Street */}
          <g id="road-victoria">
            <rect x="730" y="30" width="48" height={height - 60} fill="#111827" rx="6" />
            <line x1="754" y1="40" x2="754" y2={height - 40} stroke="#374151" strokeWidth="2" strokeDasharray="8 6" />
            <text
              x="748"
              y="110"
              fill="#9CA3AF"
              fontSize="11"
              fontWeight="700"
              fontFamily="monospace"
              transform="rotate(90 748, 110)"
              letterSpacing="2"
            >
              VICTORIA STREET ──▶
            </text>
          </g>

          {/* Bencoolen Street / Prinsep Link */}
          <g id="road-bencoolen">
            <rect x="180" y="30" width="44" height="280" fill="#111827" rx="6" />
            <line x1="202" y1="40" x2="202" y2="300" stroke="#374151" strokeWidth="2" strokeDasharray="8 6" />
            <text
              x="196"
              y="90"
              fill="#9CA3AF"
              fontSize="10"
              fontWeight="700"
              fontFamily="monospace"
              transform="rotate(90 196, 90)"
              letterSpacing="2"
            >
              BENCOOLEN ST ──▶
            </text>
          </g>

          {/* Armenian Street / Fort Canning Park */}
          <g id="road-armenian">
            <path d="M 60 480 L 220 380" stroke="#1f2937" strokeWidth="32" strokeLinecap="round" />
            <text x="70" y="450" fill="#6B7280" fontSize="10" fontWeight="600" fontFamily="sans-serif">
              ARMENIAN ST / FORT CANNING
            </text>
          </g>

          {/* SMU Underground Concourse Linkway (Subterranean spine connecting all schools) */}
          <g id="underground-concourse">
            <path
              d="M 180 280 L 480 280 L 730 280 M 350 280 L 350 370 M 480 220 L 480 370 M 610 220 L 610 370"
              fill="none"
              stroke="#2563EB"
              strokeWidth="6"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            <rect x="400" y="270" width="160" height="20" fill="#1e3a8a" rx="4" opacity="0.6" />
            <text x="480" y="284" fill="#93C5FD" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="monospace">
              🚇 SMU CONCOURSE & BRAS BASAH MRT
            </text>
          </g>

          {/* Walking Paths from current selected building to each bus stop */}
          {busStops.map((stop) => {
            const stopCoords = {
              x: mapX(stop.coordinates.x),
              y: mapY(stop.coordinates.y),
            };

            const walkInfo = stop.distancesFromBuildings[currentBuilding.id] || { distanceMeters: 100 };
            const walkMins = (walkInfo.distanceMeters / currentSpeed.metersPerMinute).toFixed(1);
            const isTarget = selectedDestination?.recommendedStopId === stop.id || selectedStopId === stop.id;

            const midX = (currentCoords.x + stopCoords.x) / 2;
            const midY = (currentCoords.y + stopCoords.y) / 2;

            return (
              <g key={`path-${stop.id}`} className="transition-opacity">
                {/* Walking Line */}
                <line
                  x1={currentCoords.x}
                  y1={currentCoords.y}
                  x2={stopCoords.x}
                  y2={stopCoords.y}
                  stroke={isTarget ? '#F59E0B' : '#38BDF8'}
                  strokeWidth={isTarget ? 3.5 : 2}
                  strokeDasharray={isTarget ? '6 4' : '4 4'}
                  opacity={isTarget ? 0.9 : 0.4}
                />

                {/* Walk Time Badge along path */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-32"
                    y="-11"
                    width="64"
                    height="22"
                    rx="11"
                    fill={isTarget ? '#78350F' : '#0F172A'}
                    stroke={isTarget ? '#F59E0B' : '#334155'}
                    strokeWidth="1.5"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={isTarget ? '#FEF08A' : '#94A3B8'}
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {walkMins}m ({walkInfo.distanceMeters}m)
                  </text>
                </g>
              </g>
            );
          })}

          {/* SMU Campus Buildings */}
          {SMU_BUILDINGS.filter((b) => b.id !== 'CONCOURSE').map((b) => {
            const bx = mapX(b.coordinates.x);
            const by = mapY(b.coordinates.y);
            const isSelected = currentBuilding.id === b.id;
            const isHovered = hoveredBuilding === b.id;

            return (
              <g
                key={b.id}
                transform={`translate(${bx - 55}, ${by - 28})`}
                onClick={() => onSelectBuilding(b)}
                onMouseEnter={() => setHoveredBuilding(b.id)}
                onMouseLeave={() => setHoveredBuilding(null)}
                className="cursor-pointer transition-transform"
              >
                {/* Building Box */}
                <rect
                  x="0"
                  y="0"
                  width="110"
                  height="56"
                  rx="10"
                  fill={isSelected ? '#1e3a8a' : isHovered ? '#1e293b' : '#0f172a'}
                  stroke={isSelected ? '#3b82f6' : isHovered ? '#64748b' : '#1e293b'}
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter={isSelected ? 'url(#glow-gold)' : undefined}
                />

                {/* Building Code Badge */}
                <rect
                  x="8"
                  y="8"
                  width="36"
                  height="16"
                  rx="4"
                  fill={isSelected ? '#2563eb' : '#1e293b'}
                />
                <text
                  x="26"
                  y="20"
                  fill={isSelected ? '#ffffff' : '#94a3b8'}
                  fontSize="9"
                  fontWeight="800"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {b.code}
                </text>

                {/* Building Name */}
                <text
                  x="8"
                  y="40"
                  fill={isSelected ? '#60a5fa' : '#e2e8f0'}
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="sans-serif"
                >
                  {b.shortName}
                </text>

                {isSelected && (
                  <circle cx="95" cy="18" r="5" fill="#3b82f6" />
                )}
              </g>
            );
          })}

          {/* Bus Stops (Gold Target Points) */}
          {busStops.map((stop) => {
            const sx = mapX(stop.coordinates.x);
            const sy = mapY(stop.coordinates.y);
            const isSelected = selectedStopId === stop.id;
            const isRecommended = selectedDestination?.recommendedStopId === stop.id;
            const isHovered = hoveredStop === stop.id;

            return (
              <g
                key={stop.id}
                transform={`translate(${sx}, ${sy})`}
                onClick={() => onSelectStop(stop.id)}
                onMouseEnter={() => setHoveredStop(stop.id)}
                onMouseLeave={() => setHoveredStop(null)}
                className="cursor-pointer"
              >
                {/* Pulse Ring if Recommended */}
                {isRecommended && (
                  <circle
                    cx="0"
                    cy="0"
                    r="24"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                    opacity="0.6"
                    className="animate-ping"
                  />
                )}

                {/* Stop Marker Pin */}
                <circle
                  cx="0"
                  cy="0"
                  r={isRecommended ? 18 : 15}
                  fill={isRecommended ? '#F59E0B' : '#1E293B'}
                  stroke={isRecommended ? '#FFFBEB' : '#475569'}
                  strokeWidth={isRecommended ? 3 : 2}
                  filter={isRecommended ? 'url(#glow-gold)' : undefined}
                />

                <text
                  x="0"
                  y="4"
                  fill={isRecommended ? '#020617' : '#F1F5F9'}
                  fontSize="9"
                  fontWeight="900"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {stop.id}
                </text>

                {/* Stop Label callout */}
                <g transform="translate(0, -22)">
                  <rect
                    x="-60"
                    y="-18"
                    width="120"
                    height="20"
                    rx="6"
                    fill="#020617"
                    stroke={isRecommended ? '#F59E0B' : '#334155'}
                    strokeWidth="1"
                    opacity="0.95"
                  />
                  <text
                    x="0"
                    y="-5"
                    textAnchor="middle"
                    fill={isRecommended ? '#FBBF24' : '#CBD5E1'}
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="sans-serif"
                  >
                    {stop.name.slice(0, 18)}
                  </text>
                </g>
              </g>
            );
          })}

        </svg>

      </div>

      {/* Campus Map Legend & Shortcuts */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Blue: Your SMU Lobby ({currentBuilding.shortName})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span>Amber: Surrounding Bus Stops</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-blue-400 inline-block" />
            <span>Dashed: Walking connection</span>
          </span>
        </div>

        <div className="text-[11px] text-slate-500">
          Tip: Tap any building above to test walk times from that location!
        </div>
      </div>

    </div>
  );
}
