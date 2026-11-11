import { useState, useEffect } from 'react';
import {
  Clock,
  CloudSun,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RotateCw,
  MapPin,
  Map,
  Compass,
  Building2
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface LobbyHeaderProps {
  autoRefreshInterval: number; // in seconds, default 15
  isPaused: boolean;
  onTogglePause: () => void;
  onManualRefresh: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  showMap: boolean;
  onToggleMap: () => void;
  activeBuildingName: string;
  ltaConfigured: boolean;
}

export function LobbyHeader({
  autoRefreshInterval,
  isPaused,
  onTogglePause,
  onManualRefresh,
  soundEnabled,
  onToggleSound,
  showMap,
  onToggleMap,
  activeBuildingName,
  ltaConfigured
}: LobbyHeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(autoRefreshInterval);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKeyGuide, setShowKeyGuide] = useState(false);

  // Update real-time clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown timer for auto-refresh
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          onManualRefresh();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, autoRefreshInterval, onManualRefresh]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Format date: e.g. "Tuesday, 10 Nov 2026"
  const formattedDate = currentTime.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Format time with seconds in tabular format
  const formattedTime = currentTime.toLocaleTimeString('en-SG', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-3 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 max-w-[1920px] mx-auto">
        
        {/* Brand & Campus Zone */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-950/50 ring-1 ring-white/10 shrink-0">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base lg:text-lg">
                  SMU Transit Lobby
                </span>
                
                {ltaConfigured ? (
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LTA DataMall v3 Live
                  </span>
                ) : (
                  <button
                    onClick={() => setShowKeyGuide(!showKeyGuide)}
                    className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Click for LTA AccountKey setup guide"
                  >
                    <span>LTA Feed (Local Sim)</span>
                    <span className="text-[9px] underline">Set Key</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Station: <strong className="text-slate-200 font-medium">{activeBuildingName}</strong></span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400 hidden sm:inline">Bras Basah & Stamford Perimeter</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal/Tooltip Guide for LTA API Key */}
        {showKeyGuide && !ltaConfigured && (
          <div className="absolute top-16 left-6 z-50 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-2xl max-w-md text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between font-bold text-white text-sm">
              <span>LTA DataMall v3 Connection</span>
              <button onClick={() => setShowKeyGuide(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p>
              Your serverless endpoint is ready at <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">/api/nextbus?BusStopCode=83139</code> and <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded">/api/health</code>.
            </p>
            <p>
              To stream directly from LTA Datamall, add your key to <code className="text-blue-300">.env</code>:
            </p>
            <pre className="bg-slate-950 p-2 rounded text-slate-200 font-mono text-[11px] overflow-x-auto">
              LTA_DATAMALL_ACCOUNT_KEY="your_key_here"
            </pre>
            <p className="text-slate-400 text-[11px]">
              No key hardcoded. The app automatically runs realistic SMU bus schedules when no key is set.
            </p>
          </div>
        )}

        {/* Center: Live Weather & Underpass Status */}
        <div className="hidden xl:flex items-center gap-6 text-xs text-slate-300 bg-slate-900/60 rounded-lg px-3.5 py-1.5 border border-slate-800">
          <div className="flex items-center gap-2">
            <CloudSun className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Bras Basah <strong>29°C</strong></span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Fair / Dry</span>
          </div>
          <div className="h-3.5 w-px bg-slate-800" />
          <div className="flex items-center gap-1.5 text-slate-300">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Underground Concourse: <span className="text-emerald-400 font-medium">All Links Open</span></span>
          </div>
        </div>

        {/* Right: Clock & Signage Controls */}
        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
          
          {/* Refresh status */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={onManualRefresh}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh departures now"
              aria-label="Refresh departures now"
            >
              <RotateCw className="w-3.5 h-3.5 text-slate-300" />
            </button>
            <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
              {isPaused ? (
                <span className="text-amber-400 font-medium">Paused</span>
              ) : (
                <>Refresh in <span className="text-slate-200 font-semibold">{secondsUntilRefresh}s</span></>
              )}
            </span>
            <button
              onClick={onTogglePause}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-200 underline ml-1"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>

          {/* In-App PWA Install Prompt for Phone */}
          <PWAInstallButton />

          {/* Sound Alert Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Urgency chime enabled' : 'Urgency chime muted'}
            aria-label="Toggle sound alerts"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline text-[11px]">Chimes</span>
          </button>

          {/* Campus Map Toggle */}
          <button
            onClick={onToggleMap}
            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 font-medium transition-colors ${
              showMap
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            aria-label="Toggle campus walk map"
          >
            <Map className="w-4 h-4 text-amber-400" />
            <span className="whitespace-nowrap hidden sm:inline">Campus Map</span>
          </button>

          {/* Fullscreen Kiosk Mode */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Toggle Lobby Kiosk Fullscreen"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Digital Signage Clock */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1 text-right shrink-0">
            <div className="flex items-center gap-1.5 justify-end">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-mono text-base lg:text-lg font-bold text-white tracking-wider tabular-nums">
                {formattedTime}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">
              {formattedDate} SGT
            </div>
          </div>

        </div>

      </div>
    </header>
  );
}
