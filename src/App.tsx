import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { GameModals } from './components/GameModals';
import { OfflineIndicator } from './components/PWAInstallButton';
import { TitleScreen } from './components/TitleScreen';
import { soundFX } from './game/audio';
import { GameEngine } from './game/engine';
import { HudSnapshot } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  gameState: 'TITLE_MENU',
  warmth: 100,
  maxWarmth: 100,
  packFullness: 100,
  maxPackFullness: 100,
  bonesCount: 6,
  lovePoints: 0,
  rescuedIds: ['spotty', 'spikey', 'julie', 'potato'],
  flowersBloomed: 0,
  totalFlowers: 24,
  crittersBefriended: 0,
  totalCritters: 12,
  elapsedSeconds: 0,
  loveCooldownRatio: 0,
  feedCooldownRatio: 0,
  sniffCooldownRatio: 0,
  dashCooldownRatio: 0,
  activeZoneName: 'Home Meadow',
  recentRescue: null,
  metMarcos: false,
  bestScore: 0,
  isNewBest: false,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.startLoop();

    const handleResize = () => {
      engine.resize();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        e.preventDefault();
      }
      engine.setKeyDown(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      engine.setKeyUp(e.code);
    };
    const handleBlur = () => {
      engine.clearHeldInputs();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartGame = useCallback(() => {
    engineRef.current?.startNewGame();
  }, []);

  // Allow Enter / Space to start from Title Screen
  useEffect(() => {
    if (hud.gameState !== 'TITLE_MENU') return;
    const onTitleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        const dialogOpen = document.querySelector('[role="dialog"]');
        if (!dialogOpen) {
          e.preventDefault();
          handleStartGame();
        }
      }
    };
    window.addEventListener('keydown', onTitleKey);
    return () => window.removeEventListener('keydown', onTitleKey);
  }, [hud.gameState, handleStartGame]);

  const handleToggleMute = useCallback(() => {
    const next = soundFX.toggleMute();
    setMuted(next);
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleReturnTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleJoystickMove = useCallback((x: number, y: number) => {
    engineRef.current?.setJoystickVector(x, y);
  }, []);

  const handleLove = useCallback(() => {
    engineRef.current?.triggerLove();
  }, []);

  const handleFeed = useCallback(() => {
    engineRef.current?.triggerFeed();
  }, []);

  const handleSniff = useCallback(() => {
    engineRef.current?.triggerSniff();
  }, []);

  const handleDash = useCallback(() => {
    engineRef.current?.triggerDash();
  }, []);

  const handleAcceptMarcosHelp = useCallback(() => {
    engineRef.current?.acceptMarcosHelp();
  }, []);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#16231B]">
      <OfflineIndicator />
      {/* Isolated 60fps Canvas Container */}
      <div className="fixed inset-0 w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      </div>

      {/* Title Screen */}
      {hud.gameState === 'TITLE_MENU' && (
        <div className="relative z-30 w-full h-full">
          <TitleScreen
            onStart={handleStartGame}
            bestScore={hud.bestScore}
            muted={muted}
            onToggleMute={handleToggleMute}
          />
        </div>
      )}

      {/* Active Gameplay HUD */}
      {hud.gameState === 'PLAYING' && (
        <GameHUD
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onJoystickMove={handleJoystickMove}
          onLove={handleLove}
          onFeed={handleFeed}
          onSniff={handleSniff}
          onDash={handleDash}
        />
      )}

      {/* Pause / Story / Victory / Game Over Modals */}
      <GameModals
        hud={hud}
        onResume={handleResume}
        onRestart={handleStartGame}
        onReturnTitle={handleReturnTitle}
        onAcceptMarcosHelp={handleAcceptMarcosHelp}
      />
    </main>
  );
}
