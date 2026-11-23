import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="min-h-[52px] px-5 py-3 rounded-xl bg-[#24372C]/95 hover:bg-[#2F4739] border border-[#4B6B57] text-[#FCE4B0] font-medium text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <Download className="w-4 h-4" />
        Install on Phone
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[52px] px-5 py-3 rounded-xl bg-[#24372C]/95 hover:bg-[#2F4739] border border-[#4B6B57] text-[#FCE4B0] font-medium text-sm sm:text-base flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          Add to Home Screen
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D1611]/82 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Install on iPhone or iPad"
          >
            <div className="w-full max-w-sm rounded-2xl bg-[#1B2A21] border border-[#3D5546] p-5 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-[Fraunces,Georgia,serif] text-lg font-bold text-[#FFFDF6]">
                  Play as a Mobile App
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-[#24372C] text-[#F9F6EE] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2.5 text-sm text-[#EAE3D2] list-decimal list-inside">
                <li>
                  Tap the <span className="inline-flex items-center gap-1 font-semibold text-[#FCE4B0]"><Share className="w-3.5 h-3.5" /> Share</span> button in Safari.
                </li>
                <li>
                  Scroll down and tap <strong className="text-[#FFFDF6]">Add to Home Screen</strong>.
                </li>
                <li>
                  Launch <strong className="text-[#FFFDF6]">Nine Paws</strong> from your home screen in full-screen mode.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-[#E66C5A] hover:bg-[#D75A48] text-white text-sm font-semibold cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-[#2B3E31] border border-[#F2B84B] px-3 py-1.5 text-xs font-medium text-[#FCE4B0] shadow-lg pointer-events-none">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Playing from cached files</span>
    </div>
  );
};
