import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed and opened in standalone mode, show subtle indicator or hide
  if (isInstalled) {
    if (compact) return null;
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono">
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installed as Phone App</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-md shadow-blue-950/40 transition-all cursor-pointer ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
        title="Install SMU Transit as an app on your phone"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="font-semibold">Install App</span>
      </button>
    );
  }

  // Generic mobile / iOS flow
  return (
    <>
      <button
        onClick={() => setShowIOSModal(true)}
        className={`flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
        title="How to view as an app on your phone"
      >
        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-medium">Get Phone App</span>
      </button>

      {/* Guided Mobile Installation Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-5 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-blue-600 flex items-center justify-center text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    View as an App on Your Phone
                  </h3>
                  <p className="text-xs text-slate-400">
                    Works offline, full-screen, no app store needed
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 text-xs text-slate-300">
              
              {/* iPhone / Safari */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span>🍎 On iPhone (Safari)</span>
                </div>
                <ol className="space-y-2 text-slate-300 pl-1 list-decimal list-inside">
                  <li>
                    Tap the <strong className="text-white">Share</strong> icon (
                    <Share className="w-3.5 h-3.5 inline text-blue-400" />
                    ) in Safari toolbar.
                  </li>
                  <li>
                    Scroll down and tap <strong className="text-amber-300">Add to Home Screen</strong> (
                    <PlusSquare className="w-3.5 h-3.5 inline text-amber-400" />
                    ).
                  </li>
                  <li>
                    Tap <strong className="text-white">Add</strong> in top right. The app will launch like a native mobile app!
                  </li>
                </ol>
              </div>

              {/* Android / Chrome */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span>🤖 On Android (Chrome)</span>
                </div>
                <p className="text-slate-300">
                  Tap the three dots (⋮) menu in Chrome and select <strong className="text-amber-300">"Install app"</strong> or <strong className="text-amber-300">"Add to Home screen"</strong>.
                </p>
              </div>

            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white text-xs shadow-md transition-colors"
            >
              Got it, close
            </button>

          </div>
        </div>
      )}
    </>
  );
}
