import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BusStop,
  SMUBuilding,
  SpeedConfig,
  DestinationRoute
} from './types/transit';
import {
  SMU_BUILDINGS,
  INITIAL_BUS_STOPS,
  SPEED_PROFILES,
  DESTINATIONS_DIRECTORY
} from './data/smuTransitData';
import {
  tickBusArrivals,
  playLobbyAlertChime,
  calculateUrgency
} from './utils/transitEngine';
import {
  checkLtaHealth,
  fetchLiveBusArrivals,
  mergeLtaArrivals
} from './services/ltaClient';
import { usePWAInstall } from './hooks/usePWAInstall';
import { LobbyHeader } from './components/LobbyHeader';
import { CampusDecisionBar } from './components/CampusDecisionBar';
import { BusStopColumn } from './components/BusStopColumn';
import { CampusTransitMap } from './components/CampusTransitMap';
import { PWAInstallButton } from './components/PWAInstallButton';
import {
  Bus,
  Zap,
  Footprints,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  MapPin,
  RefreshCw,
  Smartphone,
  Compass,
  Map,
  X
} from 'lucide-react';

export default function App() {
  const [busStops, setBusStops] = useState<BusStop[]>(INITIAL_BUS_STOPS);
  const [currentBuilding, setCurrentBuilding] = useState<SMUBuilding>(SMU_BUILDINGS[0]); // Default LKS Library
  const [currentSpeed, setCurrentSpeed] = useState<SpeedConfig>(SPEED_PROFILES.NORMAL);
  const [selectedDestination, setSelectedDestination] = useState<DestinationRoute | null>(null);
  const [selectedBusServiceFilter, setSelectedBusServiceFilter] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string>(INITIAL_BUS_STOPS[0].id);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [autoRefreshInterval] = useState<number>(20); // 20s cycle
  const [ltaConfigured, setLtaConfigured] = useState<boolean>(false);
  
  // Mobile specific states
  const [mobileActiveTab, setMobileActiveTab] = useState<'stops' | 'decision' | 'map'>('stops');
  const [showMobileInstallBanner, setShowMobileInstallBanner] = useState<boolean>(true);
  const { isInstalled, isMobile } = usePWAInstall();

  // Check LTA backend health & API key configuration on mount
  useEffect(() => {
    checkLtaHealth().then((health) => {
      if (health?.ltaKeyConfigured) {
        setLtaConfigured(true);
      }
    });
  }, []);

  // Track previous sprint alert to avoid spamming chimes
  const lastChimedBusRef = useRef<string | null>(null);

  // Function to refresh from live LTA backend if key is present
  const refreshFromLtaApi = useCallback(async () => {
    try {
      const results = await Promise.all(
        INITIAL_BUS_STOPS.map(async (stop) => {
          const ltaData = await fetchLiveBusArrivals(stop.id);
          if (ltaData?.Services && ltaData.Services.length > 0) {
            return {
              stopId: stop.id,
              services: ltaData.Services,
            };
          }
          return null;
        })
      );

      setBusStops((prevStops) =>
        prevStops.map((stop) => {
          const liveMatch = results.find((r) => r?.stopId === stop.id);
          if (liveMatch && liveMatch.services) {
            return {
              ...stop,
              services: mergeLtaArrivals(stop.services, liveMatch.services),
            };
          }
          return stop;
        })
      );
    } catch {
      // Fallback seamlessly to local simulation
    }
  }, []);

  // 1-second real-time arrival tick
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setBusStops((prevStops) => {
        const nextStops = tickBusArrivals(prevStops, 1);

        // Check if any bus for current building has entered SPRINT state
        if (soundEnabled) {
          for (const stop of nextStops) {
            const dist = stop.distancesFromBuildings[currentBuilding.id]?.distanceMeters ?? 150;
            for (const svc of stop.services) {
              const urg = calculateUrgency(svc.nextBus.secondsRemaining, dist, currentSpeed);
              if (urg.level === 'SPRINT' && lastChimedBusRef.current !== svc.serviceNo) {
                lastChimedBusRef.current = svc.serviceNo;
                playLobbyAlertChime('SPRINT');
                break;
              }
            }
          }
        }

        return nextStops;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, soundEnabled, currentBuilding, currentSpeed]);

  // Periodic 20-second LTA API refresh if configured
  useEffect(() => {
    if (!ltaConfigured || isPaused) return;

    refreshFromLtaApi();

    const interval = setInterval(() => {
      refreshFromLtaApi();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(interval);
  }, [ltaConfigured, isPaused, autoRefreshInterval, refreshFromLtaApi]);

  // Handle manual data refresh
  const handleManualRefresh = useCallback(() => {
    if (ltaConfigured) {
      refreshFromLtaApi();
    } else {
      setBusStops((prev) => tickBusArrivals(prev, 3));
    }
    if (soundEnabled) {
      playLobbyAlertChime('REFRESH');
    }
  }, [ltaConfigured, refreshFromLtaApi, soundEnabled]);

  // Handle scrolling or focusing on a specific bus stop
  const handleFocusStop = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
    const element = document.getElementById(`bus-stop-${stopId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, []);

  // Unique bus service numbers across all SMU stops for quick filter
  const allServiceNumbers = useMemo(() => {
    const set = new Set<string>();
    for (const stop of busStops) {
      for (const s of stop.services) {
        set.add(s.serviceNo);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [busStops]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300 pb-16 md:pb-0">
      
      {/* Mobile PWA Installation Banner (Dismissible) */}
      {!isInstalled && showMobileInstallBanner && (
        <div className="md:hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-b border-indigo-700/60 px-3.5 py-2 flex items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-bold text-white block">View as Phone App</span>
              <span className="text-[11px] text-slate-300">Add to home screen for 1-tap bus arrivals</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <PWAInstallButton compact={true} />
            <button
              onClick={() => setShowMobileInstallBanner(false)}
              className="p-1 text-slate-400 hover:text-white"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Lobby Signage Header */}
      <LobbyHeader
        autoRefreshInterval={autoRefreshInterval}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onManualRefresh={handleManualRefresh}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        showMap={showMap}
        onToggleMap={() => setShowMap(!showMap)}
        activeBuildingName={currentBuilding.name}
        ltaConfigured={ltaConfigured}
      />

      {/* 2. Decision Bar: "Which bus stop do we go to & do we need to run?" */}
      {/* On mobile, only shown when in 'decision' tab or above the stops */}
      <div className={`${mobileActiveTab === 'map' ? 'hidden md:block' : ''}`}>
        <CampusDecisionBar
          currentBuilding={currentBuilding}
          onSelectBuilding={(b) => setCurrentBuilding(b)}
          currentSpeed={currentSpeed}
          onSelectSpeed={(s) => setCurrentSpeed(s)}
          selectedDestination={selectedDestination}
          onSelectDestination={(d) => {
            setSelectedDestination(d);
            if (d) {
              handleFocusStop(d.recommendedStopId);
            }
          }}
          busStops={busStops}
          onFocusStop={handleFocusStop}
        />
      </div>

      {/* Interactive Map Drawer (Desktop Collapsible or Mobile Map Tab) */}
      {(showMap || mobileActiveTab === 'map') && (
        <div className="px-4 lg:px-6 pt-4 max-w-[1920px] mx-auto w-full transition-all">
          <CampusTransitMap
            currentBuilding={currentBuilding}
            onSelectBuilding={(b) => setCurrentBuilding(b)}
            busStops={busStops}
            selectedStopId={selectedStopId}
            onSelectStop={(stopId) => {
              handleFocusStop(stopId);
              if (mobileActiveTab === 'map') {
                setMobileActiveTab('stops');
              }
            }}
            currentSpeed={currentSpeed}
            selectedDestination={selectedDestination}
            onClose={() => {
              setShowMap(false);
              if (mobileActiveTab === 'map') {
                setMobileActiveTab('stops');
              }
            }}
          />
        </div>
      )}

      {/* 3. Sub-bar: Stop Quick Navigation & Service Filter */}
      {mobileActiveTab !== 'map' && (
        <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 lg:px-6 py-2.5">
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            
            {/* Quick Jump to Bus Stop Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px] mr-1 flex items-center gap-1 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Stops:
              </span>
              {busStops.map((stop) => {
                const isSelected = selectedStopId === stop.id || selectedDestination?.recommendedStopId === stop.id;
                const dist = stop.distancesFromBuildings[currentBuilding.id]?.distanceMeters ?? 100;
                const walkMins = (dist / currentSpeed.metersPerMinute).toFixed(1);

                return (
                  <button
                    key={stop.id}
                    onClick={() => handleFocusStop(stop.id)}
                    className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 border min-h-[36px] ${
                      isSelected
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 font-bold'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="font-mono font-bold text-amber-400">{stop.id}</span>
                    <span className="hidden xl:inline">{stop.name.replace('SMU', '').trim() || stop.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({walkMins}m)</span>
                  </button>
                );
              })}
            </div>

            {/* Bus Service Quick Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Service:
              </span>
              {selectedBusServiceFilter && (
                <button
                  onClick={() => setSelectedBusServiceFilter(null)}
                  className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-medium shrink-0"
                >
                  Clear ({selectedBusServiceFilter}) ✕
                </button>
              )}
              <div className="flex items-center gap-1">
                {allServiceNumbers.slice(0, 10).map((svcNo) => (
                  <button
                    key={svcNo}
                    onClick={() =>
                      setSelectedBusServiceFilter(
                        selectedBusServiceFilter === svcNo ? null : svcNo
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-colors shrink-0 ${
                      selectedBusServiceFilter === svcNo
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {svcNo}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. MAIN LOBBY DISPLAY: Side-By-Side / Mobile-Optimized Columns */}
      {mobileActiveTab !== 'map' && (
        <main className="flex-1 p-3 md:p-6 overflow-x-auto">
          <div className="max-w-[1920px] mx-auto">
            
            <div className="flex items-stretch gap-4 pb-6 min-w-max md:min-w-max">
              {busStops.map((stop) => {
                const isRecommended = selectedDestination?.recommendedStopId === stop.id;

                const displayStop = selectedBusServiceFilter
                  ? {
                      ...stop,
                      services: stop.services.filter(
                        (s) => s.serviceNo === selectedBusServiceFilter
                      ),
                    }
                  : stop;

                return (
                  <div key={stop.id} className="w-[88vw] sm:w-[380px] md:w-[380px] shrink-0">
                    <BusStopColumn
                      stop={displayStop}
                      currentBuilding={currentBuilding}
                      currentSpeed={currentSpeed}
                      selectedDestination={selectedDestination}
                      isRecommendedStop={isRecommended}
                      onSelectService={(svcNo) => {
                        setSelectedBusServiceFilter(
                          selectedBusServiceFilter === svcNo ? null : svcNo
                        );
                      }}
                    />
                  </div>
                );
              })}
            </div>

          </div>
        </main>
      )}

      {/* 5. Mobile Phone Bottom Navigation Bar (Fixed for Mobile Phone Viewport) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-4 py-2 flex items-center justify-around safe-area-bottom">
        <button
          onClick={() => {
            setMobileActiveTab('stops');
            setShowMap(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            mobileActiveTab === 'stops'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bus className="w-5 h-5" />
          <span>Stops</span>
        </button>

        <button
          onClick={() => {
            setMobileActiveTab('decision');
            setShowMap(false);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            mobileActiveTab === 'decision'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>Run Calc</span>
        </button>

        <button
          onClick={() => {
            setMobileActiveTab('map');
            setShowMap(true);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors ${
            mobileActiveTab === 'map'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Map className="w-5 h-5" />
          <span>Map</span>
        </button>

        <button
          onClick={handleManualRefresh}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-xs text-slate-400 hover:text-white"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Refresh</span>
        </button>
      </nav>

      {/* 6. Clean Lobby Screen Footer (Desktop) */}
      <footer className="hidden md:block bg-slate-950 border-t border-slate-800/80 px-4 lg:px-6 py-3 text-xs text-slate-400 mt-auto">
        <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-200">SMU Campus Transit Display</span>
            <span className="text-slate-600">·</span>
            <span>Real-time LTA Bus Data feeds for Singapore Management University</span>
            <span className="text-slate-600">·</span>
            <span className="text-emerald-400 font-mono">6 Stops Monitored</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Walking distance calculated from <strong>{currentBuilding.name}</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">Auto-refresh every 20s</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
