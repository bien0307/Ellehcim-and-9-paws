import React from 'react';
import { Heart, Play, RotateCcw, Sparkles, Trophy, Waves } from 'lucide-react';
import { CHUCHA_PROFILE, DOG_PROFILES, HudSnapshot } from '../game/types';
import { DogBadgeIcon } from './DogBadgeIcon';

interface GameModalsProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onAcceptMarcosHelp: () => void;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const GameModals: React.FC<GameModalsProps> = ({
  hud,
  onResume,
  onRestart,
  onReturnTitle,
  onAcceptMarcosHelp,
}) => {
  if (hud.gameState === 'STORY') {
    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0D1611]/82"
        role="dialog"
        aria-modal="true"
        aria-label="Meeting Marcos and Chucha at Golden Cove Beach"
      >
        <div className="w-full max-w-lg rounded-2xl bg-[#1B2A21] border border-[#3E5848] shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#304538] flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8FE3DB]">
                <Waves className="w-4 h-4" />
                <span>Golden Cove Beach</span>
              </div>
              <h2 className="font-[Fraunces,Georgia,serif] text-xl sm:text-2xl font-bold text-[#FFFDF6] mt-0.5">
                Ellehcim Meets Marcos &amp; Chucha
              </h2>
            </div>

            {/* Chucha Portrait SVG (White Girl Dog with Few Dark Spots) */}
            <svg width="52" height="52" viewBox="0 0 44 44" aria-label="Chucha">
              <circle cx="22" cy="22" r="20" fill="#23372B" stroke={CHUCHA_PROFILE.collarColor} strokeWidth="2" />
              <ellipse cx="13" cy="17" rx="3.8" ry="6" transform="rotate(20 13 17)" fill={CHUCHA_PROFILE.spotColor} stroke="#1B1512" strokeWidth="1.2" />
              <ellipse cx="31" cy="17" rx="3.8" ry="6" transform="rotate(-20 31 17)" fill={CHUCHA_PROFILE.coatColor} stroke="#1B1512" strokeWidth="1.2" />
              <circle cx="22" cy="23" r="9.5" fill={CHUCHA_PROFILE.coatColor} stroke="#1B1512" strokeWidth="1.3" />
              <circle cx="17.5" cy="18.5" r="2.6" fill={CHUCHA_PROFILE.spotColor} />
              <circle cx="27" cy="25" r="2.1" fill={CHUCHA_PROFILE.spotColor} />
              <circle cx="22" cy="25.5" r="2.2" fill={CHUCHA_PROFILE.noseColor} />
              <circle cx="18.5" cy="21.5" r="1.4" fill="#181412" />
              <circle cx="25.5" cy="21.5" r="1.4" fill="#181412" />
            </svg>
          </div>

          <div className="p-5 sm:p-6 space-y-3.5 text-sm leading-relaxed text-[#EAE3D2]">
            <div className="p-3.5 rounded-xl bg-[#22342A] border border-[#344B3D]">
              <div className="text-xs font-semibold text-[#8FE3DB] mb-1">Marcos · Beach Companion</div>
              <p>
                “Hey there! Chucha and I were just walking along the waves when we saw your pack.
                Are you searching the valley for more dogs?”
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#22342A] border border-[#344B3D]">
              <div className="text-xs font-semibold text-[#FCE4B0] mb-1">Ellehcim</div>
              <p>
                “Yes—I’m Ellehcim! Five of my nine dogs got separated in the mist.
                Could you and Chucha help us find the rest of my pups?”
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#22342A] border border-[#344B3D]">
              <div className="text-xs font-semibold text-[#8FE3DB] mb-1">Marcos &amp; Chucha</div>
              <p>
                “Of course! Chucha is a sharp white tracker—she’ll boost your Sniff Trail, uncover
                hidden treats across the valley, and help bring your dogs home.”
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#FCE4B0] pt-1">
              <Sparkles className="w-4 h-4 text-[#F2B84B] shrink-0" />
              <span>Team Bonus: +25 Warmth · +150 Love · All Treats Revealed · Faster Sniff Trail</span>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#304538] flex justify-end">
            <button
              type="button"
              onClick={onAcceptMarcosHelp}
              className="min-h-[52px] px-7 py-3 rounded-xl bg-[#3B9B94] hover:bg-[#31857F] text-white font-semibold text-base flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Heart className="w-5 h-5 fill-white" />
              Ask for Help &amp; Team Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hud.gameState !== 'PAUSED' && hud.gameState !== 'VICTORY' && hud.gameState !== 'GAME_OVER') {
    return null;
  }

  const rescuedSet = new Set(hud.rescuedIds);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#0D1611]/82"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl max-h-[90dvh] flex flex-col rounded-2xl bg-[#1B2A21] border border-[#3E5848] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#304538] flex items-center justify-between gap-3">
          <div>
            {hud.gameState === 'PAUSED' && (
              <>
                <h2 className="font-[Fraunces,Georgia,serif] text-2xl font-bold text-[#FFFDF6]">
                  Trail Paused
                </h2>
                <p className="text-xs text-[#CFC7B4] mt-1">
                  {hud.rescuedIds.length}/9 dogs with Ellehcim · {hud.activeZoneName}
                </p>
              </>
            )}
            {hud.gameState === 'VICTORY' && (
              <>
                <div className="flex items-center gap-2 text-[#F2B84B] text-xs font-bold uppercase tracking-wider mb-1">
                  <Trophy className="w-4 h-4" />
                  All Nine Paws Reunited
                </div>
                <h2 className="font-[Fraunces,Georgia,serif] text-2xl font-bold text-[#FFFDF6]">
                  Pack Complete!
                </h2>
              </>
            )}
            {hud.gameState === 'GAME_OVER' && (
              <>
                <h2 className="font-[Fraunces,Georgia,serif] text-2xl font-bold text-[#FFB4A8]">
                  Resting in the Mist
                </h2>
                <p className="text-xs text-[#CFC7B4] mt-1">
                  Ellehcim and her pups ran out of warmth—ready to try the rescue trail again!
                </p>
              </>
            )}
          </div>

          <div className="text-right">
            <div className="text-[11px] text-[#C8C1B0]">Love Score</div>
            <div className="text-xl font-bold text-[#FCE4B0] tabular-nums">{hud.lovePoints}</div>
          </div>
        </div>

        {/* Summary Stats & Pack Progress */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-[#22342A] border border-[#344B3D]">
              <div className="text-[11px] text-[#B9B2A2]">Dogs Reunited</div>
              <div className="text-lg font-bold text-[#FFFDF6] tabular-nums mt-0.5">
                {hud.rescuedIds.length}/9
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#22342A] border border-[#344B3D]">
              <div className="text-[11px] text-[#B9B2A2]">Flowers &amp; Critters</div>
              <div className="text-lg font-bold text-[#FFFDF6] tabular-nums mt-0.5">
                {hud.flowersBloomed + hud.crittersBefriended}/
                {hud.totalFlowers + hud.totalCritters}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#22342A] border border-[#344B3D]">
              <div className="text-[11px] text-[#B9B2A2]">Trail Time</div>
              <div className="text-lg font-bold text-[#FFFDF6] tabular-nums mt-0.5">
                {formatTime(hud.elapsedSeconds)}
              </div>
            </div>
          </div>

          {hud.isNewBest && hud.gameState === 'VICTORY' && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#2C3E2D] border border-[#F2B84B] text-xs font-semibold text-[#FCE4B0]">
              <Heart className="w-4 h-4 text-[#E66C5A] fill-[#E66C5A]" />
              New Best Love Score: {hud.bestScore}
            </div>
          )}

          {/* Pack Roster with Rescue Hints */}
          <div>
            <div className="text-xs font-semibold text-[#D5CEBC] mb-2">
              The Nine Paws Roster
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOG_PROFILES.map((dog) => {
                const found = rescuedSet.has(dog.id);
                return (
                  <div
                    key={dog.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${
                      found
                        ? 'bg-[#22352A] border-[#3F5C4A]'
                        : 'bg-[#17231C] border-[#2C3D32]'
                    }`}
                  >
                    <DogBadgeIcon dog={dog} found={found} size={34} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#FFFDF6] flex items-center gap-1.5">
                        <span>{dog.name}</span>
                        <span className="text-[10px] font-normal text-[#B9B2A2]">
                          {found ? '· With Pack' : '· Lost'}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#C8C1B0] truncate">
                        {found ? dog.breedOrType : dog.rescueHint}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Marcos & Chucha Beach Allies Entry */}
            <div
              className={`mt-2 flex items-center gap-2.5 p-2.5 rounded-xl border ${
                hud.metMarcos
                  ? 'bg-[#203834] border-[#3BA39C]'
                  : 'bg-[#17231C] border-[#2C3D32]'
              }`}
            >
              <svg width="34" height="34" viewBox="0 0 40 40" aria-label="Chucha" className={hud.metMarcos ? 'opacity-100' : 'opacity-55'}>
                <circle cx="20" cy="20" r="18" fill="#1D2E27" stroke={CHUCHA_PROFILE.collarColor} strokeWidth="2" />
                <ellipse cx="12" cy="15" rx="3.2" ry="5" transform="rotate(20 12 15)" fill={CHUCHA_PROFILE.spotColor} />
                <ellipse cx="28" cy="15" rx="3.2" ry="5" transform="rotate(-20 28 15)" fill={CHUCHA_PROFILE.coatColor} />
                <circle cx="20" cy="21" r="8.5" fill={CHUCHA_PROFILE.coatColor} stroke="#1B1512" strokeWidth="1.2" />
                <circle cx="16.5" cy="17.5" r="2.1" fill={CHUCHA_PROFILE.spotColor} />
                <circle cx="24" cy="23" r="1.8" fill={CHUCHA_PROFILE.spotColor} />
                <circle cx="20" cy="23.5" r="2" fill={CHUCHA_PROFILE.noseColor} />
                <circle cx="17" cy="19.5" r="1.3" fill="#181412" />
                <circle cx="23" cy="19.5" r="1.3" fill="#181412" />
              </svg>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#FFFDF6] flex items-center gap-1.5">
                  <span>Marcos &amp; Chucha</span>
                  <span className="text-[10px] font-normal text-[#8FE3DB]">
                    {hud.metMarcos ? '· Helping Pack' : '· Golden Cove Beach'}
                  </span>
                </div>
                <div className="text-[11px] text-[#C8C1B0] truncate">
                  {hud.metMarcos
                    ? 'White girl dog with dark spots helping track the pack!'
                    : 'South sandy beach by the waves — ask Marcos for help!'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#304538] flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onReturnTitle}
            className="min-h-[50px] px-5 py-2.5 rounded-xl bg-[#22342A] hover:bg-[#2C4436] border border-[#3E5848] text-sm font-medium text-[#EAE3D2] cursor-pointer whitespace-nowrap"
          >
            Title Screen
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="min-h-[50px] px-6 py-2.5 rounded-xl bg-[#2D4537] hover:bg-[#385745] border border-[#4D705B] text-sm font-semibold text-[#FFFDF6] flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            {hud.gameState === 'PAUSED' ? 'Restart' : 'Play Again'}
          </button>

          {hud.gameState === 'PAUSED' && (
            <button
              type="button"
              onClick={onResume}
              className="min-h-[50px] px-7 py-2.5 rounded-xl bg-[#E66C5A] hover:bg-[#D75A48] text-sm font-semibold text-white flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
