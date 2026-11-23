import React, { useRef, useState } from 'react';
import { Heart, Pause, Search, Volume2, VolumeX, Zap } from 'lucide-react';
import { DOG_PROFILES, HudSnapshot } from '../game/types';
import { DogBadgeIcon } from './DogBadgeIcon';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onLove: () => void;
  onFeed: () => void;
  onSniff: () => void;
  onDash: () => void;
}

const BoneIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M18.9 7.2a2.6 2.6 0 0 0-3.55.98 2.6 2.6 0 0 0-.2.47H8.85a2.6 2.6 0 0 0-.2-.47 2.6 2.6 0 1 0-3.44 3.44 2.6 2.6 0 0 0 3.44 3.44c.08-.15.15-.31.2-.47h6.3c.05.16.12.32.2.47a2.6 2.6 0 1 0 3.55-3.91 2.6 2.6 0 0 0 0-3.95Z" />
  </svg>
);

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  onToggleMute,
  onPause,
  onJoystickMove,
  onLove,
  onFeed,
  onSniff,
  onDash,
}) => {
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 42;

  const updateJoystickFromPointer = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const ox = dist > 2 ? Math.cos(angle) * clamped : 0;
    const oy = dist > 2 ? Math.sin(angle) * clamped : 0;
    setKnobOffset({ x: ox, y: oy });
    onJoystickMove(ox / maxRadius, oy / maxRadius);
  };

  const resetJoystick = () => {
    activePointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  const rescuedSet = new Set(hud.rescuedIds);
  const warmthPct = Math.max(0, Math.min(100, (hud.warmth / hud.maxWarmth) * 100));
  const fullnessPct = Math.max(0, Math.min(100, (hud.packFullness / hud.maxPackFullness) * 100));
  const isHungry = hud.packFullness < 40;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.65rem))] pb-[max(2.25rem,calc(env(safe-area-inset-bottom)+1.5rem))] pl-[max(0.85rem,env(safe-area-inset-left))] pr-[max(0.85rem,env(safe-area-inset-right))] sm:p-5">
      {/* Top Perimeter Status Row */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Warmth + Pack Fullness + Zone + Pack Count */}
        <button
          type="button"
          onClick={onPause}
          aria-label="Open pack roster and pause menu"
          className="pointer-events-auto text-left bg-[#1B2A21]/95 border border-[#3B5443] hover:bg-[#22342A] rounded-xl px-3.5 py-2.5 shadow-md max-w-[235px] sm:max-w-none cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#E66C5A] fill-[#E66C5A] shrink-0" />
            <div className="w-20 sm:w-32 h-2.5 rounded-full bg-[#101A14] overflow-hidden border border-[#2F4436]">
              <div
                className="h-full bg-[#E66C5A] transition-transform duration-150 origin-left"
                style={{ width: `${warmthPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-[#FFFDF6] tabular-nums whitespace-nowrap">
              {hud.warmth}/{hud.maxWarmth}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2">
            <BoneIcon className="w-4 h-4 text-[#F2B84B] shrink-0" />
            <div className="w-20 sm:w-32 h-2 rounded-full bg-[#101A14] overflow-hidden border border-[#2F4436]">
              <div
                className={`h-full transition-transform duration-150 origin-left ${
                  isHungry ? 'bg-[#E66C5A]' : 'bg-[#F2B84B]'
                }`}
                style={{ width: `${fullnessPct}%` }}
              />
            </div>
            <span
              className={`text-[11px] font-semibold tabular-nums whitespace-nowrap ${
                isHungry ? 'text-[#FFB4A8]' : 'text-[#FCE4B0]'
              }`}
            >
              {isHungry ? 'Hungry' : `${hud.packFullness}%`}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-[#D5CEBC] truncate">
            <span className="font-medium text-[#FCE4B0] truncate">{hud.activeZoneName}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums whitespace-nowrap">
              {hud.rescuedIds.length}/9 Dogs
            </span>
            {hud.metMarcos && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#8FE3DB] whitespace-nowrap">+ Marcos</span>
              </>
            )}
          </div>
        </button>

        {/* Top-Center: 9-Dog Pack Roster (visible on md+ screens without crowding) */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#1B2A21]/95 border border-[#3B5443] rounded-xl px-3 py-1.5 shadow-md">
          {DOG_PROFILES.map((dog) => (
            <div key={dog.id} title={dog.name} className="flex flex-col items-center">
              <DogBadgeIcon dog={dog} found={rescuedSet.has(dog.id)} size={28} />
            </div>
          ))}
        </div>

        {/* Top-Right: Love Score + Mute + Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#1B2A21]/95 border border-[#3B5443] rounded-xl px-3 py-2 text-right shadow-md">
            <div className="text-[10px] uppercase tracking-wider text-[#C8C1B0] font-semibold">
              Love
            </div>
            <div className="text-sm sm:text-base font-bold text-[#FCE4B0] tabular-nums leading-tight">
              {hud.lovePoints}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-xl bg-[#1B2A21]/95 border border-[#3B5443] text-[#F9F6EE] hover:bg-[#263B2E] active:scale-95 transition-all cursor-pointer shadow-md"
          >
            {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause game"
            className="min-w-[52px] min-h-[52px] flex items-center justify-center rounded-xl bg-[#1B2A21]/95 border border-[#3B5443] text-[#F9F6EE] hover:bg-[#263B2E] active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <Pause className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Non-blocking Rescue Celebration Banner */}
      {hud.recentRescue && (
        <div className="self-center mt-2 max-w-md w-full px-3 pointer-events-none">
          <div className="bg-[#1B2A21]/95 border-2 border-[#F2B84B] rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-3">
            <DogBadgeIcon
              dog={DOG_PROFILES.find((d) => d.id === hud.recentRescue?.id) ?? DOG_PROFILES[0]}
              found={true}
              size={38}
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#FCE4B0]">
                {hud.recentRescue.name} Reunited!
              </div>
              <div className="text-xs text-[#EAE3D2] truncate">{hud.recentRescue.line}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Bottom Mobile Controls (lifted comfortably into lower-thumb zone): Left Joystick + Right Action Cluster */}
      <div className="flex items-end justify-between gap-3 w-full mb-2 sm:mb-3">
        <div
          ref={joyBaseRef}
          onPointerDown={(e) => {
            e.preventDefault();
            activePointerId.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            updateJoystickFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (activePointerId.current === e.pointerId) {
              updateJoystickFromPointer(e.clientX, e.clientY);
            }
          }}
          onPointerUp={(e) => {
            if (activePointerId.current === e.pointerId) {
              resetJoystick();
            }
          }}
          onPointerCancel={resetJoystick}
          className="pointer-events-auto relative w-[138px] h-[138px] rounded-full bg-[#1B2A21]/80 border-2 border-[#4B6855] flex items-center justify-center touch-none select-none shadow-lg shrink-0"
          aria-label="Movement joystick"
        >
          <div className="w-[72px] h-[72px] rounded-full border border-[#4B6855]/45 pointer-events-none" />
          <div
            className="absolute w-14 h-14 rounded-full bg-[#F9F6EE] border-2 border-[#C8B899] shadow-md pointer-events-none"
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          />
        </div>

        {/* Action Cluster (Right): Larger Dog Bone Feed + Sniff + Dash + Heart Pet */}
        <div className="pointer-events-auto flex flex-col items-end gap-3.5 touch-none shrink-0">
          <div className="flex items-center gap-3.5">
            <TouchActionButton
              label="Feed"
              badge={hud.bonesCount}
              disabled={hud.bonesCount <= 0}
              pulseAlert={isHungry && hud.bonesCount > 0}
              cooldownRatio={hud.feedCooldownRatio}
              colorClass="bg-[#FFF4DC] border-[#D99B2B]"
              onTrigger={onFeed}
              icon={<BoneIcon className="w-6 h-6 text-[#6B421E]" />}
              textColor="text-[#543214]"
            />
            <TouchActionButton
              label="Sniff"
              cooldownRatio={hud.sniffCooldownRatio}
              colorClass="bg-[#D99B2B] border-[#FCE4B0]"
              onTrigger={onSniff}
              icon={<Search className="w-6 h-6 text-[#1B2A21]" />}
              textColor="text-[#1B2A21]"
            />
          </div>
          <div className="flex items-end gap-3.5">
            <TouchActionButton
              label="Dash"
              cooldownRatio={hud.dashCooldownRatio}
              colorClass="bg-[#4D7E5C] border-[#B6DFC2]"
              onTrigger={onDash}
              icon={<Zap className="w-6 h-6 text-[#FFFDF6]" />}
              textColor="text-[#FFFDF6]"
            />
            <TouchActionButton
              label="Pet"
              cooldownRatio={hud.loveCooldownRatio}
              colorClass="bg-[#E66C5A] border-[#FFD3CC]"
              onTrigger={onLove}
              large
              icon={<Heart className="w-7 h-7 text-white fill-white" />}
              textColor="text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface TouchActionButtonProps {
  label: string;
  cooldownRatio: number;
  colorClass: string;
  textColor: string;
  icon: React.ReactNode;
  large?: boolean;
  badge?: number;
  disabled?: boolean;
  pulseAlert?: boolean;
  onTrigger: () => void;
}

const TouchActionButton: React.FC<TouchActionButtonProps> = ({
  label,
  cooldownRatio,
  colorClass,
  textColor,
  icon,
  large = false,
  badge,
  disabled = false,
  pulseAlert = false,
  onTrigger,
}) => {
  const ready = cooldownRatio <= 0.02 && !disabled;
  const sizeClass = large ? 'w-[84px] h-[84px]' : 'w-[68px] h-[68px]';

  return (
    <div className="relative">
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onTrigger();
        }}
        aria-label={badge !== undefined ? `${label} (${badge} left)` : label}
        className={`${sizeClass} relative rounded-full border-2 ${colorClass} flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer select-none overflow-hidden ${
          ready ? 'opacity-100' : 'opacity-60'
        } ${pulseAlert ? 'ring-2 ring-[#F7C65B] ring-offset-2 ring-offset-[#1B2A21]' : ''}`}
      >
        {cooldownRatio > 0.02 && (
          <div
            className="absolute inset-x-0 bottom-0 bg-black/45 pointer-events-none"
            style={{ height: `${Math.min(100, cooldownRatio * 100)}%` }}
          />
        )}
        <div className="relative z-10 flex flex-col items-center justify-center leading-none">
          {icon}
          <span className={`${large ? 'text-xs' : 'text-[11px]'} font-bold mt-1 ${textColor}`}>
            {label}
          </span>
        </div>
      </button>
      {badge !== undefined && (
        <span
          className={`pointer-events-none absolute -top-1 -right-1 z-20 min-w-[20px] h-5 px-1 rounded-full border text-[11px] font-bold tabular-nums flex items-center justify-center shadow ${
            badge > 0
              ? 'bg-[#1B2A21] border-[#FCE4B0] text-[#FCE4B0]'
              : 'bg-[#4D2420] border-[#FF9385] text-[#FFB4A8]'
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
};
