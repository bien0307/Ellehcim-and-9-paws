import React, { useState } from 'react';
import { BookOpen, Play, Volume2, VolumeX, X } from 'lucide-react';
import { DOG_PROFILES } from '../game/types';
import { DogBadgeIcon } from './DogBadgeIcon';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  onStart: () => void;
  bestScore: number;
  muted: boolean;
  onToggleMute: () => void;
}

const FRONT_ARTWORK_SRC = '/assets/aistudio/media_1795456022768_daee5917_e741c640.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  bestScore,
  muted,
  onToggleMute,
}) => {
  const [showPackGuide, setShowPackGuide] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#131E17]">
      {/* Front Storybook Artwork: Ellehcim & Her Pack */}
      {!imageError ? (
        <img
          src={FRONT_ARTWORK_SRC}
          alt="Ellehcim kneeling on a sunlit forest trail overlooking a golden valley with her four dogs"
          referrerPolicy="no-referrer"
          decoding="async"
          fetchPriority="high"
          onError={() => setImageError(true)}
          className="pointer-events-none select-none absolute inset-x-0 top-0 h-[56dvh] w-full object-cover object-[68%_52%] sm:inset-0 sm:h-full sm:object-[64%_center]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#2B3E2E] via-[#1B2B21] to-[#131E17]"
        />
      )}

      {/* Measured contrast scrim on the left (desktop) & bottom transition (mobile) keeping Ellehcim & the dogs clear */}
      <div
        className="hidden sm:block pointer-events-none absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-[#131E17]/92 via-[#131E17]/60 to-transparent"
        aria-hidden="true"
      />
      <div
        className="sm:hidden pointer-events-none absolute inset-x-0 top-[34dvh] bottom-0 bg-gradient-to-t from-[#131E17] via-[#131E17]/95 via-48% to-transparent"
        aria-hidden="true"
      />

      {/* Top-right quiet audio toggle (lowered slightly from edge and enlarged for easy tapping) */}
      <div className="absolute top-[max(1.4rem,calc(env(safe-area-inset-top)+0.65rem))] right-[max(1rem,env(safe-area-inset-right))] z-20 flex items-center gap-3">
        {bestScore > 0 && (
          <span className="text-xs font-medium text-[#F5ECD9]/90 bg-[#19261E]/85 px-3.5 py-2.5 rounded-lg border border-[#3E5546] tabular-nums">
            Best Love: {bestScore}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-xl bg-[#19261E]/90 border border-[#3E5546] text-[#F9F6EE] hover:bg-[#24362B] active:scale-95 transition-all cursor-pointer"
        >
          {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      </div>

      {/* Left-third (desktop) / Lower-middle comfortable thumb zone (mobile) Title Lockup & Actions */}
      <div className="relative z-10 h-full overflow-y-auto flex flex-col justify-end sm:justify-center px-5 pb-[max(2.35rem,calc(env(safe-area-inset-bottom)+1.5rem))] pt-16 sm:px-12 md:px-16 max-w-2xl">
        {/* Bespoke inline SVG Title Lockup */}
        <svg
          viewBox="0 0 460 148"
          className="w-full max-w-[280px] sm:max-w-[420px] mb-2.5 sm:mb-4 drop-shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
          role="img"
          aria-label="Ellehcim and The Nine Paws"
        >
          {/* Decorative paw & sunbeam divider */}
          <g fill="#F2B84B">
            <circle cx="16" cy="24" r="4" />
            <circle cx="10" cy="14" r="2.2" />
            <circle cx="16" cy="12" r="2.2" />
            <circle cx="22" cy="14" r="2.2" />
          </g>
          <text
            x="32"
            y="24"
            fill="#F2B84B"
            fontSize="13"
            fontWeight="700"
            letterSpacing="2.4"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            VALLEY RESCUE ADVENTURE
          </text>
          <text
            x="4"
            y="74"
            fill="#FFFDF6"
            fontSize="50"
            fontWeight="700"
            fontFamily="Fraunces, Georgia, serif"
          >
            Ellehcim &amp;
          </text>
          <text
            x="4"
            y="122"
            fill="#FCE4B0"
            fontSize="42"
            fontWeight="700"
            fontFamily="Fraunces, Georgia, serif"
          >
            The Nine Paws
          </text>
          <path
            d="M6 138 Q 140 132 290 138"
            stroke="#E66C5A"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>

        <p className="text-xs sm:text-base text-[#EAE3D2] leading-relaxed max-w-md mb-4 sm:mb-6">
          Five of Ellehcim’s nine dogs scattered in the valley mist. Journey with Spotty, Spikey,
          Julie, and Potato—with Marcos and Chucha—to find Scoob, Stormy, Cloudy, Sunny, and Dang!
        </p>

        {/* Primary CTA + Secondary Field Guide */}
        <div className="flex flex-wrap items-center gap-3 mb-3.5 sm:mb-5">
          <button
            type="button"
            onClick={onStart}
            className="min-h-[56px] px-7 py-3.5 rounded-xl bg-[#E66C5A] hover:bg-[#D75A48] active:scale-[0.98] text-white font-semibold text-base sm:text-lg flex items-center gap-2.5 shadow-lg transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Rescue
          </button>

          <button
            type="button"
            onClick={() => setShowPackGuide(true)}
            className="min-h-[54px] px-6 py-3.5 rounded-xl bg-[#1F3026]/90 hover:bg-[#2A4033] active:scale-[0.98] border border-[#45604F] text-[#F9F6EE] font-medium text-sm sm:text-base flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-5 h-5 text-[#F2B84B]" />
            Meet the 9 Dogs
          </button>

          <PWAInstallButton />
        </div>

        {/* Single flat mobile control-hint line */}
        <p className="text-xs text-[#CFC7B4] tracking-wide">
          Drag Stick to Move · Tap Heart to Pet · Tap Bone to Feed · Sniff &amp; Dash
        </p>
      </div>

      {/* Meet the 9 Dogs Field Guide Modal */}
      {showPackGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0E1712]/80"
          role="dialog"
          aria-modal="true"
          aria-label="Meet Ellehcim and Her Nine Dogs"
        >
          <div className="w-full max-w-3xl max-h-[86dvh] flex flex-col rounded-2xl bg-[#1B2A21] border border-[#3D5546] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#314639]">
              <div>
                <h2 className="font-[Fraunces,Georgia,serif] text-xl font-bold text-[#FFFDF6]">
                  Ellehcim &amp; Her Nine Dogs
                </h2>
                <p className="text-xs text-[#C8C1B0] mt-0.5">
                  43-year-old rescuer · 4 companions at your side · 5 pups to bring home
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPackGuide(false)}
                aria-label="Close guide"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#24372C] hover:bg-[#314A3B] text-[#F9F6EE] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOG_PROFILES.map((dog) => (
                <div
                  key={dog.id}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl bg-[#22342A] border border-[#344B3D]"
                >
                  <div className="shrink-0 pt-0.5">
                    <DogBadgeIcon dog={dog} found={dog.startingCompanion} size={44} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#FFFDF6]">
                      <span>{dog.name}</span>
                      <span className="text-xs font-normal text-[#B9B2A2]">
                        · {dog.gender} {dog.ageGroup}
                      </span>
                    </div>
                    <p className="text-xs text-[#E4DDCB] mt-1 leading-relaxed">
                      {dog.description}
                    </p>
                    <p className="text-[11px] text-[#F2B84B] mt-1.5 font-medium">
                      {dog.startingCompanion ? 'With Ellehcim at start' : `Last seen: ${dog.rescueHint}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-[#314639] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPackGuide(false);
                  onStart();
                }}
                className="min-h-[52px] px-7 py-3 rounded-xl bg-[#E66C5A] hover:bg-[#D75A48] text-white font-semibold text-base cursor-pointer whitespace-nowrap"
              >
                Start Rescue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
