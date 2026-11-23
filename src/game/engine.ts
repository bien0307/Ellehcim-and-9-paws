import { soundFX } from './audio';
import { PlayerRenderState, renderGameFrame } from './renderer';
import {
  DogEntity,
  DogId,
  FloatingText,
  GameState,
  HudSnapshot,
  Particle,
  PulseRing,
  Vec2,
} from './types';
import {
  BEACH_SHORE_Y,
  createWorld,
  getZoneName,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WorldData,
} from './world';

const BEST_SCORE_KEY = 'ellehcim_nine_paws_best_v1';

function loadBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(Math.floor(score)));
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onHudChange: (snapshot: HudSnapshot) => void;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTime = 0;
  private playTime = 0;
  private hitstopTimer = 0;
  private shakeTimer = 0;
  private shakeIntensity = 0;

  private gameState: GameState = 'TITLE_MENU';
  private world: WorldData = createWorld();

  private player: PlayerRenderState = {
    x: 1200,
    y: 920,
    vx: 0,
    vy: 0,
    facing: 1,
    walkPhase: 0,
    squash: 0,
    invulnTimer: 0,
    dashTimer: 0,
    loveAnimTimer: 0,
  };

  private warmth = 100;
  private readonly maxWarmth = 100;
  private packFullness = 100;
  private readonly maxPackFullness = 100;
  private bonesCount = 6;
  private hungryBarkTimer = 0;
  private ambientBarkTimer = 4.5;
  private lostBarkTimer = 1.8;
  private lovePoints = 0;
  private bestScore = loadBestScore();
  private isNewBest = false;

  private loveCooldown = 0;
  private readonly loveMaxCooldown = 0.65;
  private feedCooldown = 0;
  private readonly feedMaxCooldown = 0.7;
  private sniffCooldown = 0;
  private readonly sniffMaxCooldown = 2.6;
  private sniffTrailTimer = 0;
  private dashCooldown = 0;
  private readonly dashMaxCooldown = 1.45;
  private dashDir: Vec2 = { x: 1, y: 0 };

  private camera: Vec2 = { x: 0, y: 0 };
  private particles: Particle[] = [];
  private pulses: PulseRing[] = [];
  private floatingTexts: FloatingText[] = [];

  private recentRescue: { id: DogId; name: string; line: string } | null = null;
  private recentRescueTimer = 0;

  // Input state
  private heldKeys = new Set<string>();
  private joyVec: Vec2 = { x: 0, y: 0 };
  private bufferedLove = 0;
  private bufferedFeed = 0;
  private bufferedSniff = 0;
  private bufferedDash = 0;

  private hudSyncAccumulator = 0;
  private viewW = 800;
  private viewH = 600;

  constructor(canvas: HTMLCanvasElement, onHudChange: (snapshot: HudSnapshot) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D canvas context');
    }
    this.ctx = context;
    this.onHudChange = onHudChange;
    this.resize();
    this.resetWorld(false);
  }

  public startLoop(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      this.update(dt);
      this.render();
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public resize(): void {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect?.width ?? window.innerWidth));
    const h = Math.max(320, Math.floor(rect?.height ?? window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.viewW = w;
    this.viewH = h;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.centerCameraImmediate();
  }

  public startNewGame(): void {
    soundFX.unlock();
    this.resetWorld(true);
    this.gameState = 'PLAYING';
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.clearHeldInputs();
      this.emitHud();
    }
  }

  public resumeGame(): void {
    if (this.gameState === 'PAUSED') {
      soundFX.unlock();
      this.gameState = 'PLAYING';
      this.emitHud();
    }
  }

  public acceptMarcosHelp(): void {
    if (this.gameState !== 'STORY') return;
    soundFX.unlock();
    const { marcos, chucha } = this.world;
    marcos.joined = true;
    chucha.joined = true;
    marcos.squash = 0.45;
    chucha.squash = 0.5;
    marcos.talkText = 'Let’s find them together!';
    marcos.talkTimer = 3.0;
    chucha.barkText = 'Woof! On the trail!';
    chucha.barkTimer = 2.6;

    this.warmth = Math.min(this.maxWarmth, this.warmth + 25);
    this.lovePoints += 150;
    soundFX.playRescueDog();
    triggerHaptic(20);

    // Chucha reveals all remaining hidden treats across the valley!
    for (const tr of this.world.treats) {
      if (!tr.collected) {
        tr.revealed = true;
      }
    }

    this.addFloatingText(this.player.x, this.player.y - 30, 'Marcos & Chucha joined! +150', '#BFF6F0');
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      this.spawnParticle(
        marcos.x,
        marcos.y,
        Math.cos(ang) * 85,
        Math.sin(ang) * 85 - 20,
        0.9,
        6,
        i % 2 === 0 ? '#4FB8AF' : '#EC6A63',
        'heart'
      );
    }

    this.gameState = 'PLAYING';
    this.emitHud();
  }

  public returnToTitle(): void {
    this.resetWorld(false);
    this.gameState = 'TITLE_MENU';
    this.clearHeldInputs();
    this.emitHud();
  }

  public setKeyDown(code: string): void {
    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      // Handled smoothly
    }
    this.heldKeys.add(code);

    if (code === 'Escape') {
      if (this.gameState === 'PLAYING') this.pauseGame();
      else if (this.gameState === 'PAUSED') this.resumeGame();
      return;
    }

    if (this.gameState === 'STORY') {
      if (code === 'Enter' || code === 'Space') {
        this.acceptMarcosHelp();
      }
      return;
    }

    if (this.gameState !== 'PLAYING') return;

    if (code === 'Space' || code === 'KeyJ') {
      this.triggerLove();
    } else if (code === 'KeyQ' || code === 'KeyB') {
      this.triggerFeed();
    } else if (code === 'KeyE' || code === 'KeyK') {
      this.triggerSniff();
    } else if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyF' || code === 'KeyL') {
      this.triggerDash();
    }
  }

  public setKeyUp(code: string): void {
    this.heldKeys.delete(code);
  }

  public clearHeldInputs(): void {
    this.heldKeys.clear();
    this.joyVec = { x: 0, y: 0 };
  }

  public setJoystickVector(x: number, y: number): void {
    const mag = Math.hypot(x, y);
    if (mag > 1) {
      this.joyVec = { x: x / mag, y: y / mag };
    } else {
      this.joyVec = { x, y };
    }
  }

  public triggerLove(): void {
    soundFX.unlock();
    if (this.gameState === 'PLAYING') {
      this.bufferedLove = 0.14;
    }
  }

  public triggerFeed(): void {
    soundFX.unlock();
    if (this.gameState === 'PLAYING') {
      this.bufferedFeed = 0.14;
    }
  }

  public triggerSniff(): void {
    soundFX.unlock();
    if (this.gameState === 'PLAYING') {
      this.bufferedSniff = 0.14;
    }
  }

  public triggerDash(): void {
    soundFX.unlock();
    if (this.gameState === 'PLAYING') {
      this.bufferedDash = 0.14;
    }
  }

  private resetWorld(showOpeningBark: boolean): void {
    this.world = createWorld();
    this.player = {
      x: 1200,
      y: 920,
      vx: 0,
      vy: 0,
      facing: 1,
      walkPhase: 0,
      squash: 0,
      invulnTimer: 0,
      dashTimer: 0,
      loveAnimTimer: 0,
    };
    this.warmth = this.maxWarmth;
    this.packFullness = this.maxPackFullness;
    this.bonesCount = 6;
    this.hungryBarkTimer = 0;
    this.ambientBarkTimer = 4.5;
    this.lostBarkTimer = 1.8;
    this.lovePoints = 0;
    this.isNewBest = false;
    this.playTime = 0;
    this.loveCooldown = 0;
    this.feedCooldown = 0;
    this.sniffCooldown = 0;
    this.sniffTrailTimer = 0;
    this.dashCooldown = 0;
    this.dashDir = { x: 1, y: 0 };
    this.hitstopTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.particles = [];
    this.pulses = [];
    this.floatingTexts = [];
    this.recentRescue = null;
    this.recentRescueTimer = 0;
    this.bufferedLove = 0;
    this.bufferedFeed = 0;
    this.bufferedSniff = 0;
    this.bufferedDash = 0;
    this.centerCameraImmediate();

    if (showOpeningBark) {
      const spotty = this.world.dogs.find((d) => d.profile.id === 'spotty');
      if (spotty) {
        spotty.barkText = 'Woof! Let’s find them!';
        spotty.barkTimer = 2.6;
        spotty.squash = 0.4;
      }
      soundFX.playDogBark('adult', true, 0.08, 0.22);
      this.addFloatingText(1200, 875, 'Find the 5 lost pups!', '#FFE8B0');
    }
  }

  private centerCameraImmediate(): void {
    this.camera.x = clamp(this.player.x - this.viewW / 2, 0, Math.max(0, WORLD_WIDTH - this.viewW));
    this.camera.y = clamp(this.player.y - this.viewH / 2, 0, Math.max(0, WORLD_HEIGHT - this.viewH));
  }

  private update(dt: number): void {
    this.elapsedTime += dt;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }

    if (this.gameState === 'TITLE_MENU') {
      // Gentle atmospheric idle pan on canvas behind Title Screen
      const panAngle = this.elapsedTime * 0.14;
      const targetX = 1200 + Math.cos(panAngle) * 180 - this.viewW / 2;
      const targetY = 920 + Math.sin(panAngle) * 120 - this.viewH / 2;
      this.camera.x += (clamp(targetX, 0, Math.max(0, WORLD_WIDTH - this.viewW)) - this.camera.x) * 2 * dt;
      this.camera.y += (clamp(targetY, 0, Math.max(0, WORLD_HEIGHT - this.viewH)) - this.camera.y) * 2 * dt;
      return;
    }

    if (this.gameState !== 'PLAYING') {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    this.playTime += dt;

    // Cooldowns & buffers
    this.loveCooldown = Math.max(0, this.loveCooldown - dt);
    this.feedCooldown = Math.max(0, this.feedCooldown - dt);
    this.sniffCooldown = Math.max(0, this.sniffCooldown - dt);
    this.sniffTrailTimer = Math.max(0, this.sniffTrailTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.bufferedLove = Math.max(0, this.bufferedLove - dt);
    this.bufferedFeed = Math.max(0, this.bufferedFeed - dt);
    this.bufferedSniff = Math.max(0, this.bufferedSniff - dt);
    this.bufferedDash = Math.max(0, this.bufferedDash - dt);
    this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);
    this.player.loveAnimTimer = Math.max(0, this.player.loveAnimTimer - dt);
    this.player.squash *= Math.pow(0.01, dt);

    // Dogs slowly get hungry over time
    this.packFullness = Math.max(0, this.packFullness - dt * 1.15);
    if (this.packFullness < 38) {
      this.hungryBarkTimer -= dt;
      if (this.hungryBarkTimer <= 0) {
        this.hungryBarkTimer = 5.5;
        const rescued = this.world.dogs.filter((d) => d.rescued && d.barkTimer <= 0);
        if (rescued.length > 0) {
          const hungryDog = rescued[Math.floor(Math.random() * rescued.length)];
          hungryDog.barkText = Math.random() < 0.5 ? 'Woof! Hungry!' : 'Arf! Bone?';
          hungryDog.barkTimer = 1.8;
          hungryDog.squash = 0.28;
          soundFX.playDogBark(
            hungryDog.profile.ageGroup === 'Puppy' ? 'puppy' : 'adult',
            false,
            0,
            0.2
          );
        }
      }
    } else {
      this.hungryBarkTimer = Math.min(this.hungryBarkTimer, 1.5);
    }

    // Playful pack barks while exploring together
    this.ambientBarkTimer -= dt;
    if (this.ambientBarkTimer <= 0) {
      this.ambientBarkTimer = 5.5 + Math.random() * 3.5;
      const talkers = this.world.dogs.filter((d) => d.rescued && d.barkTimer <= 0);
      if (talkers.length > 0) {
        const speaker = talkers[Math.floor(Math.random() * talkers.length)];
        const isPup = speaker.profile.ageGroup === 'Puppy';
        const lines = isPup
          ? ['Arf! Arf!', 'Yip!', 'Woof!']
          : ['Woof! Woof!', 'Bow-wow!', 'Arf!'];
        speaker.barkText = lines[Math.floor(Math.random() * lines.length)];
        speaker.barkTimer = 1.45;
        speaker.squash = 0.34;
        soundFX.playDogBark(isPup ? 'puppy' : 'adult', Math.random() < 0.55, 0, 0.19);
      }
    }

    // Nearby lost dogs bark to help Ellehcim locate them
    this.lostBarkTimer -= dt;
    if (this.lostBarkTimer <= 0) {
      this.lostBarkTimer = 3.2;
      let nearestLost: DogEntity | null = null;
      let nearestDist = 420;
      for (const dog of this.world.dogs) {
        if (dog.rescued || dog.barkTimer > 0) continue;
        const d = Math.hypot(dog.x - this.player.x, dog.y - this.player.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearestLost = dog;
        }
      }
      if (nearestLost) {
        const isPup = nearestLost.profile.ageGroup === 'Puppy';
        nearestLost.barkText = isPup ? 'Arf! Over here!' : 'Woof! Help!';
        nearestLost.barkTimer = 1.9;
        nearestLost.squash = 0.36;
        const proxVol = clamp(0.24 * (1 - nearestDist / 520), 0.12, 0.24);
        soundFX.playDogBark(isPup ? 'puppy' : 'adult', true, 0, proxVol);
      }
    }

    if (this.recentRescueTimer > 0) {
      this.recentRescueTimer -= dt;
      if (this.recentRescueTimer <= 0) {
        this.recentRescue = null;
      }
    }

    // Handle buffered actions
    if (this.bufferedLove > 0 && this.loveCooldown <= 0) {
      this.bufferedLove = 0;
      this.performLovePulse();
    }
    if (this.bufferedFeed > 0 && this.feedCooldown <= 0) {
      this.bufferedFeed = 0;
      this.performFeed();
    }
    if (this.bufferedSniff > 0 && this.sniffCooldown <= 0) {
      this.bufferedSniff = 0;
      this.performSniff();
    }
    if (this.bufferedDash > 0 && this.dashCooldown <= 0 && this.player.dashTimer <= 0) {
      this.bufferedDash = 0;
      this.performDash();
    }

    // Movement vector
    const input = this.getMoveInput();
    if (Math.hypot(input.x, input.y) > 0.15) {
      this.dashDir = normalizeVec(input);
      if (Math.abs(input.x) > 0.1) {
        this.player.facing = input.x > 0 ? 1 : -1;
      }
    }

    if (this.player.dashTimer > 0) {
      this.player.dashTimer = Math.max(0, this.player.dashTimer - dt);
      const dashSpeed = 465;
      this.player.vx = this.dashDir.x * dashSpeed;
      this.player.vy = this.dashDir.y * dashSpeed;
      if (Math.random() < 0.65) {
        this.spawnParticle(this.player.x, this.player.y + 10, (Math.random() - 0.5) * 40, -10, 0.32, 4.5, '#EFE0BE', 'dust');
      }
    } else {
      const baseSpeed = 225;
      const targetVx = input.x * baseSpeed;
      const targetVy = input.y * baseSpeed;
      const accel = 15;
      this.player.vx += (targetVx - this.player.vx) * Math.min(1, accel * dt);
      this.player.vy += (targetVy - this.player.vy) * Math.min(1, accel * dt);
    }

    const nextX = this.player.x + this.player.vx * dt;
    const nextY = this.player.y + this.player.vy * dt;
    this.movePlayerWithCollisions(nextX, nextY);

    const speed = Math.hypot(this.player.vx, this.player.vy);
    if (speed > 15) {
      this.player.walkPhase += dt * (speed * 0.055);
    }

    // Update world entities
    this.updateDogs(dt);
    this.updateAllies(dt);
    this.updateFlowers(dt);
    this.updateCritters(dt);
    this.updateWindGusts(dt);
    this.updateTreats(dt);
    this.updateFX(dt);

    // Smooth camera follow
    const targetCamX = clamp(this.player.x - this.viewW / 2, 0, Math.max(0, WORLD_WIDTH - this.viewW));
    const targetCamY = clamp(this.player.y - this.viewH / 2, 0, Math.max(0, WORLD_HEIGHT - this.viewH));
    this.camera.x += (targetCamX - this.camera.x) * Math.min(1, 8.5 * dt);
    this.camera.y += (targetCamY - this.camera.y) * Math.min(1, 8.5 * dt);

    // Periodic HUD sync (10Hz or immediate on major events)
    this.hudSyncAccumulator += dt;
    if (this.hudSyncAccumulator >= 0.1) {
      this.hudSyncAccumulator = 0;
      this.emitHud();
    }
  }

  private getMoveInput(): Vec2 {
    let kx = 0;
    let ky = 0;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) kx -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) kx += 1;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) ky -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) ky += 1;

    const kMag = Math.hypot(kx, ky);
    if (kMag > 0) {
      return { x: kx / kMag, y: ky / kMag };
    }
    return this.joyVec;
  }

  private movePlayerWithCollisions(nx: number, ny: number): void {
    const radius = 16;
    let x = clamp(nx, 28, WORLD_WIDTH - 28);
    let y = clamp(ny, 28, WORLD_HEIGHT - 28);

    // Trees & stones push-out
    for (const tr of this.world.trees) {
      const dx = x - tr.x;
      const dy = y - tr.y;
      const minD = radius + tr.radius;
      const d = Math.hypot(dx, dy);
      if (d < minD && d > 0.001) {
        x = tr.x + (dx / d) * minD;
        y = tr.y + (dy / d) * minD;
      }
    }
    for (const st of this.world.stones) {
      const dx = x - st.x;
      const dy = y - st.y;
      const minD = radius + st.radius * 0.85;
      const d = Math.hypot(dx, dy);
      if (d < minD && d > 0.001) {
        x = st.x + (dx / d) * minD;
        y = st.y + (dy / d) * minD;
      }
    }

    // Brambles: Potato's Dash breaks right through them! Otherwise blocks & gently warns
    for (const br of this.world.brambles) {
      if (br.cleared) continue;
      if (br.shakeTimer > 0) br.shakeTimer = Math.max(0, br.shakeTimer - 0.016);
      const dx = x - br.x;
      const dy = y - br.y;
      const minD = radius + br.radius * 0.85;
      const d = Math.hypot(dx, dy);
      if (d < minD) {
        if (this.player.dashTimer > 0) {
          br.cleared = true;
          this.hitstopTimer = 0.045;
          this.triggerShake(6, 0.16);
          triggerHaptic(18);
          soundFX.playBrambleBreak();
          this.lovePoints += 25;
          this.addFloatingText(br.x, br.y - 24, 'Potato cleared it! +25', '#F7C65B');
          for (let i = 0; i < 12; i++) {
            const ang = (i / 12) * Math.PI * 2;
            this.spawnParticle(
              br.x,
              br.y,
              Math.cos(ang) * (70 + Math.random() * 60),
              Math.sin(ang) * (70 + Math.random() * 60),
              0.45,
              4.5,
              i % 2 === 0 ? '#4D6B3C' : '#85523D',
              'leaf'
            );
          }
          const potato = this.world.dogs.find((d) => d.profile.id === 'potato');
          if (potato) {
            potato.barkText = 'Hmph! Easy!';
            potato.barkTimer = 1.6;
            potato.squash = 0.45;
          }
        } else if (d > 0.001) {
          x = br.x + (dx / d) * minD;
          y = br.y + (dy / d) * minD;
          br.shakeTimer = 0.16;
        }
      }
    }

    // Creek collision (unless on a bridge!)
    const onBridge = this.world.bridges.some(
      (b) => x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4
    );
    if (!onBridge) {
      for (const seg of this.world.creekSegments) {
        const closestX = clamp(x, seg.x, seg.x + seg.w);
        const closestY = clamp(y, seg.y, seg.y + seg.h);
        const dx = x - closestX;
        const dy = y - closestY;
        const d = Math.hypot(dx, dy);
        if (d < radius) {
          if (d > 0.001) {
            x = closestX + (dx / d) * radius;
            y = closestY + (dy / d) * radius;
          } else {
            // Inside rect, push toward nearest edge
            const left = Math.abs(x - seg.x);
            const right = Math.abs(seg.x + seg.w - x);
            const top = Math.abs(y - seg.y);
            const bottom = Math.abs(seg.y + seg.h - y);
            const m = Math.min(left, right, top, bottom);
            if (m === left) x = seg.x - radius;
            else if (m === right) x = seg.x + seg.w + radius;
            else if (m === top) y = seg.y - radius;
            else y = seg.y + seg.h + radius;
          }
        }
      }
    }

    // Ocean shoreline bound at Golden Cove Beach (keep feet on the sandy shore!)
    if (x > 780 && x < 1620 && y > BEACH_SHORE_Y - 12) {
      y = BEACH_SHORE_Y - 12;
    }

    this.player.x = x;
    this.player.y = y;
  }

  private performLovePulse(): void {
    this.loveCooldown = this.loveMaxCooldown;
    this.player.loveAnimTimer = 0.45;
    this.player.squash = 0.28;
    soundFX.playLovePulse();
    triggerHaptic(12);

    const pulseRadius = 155;
    this.pulses.push({
      x: this.player.x,
      y: this.player.y,
      radius: 20,
      maxRadius: pulseRadius,
      life: 0.42,
      maxLife: 0.42,
      color: '#EC6A63',
      kind: 'love',
    });

    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      this.spawnParticle(
        this.player.x + Math.cos(ang) * 20,
        this.player.y + Math.sin(ang) * 20,
        Math.cos(ang) * 80,
        Math.sin(ang) * 80 - 20,
        0.75,
        6,
        i % 2 === 0 ? '#EC6A63' : '#F7C65B',
        'heart'
      );
    }

    // Pet every dog in Ellehcim's pack — each patted dog hops and releases hearts!
    const petHeartPalette = ['#E66C5A', '#FF8FA3', '#F7C65B'];
    const rescuedDogs = this.world.dogs.filter((d) => d.rescued);
    for (let idx = 0; idx < rescuedDogs.length; idx++) {
      const dog = rescuedDogs[idx];
      dog.squash = 0.55;
      if (dog.barkTimer <= 0) {
        dog.barkText = idx % 2 === 0 ? 'Happy!' : 'Loved!';
        dog.barkTimer = 1.25;
      }
      for (let h = 0; h < 5; h++) {
        const spread = (h - 2) * 0.42 + (Math.random() - 0.5) * 0.25;
        const speed = 38 + Math.random() * 44;
        this.spawnParticle(
          dog.x + (Math.random() - 0.5) * 14,
          dog.y - 10,
          Math.sin(spread) * speed,
          -Math.cos(spread) * speed - 22,
          0.85 + Math.random() * 0.25,
          5.5 + Math.random() * 2,
          petHeartPalette[h % petHeartPalette.length],
          'heart'
        );
      }
    }

    if (this.world.marcos.joined) {
      const { chucha } = this.world;
      chucha.squash = 0.55;
      if (chucha.barkTimer <= 0) {
        chucha.barkText = 'Loved!';
        chucha.barkTimer = 1.25;
      }
      for (let h = 0; h < 5; h++) {
        const spread = (h - 2) * 0.42 + (Math.random() - 0.5) * 0.25;
        const speed = 38 + Math.random() * 44;
        this.spawnParticle(
          chucha.x + (Math.random() - 0.5) * 14,
          chucha.y - 10,
          Math.sin(spread) * speed,
          -Math.cos(spread) * speed - 22,
          0.85 + Math.random() * 0.25,
          5.5 + Math.random() * 2,
          petHeartPalette[h % petHeartPalette.length],
          'heart'
        );
      }
    }

    // Bloom flowers in radius
    for (const fl of this.world.flowers) {
      if (fl.bloomed) continue;
      if (Math.hypot(fl.x - this.player.x, fl.y - this.player.y) <= pulseRadius) {
        fl.bloomed = true;
        fl.bloomAnim = 0.1;
        this.lovePoints += 30;
        this.bonesCount += 1;
        this.warmth = Math.min(this.maxWarmth, this.warmth + 4);
        soundFX.playFlowerBloom();
        this.addFloatingText(fl.x, fl.y - 16, '+30 Love · +1 Bone', '#F7C65B');
        for (let i = 0; i < 6; i++) {
          this.spawnParticle(
            fl.x,
            fl.y,
            (Math.random() - 0.5) * 60,
            -35 - Math.random() * 40,
            0.65,
            5,
            fl.petalColor,
            'heart'
          );
        }
      }
    }

    // Befriend critters in radius
    for (const cr of this.world.critters) {
      if (cr.mood === 'loved') continue;
      if (Math.hypot(cr.x - this.player.x, cr.y - this.player.y) <= pulseRadius) {
        cr.mood = 'loved';
        cr.chargeWindup = 0;
        cr.chargeTimer = 0;
        cr.squash = 0.5;
        this.lovePoints += 60;
        this.warmth = Math.min(this.maxWarmth, this.warmth + 8);
        soundFX.playCritterBefriend();
        this.addFloatingText(cr.x, cr.y - 20, 'Befriended! +60', '#FFB4A8');
        for (let i = 0; i < 7; i++) {
          this.spawnParticle(
            cr.x,
            cr.y - 6,
            (Math.random() - 0.5) * 70,
            -40 - Math.random() * 45,
            0.8,
            6,
            '#EC6A63',
            'heart'
          );
        }
      }
    }

    // Rescue lost dogs in radius!
    for (const dog of this.world.dogs) {
      if (dog.rescued) continue;
      if (Math.hypot(dog.x - this.player.x, dog.y - this.player.y) <= pulseRadius + 15) {
        this.rescueDog(dog);
      }
    }

    // Check if Love Pulse reaches Marcos & Chucha at the beach!
    if (
      !this.world.marcos.joined &&
      Math.hypot(this.world.marcos.x - this.player.x, this.world.marcos.y - this.player.y) <= pulseRadius + 20
    ) {
      this.triggerMarcosMeeting();
    }

    this.emitHud();
  }

  private performFeed(): void {
    if (this.bonesCount <= 0) {
      this.feedCooldown = 0.35;
      this.addFloatingText(this.player.x, this.player.y - 26, 'No bones! Bloom flowers or grab treats', '#FF9385');
      this.emitHud();
      return;
    }

    this.bonesCount -= 1;
    this.feedCooldown = this.feedMaxCooldown;
    this.packFullness = Math.min(this.maxPackFullness, this.packFullness + 38);
    this.warmth = Math.min(this.maxWarmth, this.warmth + 10);
    this.lovePoints += 35;
    this.player.squash = 0.24;
    soundFX.playFeedBone();
    triggerHaptic(14);

    // Toss tasty dog bones toward the rescued pack
    const rescuedDogs = this.world.dogs.filter((d) => d.rescued);
    for (const dog of rescuedDogs) {
      dog.squash = 0.55;
      dog.barkText = 'Yum!';
      dog.barkTimer = 1.4;
      const dx = dog.x - this.player.x;
      const dy = dog.y - this.player.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      this.spawnParticle(
        this.player.x,
        this.player.y - 10,
        (dx / d) * 115 + (Math.random() - 0.5) * 35,
        (dy / d) * 115 - 35,
        0.65,
        5.5,
        '#FFF8E7',
        'bone'
      );
      this.spawnParticle(
        dog.x,
        dog.y - 10,
        (Math.random() - 0.5) * 55,
        -45 - Math.random() * 25,
        0.55,
        4.5,
        '#F7C65B',
        'spark'
      );
    }

    if (this.world.marcos.joined) {
      const { chucha } = this.world;
      chucha.squash = 0.55;
      chucha.barkText = 'Yum!';
      chucha.barkTimer = 1.4;
      const dx = chucha.x - this.player.x;
      const dy = chucha.y - this.player.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      this.spawnParticle(
        this.player.x,
        this.player.y - 10,
        (dx / d) * 115,
        (dy / d) * 115 - 30,
        0.65,
        5.5,
        '#FFF8E7',
        'bone'
      );
    }

    // Extra cheerful bone burst around Ellehcim
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + 0.3;
      this.spawnParticle(
        this.player.x,
        this.player.y - 8,
        Math.cos(ang) * 75,
        Math.sin(ang) * 55 - 40,
        0.6,
        5.5,
        '#FFF8E7',
        'bone'
      );
    }

    this.addFloatingText(this.player.x, this.player.y - 28, '+38 Fullness · +35 Love', '#FCE4B0');
    this.emitHud();
  }

  private performSniff(): void {
    this.sniffCooldown = this.world.marcos.joined ? this.sniffMaxCooldown * 0.54 : this.sniffMaxCooldown;
    this.sniffTrailTimer = this.world.marcos.joined ? 5.2 : 4.0;
    soundFX.playSniffBark();

    this.pulses.push({
      x: this.player.x,
      y: this.player.y,
      radius: 18,
      maxRadius: 240,
      life: 0.55,
      maxLife: 0.55,
      color: '#F7C65B',
      kind: 'sniff',
    });

    // Reveal nearby hidden treats
    let revealedAny = false;
    for (const tr of this.world.treats) {
      if (!tr.collected && !tr.revealed && Math.hypot(tr.x - this.player.x, tr.y - this.player.y) <= 380) {
        tr.revealed = true;
        revealedAny = true;
        this.addFloatingText(tr.x, tr.y - 16, 'Treat Found!', '#F7C65B');
      }
    }

    const spotty = this.world.dogs.find((d) => d.profile.id === 'spotty');
    const spikey = this.world.dogs.find((d) => d.profile.id === 'spikey');
    const nearest = this.getNearestLostDog();

    if (spotty) {
      spotty.squash = 0.4;
      spotty.barkText = nearest ? `${nearest.profile.name} is this way!` : 'All 9 together!';
      spotty.barkTimer = 2.0;
    }
    if (spikey) {
      spikey.squash = 0.35;
      if (revealedAny) {
        spikey.barkText = 'Sniffed a treat!';
        spikey.barkTimer = 1.8;
      }
    }
    if (this.world.chucha.joined) {
      this.world.chucha.squash = 0.4;
      this.world.chucha.barkText = nearest ? `I smell ${nearest.profile.name}!` : 'Pack complete!';
      this.world.chucha.barkTimer = 2.0;
    }
  }

  private triggerMarcosMeeting(): void {
    if (this.world.marcos.joined || this.gameState !== 'PLAYING') return;
    this.gameState = 'STORY';
    this.clearHeldInputs();
    soundFX.playCritterBefriend();
    this.emitHud();
  }

  private updateAllies(dt: number): void {
    const { marcos, chucha } = this.world;

    if (!marcos.joined) {
      // Trigger story encounter when Ellehcim walks up to Marcos & Chucha at Golden Cove Beach
      const dist = Math.hypot(this.player.x - marcos.x, this.player.y - marcos.y);
      if (dist < 72) {
        this.triggerMarcosMeeting();
      }
      return;
    }

    marcos.squash *= Math.pow(0.01, dt);
    chucha.squash *= Math.pow(0.01, dt);
    if (marcos.talkTimer > 0) {
      marcos.talkTimer = Math.max(0, marcos.talkTimer - dt);
      if (marcos.talkTimer === 0) marcos.talkText = null;
    }
    if (chucha.barkTimer > 0) {
      chucha.barkTimer = Math.max(0, chucha.barkTimer - dt);
      if (chucha.barkTimer === 0) chucha.barkText = null;
    }

    // Marcos walks warmly slightly to Ellehcim's side
    const targetMx = this.player.x - this.player.facing * 42;
    const targetMy = this.player.y + 18;
    const mdx = targetMx - marcos.x;
    const mdy = targetMy - marcos.y;
    const md = Math.hypot(mdx, mdy);
    if (md > 18) {
      const pull = Math.min(245, md * 5.8);
      marcos.vx += ((mdx / md) * pull - marcos.vx) * Math.min(1, 9 * dt);
      marcos.vy += ((mdy / md) * pull - marcos.vy) * Math.min(1, 9 * dt);
    } else {
      marcos.vx *= Math.pow(0.02, dt);
      marcos.vy *= Math.pow(0.02, dt);
    }
    marcos.x = clamp(marcos.x + marcos.vx * dt, 24, WORLD_WIDTH - 24);
    marcos.y = clamp(marcos.y + marcos.vy * dt, 24, BEACH_SHORE_Y - 10);
    if (Math.abs(marcos.vx) > 8) marcos.facing = marcos.vx > 0 ? 1 : -1;
    const mSpeed = Math.hypot(marcos.vx, marcos.vy);
    if (mSpeed > 10) marcos.walkPhase += dt * (mSpeed * 0.055);

    // Chucha trots right beside Marcos
    const cdx = marcos.x - marcos.facing * 26 - chucha.x;
    const cdy = marcos.y + 14 - chucha.y;
    const cd = Math.hypot(cdx, cdy);
    if (cd > 16) {
      const pull = Math.min(265, cd * 6.5);
      chucha.vx += ((cdx / cd) * pull - chucha.vx) * Math.min(1, 10 * dt);
      chucha.vy += ((cdy / cd) * pull - chucha.vy) * Math.min(1, 10 * dt);
    } else {
      chucha.vx *= Math.pow(0.02, dt);
      chucha.vy *= Math.pow(0.02, dt);
    }
    chucha.x = clamp(chucha.x + chucha.vx * dt, 24, WORLD_WIDTH - 24);
    chucha.y = clamp(chucha.y + chucha.vy * dt, 24, BEACH_SHORE_Y - 10);
    if (Math.abs(chucha.vx) > 8) chucha.facing = chucha.vx > 0 ? 1 : -1;
    const cSpeed = Math.hypot(chucha.vx, chucha.vy);
    if (cSpeed > 10) chucha.walkPhase += dt * (cSpeed * 0.075);
  }

  private performDash(): void {
    this.dashCooldown = this.dashMaxCooldown;
    this.player.dashTimer = 0.24;
    this.player.squash = -0.25;
    soundFX.playDash();

    const potato = this.world.dogs.find((d) => d.profile.id === 'potato');
    if (potato) {
      potato.squash = 0.5;
      if (Math.random() < 0.55) {
        potato.barkText = 'Zoom!!';
        potato.barkTimer = 1.0;
      }
    }
  }

  private rescueDog(dog: DogEntity): void {
    if (dog.rescued) return;
    dog.rescued = true;
    dog.needsLove = false;
    dog.squash = 0.55;
    dog.barkText = 'Reunited!';
    dog.barkTimer = 2.4;

    this.hitstopTimer = 0.055;
    this.triggerShake(5, 0.2);
    this.lovePoints += 250;
    this.warmth = Math.min(this.maxWarmth, this.warmth + 20);
    soundFX.playRescueDog(dog.profile.ageGroup === 'Puppy' ? 'puppy' : 'adult');

    this.recentRescue = {
      id: dog.profile.id,
      name: dog.profile.name,
      line: dog.profile.rescueLine,
    };
    this.recentRescueTimer = 4.2;

    this.addFloatingText(dog.x, dog.y - 28, `${dog.profile.name} Rescued! +250`, '#FFE8B0');
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      this.spawnParticle(
        dog.x,
        dog.y,
        Math.cos(ang) * (75 + Math.random() * 55),
        Math.sin(ang) * (75 + Math.random() * 55) - 25,
        0.95,
        6.5,
        i % 2 === 0 ? '#EC6A63' : '#F7C65B',
        'heart'
      );
    }

    // Check if all 9 dogs are now reunited!
    const allRescued = this.world.dogs.every((d) => d.rescued);
    if (allRescued) {
      // Bonus score for remaining warmth
      this.lovePoints += Math.round(this.warmth * 2);
      if (this.lovePoints > this.bestScore) {
        this.bestScore = this.lovePoints;
        this.isNewBest = true;
        saveBestScore(this.bestScore);
      }
      soundFX.playVictory();
      this.gameState = 'VICTORY';
    }
    this.emitHud();
  }

  private updateDogs(dt: number): void {
    const rescuedDogs = this.world.dogs.filter((d) => d.rescued);

    // Follow-chain formation for rescued pack
    for (let i = 0; i < rescuedDogs.length; i++) {
      const dog = rescuedDogs[i];
      dog.squash *= Math.pow(0.01, dt);
      if (dog.barkTimer > 0) {
        dog.barkTimer = Math.max(0, dog.barkTimer - dt);
        if (dog.barkTimer === 0) dog.barkText = null;
      }

      // Leader target: first dog follows Ellehcim, others follow previous dog with fan offset
      const leaderX = i === 0 ? this.player.x : rescuedDogs[i - 1].x;
      const leaderY = i === 0 ? this.player.y : rescuedDogs[i - 1].y;
      const angleOffset = (i % 2 === 0 ? 1 : -1) * 0.45;
      const desiredDist = i === 0 ? 44 : 34;

      const dx = leaderX - dog.x;
      const dy = leaderY - dog.y;
      const dist = Math.hypot(dx, dy);

      if (dist > desiredDist) {
        const pull = Math.min(275, (dist - desiredDist) * 7.2);
        const dirX = dx / dist;
        const dirY = dy / dist;
        // Slight lateral spread so dogs form a cute pack rather than stacking identically
        const perpX = -dirY * Math.sin(angleOffset) * 28;
        const perpY = dirX * Math.sin(angleOffset) * 28;
        dog.vx += (dirX * pull + perpX - dog.vx) * Math.min(1, 10 * dt);
        dog.vy += (dirY * pull + perpY - dog.vy) * Math.min(1, 10 * dt);
      } else {
        dog.vx *= Math.pow(0.02, dt);
        dog.vy *= Math.pow(0.02, dt);
      }

      dog.x = clamp(dog.x + dog.vx * dt, 24, WORLD_WIDTH - 24);
      dog.y = clamp(dog.y + dog.vy * dt, 24, WORLD_HEIGHT - 24);

      if (Math.abs(dog.vx) > 8) {
        dog.facing = dog.vx > 0 ? 1 : -1;
      }
      const speed = Math.hypot(dog.vx, dog.vy);
      if (speed > 10) {
        dog.walkPhase += dt * (speed * 0.075);
      }
    }

    // Lost dogs waiting in the world (walk close to rescue them automatically too!)
    for (const dog of this.world.dogs) {
      if (dog.rescued) continue;
      dog.squash *= Math.pow(0.01, dt);
      if (dog.barkTimer > 0) {
        dog.barkTimer = Math.max(0, dog.barkTimer - dt);
        if (dog.barkTimer === 0) dog.barkText = null;
      }
      const dist = Math.hypot(this.player.x - dog.x, this.player.y - dog.y);
      if (dist < 46) {
        this.rescueDog(dog);
      }
    }
  }

  private updateFlowers(dt: number): void {
    for (const fl of this.world.flowers) {
      if (fl.bloomed && fl.bloomAnim < 1) {
        fl.bloomAnim = Math.min(1, fl.bloomAnim + dt * 3.5);
      }
    }
  }

  private updateCritters(dt: number): void {
    for (const cr of this.world.critters) {
      cr.squash *= Math.pow(0.01, dt);
      if (cr.loveCooldown > 0) cr.loveCooldown -= dt;

      const distToPlayer = Math.hypot(this.player.x - cr.x, this.player.y - cr.y);

      if (cr.mood === 'grumpy') {
        if (cr.chargeWindup > 0) {
          cr.chargeWindup -= dt;
          if (cr.chargeWindup <= 0) {
            cr.chargeTimer = 0.38;
            cr.squash = -0.25;
          }
        } else if (cr.chargeTimer > 0) {
          cr.chargeTimer -= dt;
          const speed = 260;
          cr.x += cr.chargeDirX * speed * dt;
          cr.y += cr.chargeDirY * speed * dt;
        } else {
          // Gentle patrol around home
          cr.patrolAngle += dt * 1.1;
          const tx = cr.homeX + Math.cos(cr.patrolAngle) * 42;
          const ty = cr.homeY + Math.sin(cr.patrolAngle) * 32;
          cr.x += (tx - cr.x) * 3 * dt;
          cr.y += (ty - cr.y) * 3 * dt;

          // Telegraph windup if player gets close
          if (distToPlayer < 145) {
            const d = Math.max(1, distToPlayer);
            cr.chargeDirX = (this.player.x - cr.x) / d;
            cr.chargeDirY = (this.player.y - cr.y) / d;
            cr.chargeWindup = 0.55; // Clear visual telegraph!
          }
        }

        // Player bump check
        if (distToPlayer < cr.radius + 14 && this.player.dashTimer <= 0) {
          this.damagePlayer(14, cr.x, cr.y, 'Grumpy critter! Use Love!');
        }
      } else {
        // Shy or loved critter gently hops near home
        cr.patrolAngle += dt * (cr.mood === 'loved' ? 1.8 : 0.9);
        const tx = cr.homeX + Math.cos(cr.patrolAngle) * 26;
        const ty = cr.homeY + Math.sin(cr.patrolAngle) * 20;
        cr.x += (tx - cr.x) * 2.5 * dt;
        cr.y += (ty - cr.y) * 2.5 * dt;
      }
    }
  }

  private updateWindGusts(dt: number): void {
    for (const g of this.world.gusts) {
      g.phase += dt * g.speed;
      if (g.axis === 'x') {
        g.x = g.baseX + Math.sin(g.phase) * g.range;
        g.y = g.baseY;
      } else {
        g.x = g.baseX;
        g.y = g.baseY + Math.sin(g.phase) * g.range;
      }

      const d = Math.hypot(this.player.x - g.x, this.player.y - g.y);
      if (d < g.radius + 12 && this.player.dashTimer <= 0) {
        this.damagePlayer(12, g.x, g.y, 'Chilly gust!');
      }
    }
  }

  private updateTreats(dt: number): void {
    for (const tr of this.world.treats) {
      if (tr.collected || !tr.revealed) continue;
      if (Math.hypot(this.player.x - tr.x, this.player.y - tr.y) < 30) {
        tr.collected = true;
        this.warmth = Math.min(this.maxWarmth, this.warmth + 18);
        this.bonesCount += 2;
        this.lovePoints += 40;
        soundFX.playTreat();
        this.addFloatingText(tr.x, tr.y - 16, '+2 Bones · +18 Warmth', '#F7C65B');
        for (let i = 0; i < 6; i++) {
          this.spawnParticle(
            tr.x,
            tr.y,
            (Math.random() - 0.5) * 60,
            -30 - Math.random() * 40,
            0.55,
            4.5,
            '#F7C65B',
            'spark'
          );
        }
        this.emitHud();
      }
      void dt;
    }
  }

  private damagePlayer(amount: number, srcX: number, srcY: number, msg: string): void {
    if (this.player.invulnTimer > 0) return;
    this.warmth = Math.max(0, this.warmth - amount);
    this.player.invulnTimer = 1.05;
    this.player.squash = -0.3;
    this.hitstopTimer = 0.048;
    this.triggerShake(7, 0.22);
    soundFX.playHurt();

    const dx = this.player.x - srcX;
    const dy = this.player.y - srcY;
    const d = Math.max(1, Math.hypot(dx, dy));
    this.player.vx = (dx / d) * 260;
    this.player.vy = (dy / d) * 260;

    this.addFloatingText(this.player.x, this.player.y - 28, msg, '#FF9385');

    if (this.warmth <= 0) {
      if (this.lovePoints > this.bestScore) {
        this.bestScore = this.lovePoints;
        this.isNewBest = true;
        saveBestScore(this.bestScore);
      }
      this.gameState = 'GAME_OVER';
    }
    this.emitHud();
  }

  private updateFX(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
      } else {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= Math.pow(0.2, dt);
        pt.vy *= Math.pow(0.2, dt);
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pulses.splice(i, 1);
      } else {
        const t = 1 - p.life / p.maxLife;
        p.radius = 18 + (p.maxRadius - 18) * (1 - Math.pow(1 - t, 2));
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private spawnParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    size: number,
    color: string,
    kind: Particle['kind']
  ): void {
    if (this.particles.length > 180) return;
    this.particles.push({ x, y, vx, vy, life: maxLife, maxLife, size, color, kind });
  }

  private addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({ x, y, text, color, life: 1.2, maxLife: 1.2 });
  }

  private triggerShake(intensity: number, duration: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  private getNearestLostDog(): DogEntity | null {
    let best: DogEntity | null = null;
    let bestD = Infinity;
    for (const dog of this.world.dogs) {
      if (dog.rescued) continue;
      const d = Math.hypot(dog.x - this.player.x, dog.y - this.player.y);
      if (d < bestD) {
        bestD = d;
        best = dog;
      }
    }
    return best;
  }

  private render(): void {
    const shakeMag = this.shakeTimer > 0 ? this.shakeIntensity * (this.shakeTimer / 0.22) : 0;
    const shakeOffset: Vec2 =
      shakeMag > 0.1
        ? {
            x: (Math.random() - 0.5) * 2 * shakeMag,
            y: (Math.random() - 0.5) * 2 * shakeMag,
          }
        : { x: 0, y: 0 };

    renderGameFrame({
      ctx: this.ctx,
      width: this.viewW,
      height: this.viewH,
      camera: this.camera,
      shakeOffset,
      time: this.elapsedTime,
      player: this.player,
      world: this.world,
      particles: this.particles,
      pulses: this.pulses,
      floatingTexts: this.floatingTexts,
      sniffTrailTimer: this.sniffTrailTimer,
      nearestLostDog: this.getNearestLostDog(),
      showMinimap: this.gameState !== 'TITLE_MENU',
    });
  }

  private emitHud(): void {
    const rescuedIds = this.world.dogs.filter((d) => d.rescued).map((d) => d.profile.id);
    const flowersBloomed = this.world.flowers.filter((f) => f.bloomed).length;
    const crittersBefriended = this.world.critters.filter((c) => c.mood === 'loved').length;

    this.onHudChange({
      gameState: this.gameState,
      warmth: Math.round(this.warmth),
      maxWarmth: this.maxWarmth,
      packFullness: Math.round(this.packFullness),
      maxPackFullness: this.maxPackFullness,
      bonesCount: this.bonesCount,
      lovePoints: this.lovePoints,
      rescuedIds,
      flowersBloomed,
      totalFlowers: this.world.flowers.length,
      crittersBefriended,
      totalCritters: this.world.critters.length,
      elapsedSeconds: Math.floor(this.playTime),
      loveCooldownRatio: this.loveCooldown / this.loveMaxCooldown,
      feedCooldownRatio: this.feedCooldown / this.feedMaxCooldown,
      sniffCooldownRatio: this.sniffCooldown / this.sniffMaxCooldown,
      dashCooldownRatio: this.dashCooldown / this.dashMaxCooldown,
      activeZoneName: getZoneName(this.player.x, this.player.y),
      recentRescue: this.recentRescue,
      metMarcos: this.world.marcos.joined,
      bestScore: this.bestScore,
      isNewBest: this.isNewBest,
    });
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalizeVec(v: Vec2): Vec2 {
  const m = Math.hypot(v.x, v.y);
  if (m < 0.0001) return { x: 1, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

function triggerHaptic(ms: number): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore on browsers that block vibration
  }
}
