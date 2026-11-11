import {
  BusStop,
  UrgencyCalculation,
  UrgencyLevel,
  SpeedConfig,
  DestinationRoute
} from '../types/transit';
import { DESTINATIONS_DIRECTORY } from '../data/smuTransitData';

/**
 * Calculates whether a commuter needs to run, walk promptly, or can walk relaxed.
 */
export function calculateUrgency(
  busSecondsRemaining: number,
  walkDistanceMeters: number,
  speedConfig: SpeedConfig,
  weatherDelayMinutes: number = 0
): UrgencyCalculation {
  const walkTimeMinutes = walkDistanceMeters / speedConfig.metersPerMinute + weatherDelayMinutes;
  const walkTimeSeconds = Math.round(walkTimeMinutes * 60);
  const busArrivalMinutes = busSecondsRemaining / 60;
  const timeDiffMinutes = busArrivalMinutes - walkTimeMinutes;

  let level: UrgencyLevel = 'SAFE';
  let label = 'Safe Walk';
  let actionText = 'Plenty of time. Walk relaxed.';
  let badgeColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
  let textColor = 'text-emerald-400';
  let icon = 'CheckCircle2';

  if (timeDiffMinutes < -0.3) {
    // Bus will depart before user can physically reach even at normal pace
    level = 'MISSED';
    label = 'Missed / Catch Next';
    actionText = 'Too late to catch. Wait for subsequent bus.';
    badgeColor = 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
    textColor = 'text-rose-400';
    icon = 'XCircle';
  } else if (timeDiffMinutes < 1.0) {
    // Within 1 minute buffer: Commuter must sprint!
    level = 'SPRINT';
    label = 'RUN FOR IT!';
    actionText = 'Sprint now! Bus is arriving almost as you reach!';
    badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse';
    textColor = 'text-amber-300';
    icon = 'Zap';
  } else if (timeDiffMinutes < 3.0) {
    // 1 to 3 minute buffer: Leave right away at brisk pace
    level = 'WALK_NOW';
    label = 'Walk Promptly';
    actionText = 'Leave lobby now. Steady walk to catch.';
    badgeColor = 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
    textColor = 'text-sky-300';
    icon = 'Footprints';
  } else {
    // 3+ minute buffer: Relaxed
    level = 'SAFE';
    label = 'Relaxed Walk';
    actionText = 'Comfortable timing. Stroll safely.';
    badgeColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    textColor = 'text-emerald-400';
    icon = 'CheckCircle2';
  }

  return {
    level,
    label,
    actionText,
    timeDiffMinutes,
    walkTimeMinutes,
    busArrivalMinutes,
    busArrivalSeconds: busSecondsRemaining,
    walkTimeSeconds,
    badgeColor,
    textColor,
    icon,
  };
}

/**
 * Format remaining seconds into clean tabular display (e.g. "Arr", "1m", "4m 20s")
 */
export function formatArrivalSeconds(seconds: number): { primary: string; secondary?: string; isArr: boolean } {
  if (seconds <= 20) {
    return { primary: 'Arr', secondary: 'Arriving', isArr: true };
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return { primary: `${secs}s`, secondary: 'seconds away', isArr: false };
  }
  if (mins < 3) {
    return { primary: `${mins}m ${secs < 10 ? '0' : ''}${secs}s`, secondary: `${mins} min`, isArr: false };
  }
  return { primary: `${mins}m`, secondary: `${mins} mins`, isArr: false };
}

/**
 * Audio chime using Web Audio API for lobby notifications
 */
let audioCtx: AudioContext | null = null;

export function playLobbyAlertChime(urgency: 'SPRINT' | 'WALK_NOW' | 'REFRESH') {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      audioCtx = new AudioCtxClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (urgency === 'SPRINT') {
      // Rapid high-pitch double beep
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (urgency === 'WALK_NOW') {
      // Pleasant transit gong
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.2); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Soft tick
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Searches destinations and bus routes
 */
export function searchDestinations(query: string): DestinationRoute[] {
  if (!query.trim()) return DESTINATIONS_DIRECTORY;
  const q = query.toLowerCase().trim();
  return DESTINATIONS_DIRECTORY.filter(
    (d) =>
      d.destinationName.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.region.toLowerCase().includes(q) ||
      d.busServices.some((s) => s.toLowerCase().includes(q))
  );
}

/**
 * Decrement bus arrivals by N seconds and spawn realistic replacements
 */
export function tickBusArrivals(stops: BusStop[], deltaSeconds: number = 1): BusStop[] {
  return stops.map((stop) => ({
    ...stop,
    services: stop.services.map((service) => {
      let nextSec = service.nextBus.secondsRemaining - deltaSeconds;
      let subSec = service.subsequentBus ? service.subsequentBus.secondsRemaining - deltaSeconds : undefined;
      let thirdSec = service.thirdBus ? service.thirdBus.secondsRemaining - deltaSeconds : undefined;

      // When the first bus departs (after being <= -15s)
      if (nextSec < -15) {
        if (service.subsequentBus) {
          nextSec = Math.max(0, subSec ?? 300);
          subSec = thirdSec ?? Math.floor(Math.random() * 300 + 480);
          thirdSec = Math.floor(Math.random() * 360 + 900);
        } else {
          nextSec = Math.floor(Math.random() * 360 + 420);
        }
      }

      return {
        ...service,
        nextBus: {
          ...service.nextBus,
          secondsRemaining: nextSec,
          estimatedArrival: new Date(Date.now() + nextSec * 1000),
        },
        subsequentBus: service.subsequentBus
          ? {
              ...service.subsequentBus,
              secondsRemaining: subSec ?? 480,
              estimatedArrival: new Date(Date.now() + (subSec ?? 480) * 1000),
            }
          : undefined,
        thirdBus: service.thirdBus
          ? {
              ...service.thirdBus,
              secondsRemaining: thirdSec ?? 960,
              estimatedArrival: new Date(Date.now() + (thirdSec ?? 960) * 1000),
            }
          : undefined,
      };
    }),
  }));
}
