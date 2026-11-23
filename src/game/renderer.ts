import {
  CHUCHA_PROFILE,
  ChuchaEntity,
  Critter,
  DogEntity,
  FloatingText,
  MarcosEntity,
  Particle,
  PulseRing,
  Vec2,
} from './types';
import {
  BEACH_SAND_TOP_Y,
  BEACH_SHORE_Y,
  BeachProp,
  WorldData,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  ZONES,
} from './world';

export interface PlayerRenderState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  walkPhase: number;
  squash: number;
  invulnTimer: number;
  dashTimer: number;
  loveAnimTimer: number;
}

export interface RenderFrameParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: Vec2;
  shakeOffset: Vec2;
  time: number;
  player: PlayerRenderState;
  world: WorldData;
  particles: Particle[];
  pulses: PulseRing[];
  floatingTexts: FloatingText[];
  sniffTrailTimer: number;
  nearestLostDog: DogEntity | null;
  showMinimap: boolean;
}

export function renderGameFrame(params: RenderFrameParams): void {
  const {
    ctx,
    width,
    height,
    camera,
    shakeOffset,
    time,
    player,
    world,
    particles,
    pulses,
    floatingTexts,
    sniffTrailTimer,
    nearestLostDog,
    showMinimap,
  } = params;

  ctx.save();

  // Base meadow backdrop
  ctx.fillStyle = '#53824D';
  ctx.fillRect(0, 0, width, height);

  const camX = Math.round(camera.x + shakeOffset.x);
  const camY = Math.round(camera.y + shakeOffset.y);
  ctx.translate(-camX, -camY);

  // Subtle meadow turf variation patches
  drawMeadowPatches(ctx, camX, camY, width, height);

  // Golden Cove Beach sand & turquoise ocean waves (South Center)
  drawBeachAndOcean(ctx, world.beachProps, time);

  // Dirt paths connecting Home Meadow to the 5 rescue zones & Beach
  drawPaths(ctx);

  // Home Meadow Sanctuary stone ring
  drawHomeSanctuary(ctx, time);

  // Zone ground landmarks (subtle warm lantern rugs/moss circles)
  drawZoneFloorAccents(ctx);

  // Creek and stone bridges
  drawCreekAndBridges(ctx, world, time);

  // Flowers (ground layer)
  for (const fl of world.flowers) {
    if (!isVisible(fl.x, fl.y, 70, camX, camY, width, height)) continue;
    drawFlowerPatch(ctx, fl.x, fl.y, fl.bloomed, fl.bloomAnim, fl.petalColor, time);
  }

  // Treats
  for (const tr of world.treats) {
    if (tr.collected || !tr.revealed) continue;
    if (!isVisible(tr.x, tr.y, 40, camX, camY, width, height)) continue;
    drawTreat(ctx, tr.x, tr.y, time + tr.bobPhase);
  }

  // Pulse rings (Love waves & Sniff sonar)
  for (const p of pulses) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = alpha * 0.72;
    ctx.lineWidth = p.kind === 'love' ? 5 : 3;
    ctx.stroke();

    if (p.kind === 'love') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.14;
      ctx.fill();
    }
    ctx.restore();
  }

  // Wind gusts
  for (const g of world.gusts) {
    if (!isVisible(g.x, g.y, 80, camX, camY, width, height)) continue;
    drawWindGust(ctx, g.x, g.y, g.radius, time + g.phase);
  }

  // Sniff scent trail guide arrows on ground if active
  if (sniffTrailTimer > 0 && nearestLostDog) {
    drawScentGuide(ctx, player.x, player.y, nearestLostDog.x, nearestLostDog.y, time, sniffTrailTimer);
  }

  // Depth-sorted entities (stones, brambles, critters, dogs, player, trees)
  type Drawable = { sortY: number; draw: () => void };
  const drawables: Drawable[] = [];

  for (const st of world.stones) {
    if (!isVisible(st.x, st.y, 100, camX, camY, width, height)) continue;
    drawables.push({
      sortY: st.y,
      draw: () => drawStone(ctx, st.x, st.y, st.radius, Boolean(st.isArch)),
    });
  }

  for (const br of world.brambles) {
    if (br.cleared) continue;
    if (!isVisible(br.x, br.y, 70, camX, camY, width, height)) continue;
    const distToPlayer = Math.hypot(player.x - br.x, player.y - br.y);
    drawables.push({
      sortY: br.y,
      draw: () => drawBramble(ctx, br.x, br.y, br.radius, br.shakeTimer, distToPlayer < 130),
    });
  }

  for (const cr of world.critters) {
    if (!isVisible(cr.x, cr.y, 60, camX, camY, width, height)) continue;
    drawables.push({
      sortY: cr.y,
      draw: () => drawCritter(ctx, cr, time),
    });
  }

  for (const dog of world.dogs) {
    if (!isVisible(dog.x, dog.y, 70, camX, camY, width, height)) continue;
    drawables.push({
      sortY: dog.y,
      draw: () => drawDog(ctx, dog, time, player),
    });
  }

  for (const bp of world.beachProps) {
    if (bp.kind !== 'umbrella') continue;
    if (!isVisible(bp.x, bp.y, 80, camX, camY, width, height)) continue;
    drawables.push({
      sortY: bp.y + 4,
      draw: () => drawBeachUmbrella(ctx, bp.x, bp.y, bp.color),
    });
  }

  if (isVisible(world.marcos.x, world.marcos.y, 80, camX, camY, width, height)) {
    drawables.push({
      sortY: world.marcos.y,
      draw: () => drawMarcos(ctx, world.marcos, time, player),
    });
  }

  if (isVisible(world.chucha.x, world.chucha.y, 70, camX, camY, width, height)) {
    drawables.push({
      sortY: world.chucha.y,
      draw: () => drawChucha(ctx, world.chucha, time, player),
    });
  }

  drawables.push({
    sortY: player.y,
    draw: () => drawEllehcim(ctx, player, time),
  });

  for (const tr of world.trees) {
    if (!isVisible(tr.x, tr.y, 120, camX, camY, width, height)) continue;
    drawables.push({
      sortY: tr.y + 12,
      draw: () => drawTree(ctx, tr.x, tr.y, tr.canopyRadius, tr.variant, time),
    });
  }

  drawables.sort((a, b) => a.sortY - b.sortY);
  for (const item of drawables) {
    item.draw();
  }

  // Particles
  for (const pt of particles) {
    if (!isVisible(pt.x, pt.y, 30, camX, camY, width, height)) continue;
    drawParticle(ctx, pt);
  }

  // Floating Texts
  for (const ft of floatingTexts) {
    const progress = 1 - ft.life / ft.maxLife;
    const alpha = ft.life < 0.35 ? ft.life / 0.35 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(20, 32, 24, 0.85)';
    ctx.strokeText(ft.text, ft.x, ft.y - progress * 22);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y - progress * 22);
    ctx.restore();
  }

  // World boundary border glow
  ctx.strokeStyle = 'rgba(28, 43, 34, 0.4)';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, WORLD_WIDTH - 12, WORLD_HEIGHT - 12);

  ctx.restore();

  // Screen-space subtle directional compass arrow to nearest lost dog (helps mobile & desktop!)
  if (nearestLostDog) {
    drawOffscreenDogCompass(ctx, width, height, camera, nearestLostDog, sniffTrailTimer > 0, time);
  }

  // Live Minimap (top-right below HUD controls)
  if (showMinimap) {
    drawMinimap(ctx, width, height, camera, player, world, time, sniffTrailTimer > 0);
  }
}

function isVisible(
  x: number,
  y: number,
  pad: number,
  camX: number,
  camY: number,
  w: number,
  h: number
): boolean {
  return x >= camX - pad && x <= camX + w + pad && y >= camY - pad && y <= camY + h + pad;
}

function drawMeadowPatches(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  w: number,
  h: number
): void {
  const step = 160;
  const startX = Math.floor(camX / step) * step;
  const startY = Math.floor(camY / step) * step;
  for (let gx = startX; gx < camX + w + step; gx += step) {
    for (let gy = startY; gy < camY + h + step; gy += step) {
      if (gx < 0 || gy < 0 || gx > WORLD_WIDTH || gy > WORLD_HEIGHT) continue;
      const hash = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
      if (hash % 3 === 0) {
        ctx.fillStyle = '#5E8E57';
        ctx.beginPath();
        ctx.ellipse(gx + 40, gy + 50, 56, 36, (hash % 7) * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (hash % 3 === 1) {
        ctx.fillStyle = '#4C7A46';
        ctx.beginPath();
        ctx.ellipse(gx + 85, gy + 30, 44, 28, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      // Small grass blades
      ctx.strokeStyle = '#6FA164';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const bx = gx + (hash % 90) + 20;
      const by = gy + ((hash >> 4) % 90) + 20;
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 3, by - 7);
      ctx.moveTo(bx + 4, by);
      ctx.lineTo(bx + 6, by - 8);
      ctx.stroke();
    }
  }
}

const TRAIL_ROUTES: Array<Array<[number, number]>> = [
  // Center -> SE Sunbeam Meadow (Scoob)
  [
    [1200, 920],
    [1480, 1120],
    [1760, 1340],
    [2040, 1480],
  ],
  // Center -> NW Mossy Arches (Stormy)
  [
    [1200, 920],
    [920, 740],
    [680, 560],
    [410, 390],
  ],
  // Center -> SW Clover Hollow (Sunny)
  [
    [1200, 920],
    [900, 1120],
    [660, 1300],
    [430, 1460],
  ],
  // Center -> North Lantern Ridge (Dang)
  [
    [1200, 920],
    [1200, 640],
    [1200, 400],
    [1200, 210],
  ],
  // Center -> NE Creekside Bridge -> Cloudy
  [
    [1200, 920],
    [1420, 720],
    [1450, 340],
    [1614, 340],
    [1860, 340],
    [2050, 380],
  ],
  // Alternate bridge loop to Cloudy
  [
    [1480, 1120],
    [1979, 820],
    [1979, 574],
    [2050, 380],
  ],
  // Center -> South Golden Cove Beach (Marcos & Chucha)
  [
    [1200, 920],
    [1200, 1220],
    [1200, 1465],
  ],
];

function drawPaths(ctx: CanvasRenderingContext2D): void {
  const routes = TRAIL_ROUTES;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft dirt edge
  ctx.strokeStyle = '#B99869';
  ctx.lineWidth = 66;
  for (const pts of routes) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
  }

  // Warm sandy footpath core
  ctx.strokeStyle = '#D7BC8D';
  ctx.lineWidth = 48;
  for (const pts of routes) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawHomeSanctuary(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.save();
  // Warm stone circle at center
  ctx.fillStyle = '#E5CFA3';
  ctx.beginPath();
  ctx.arc(1200, 920, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#B69564';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Paw print mosaic in center
  ctx.fillStyle = 'rgba(139, 98, 57, 0.22)';
  ctx.beginPath();
  ctx.ellipse(1200, 928, 16, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  const toes = [
    [-16, -8],
    [-6, -15],
    [6, -15],
    [16, -8],
  ];
  for (const [dx, dy] of toes) {
    ctx.beginPath();
    ctx.arc(1200 + dx, 922 + dy, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cozy lantern posts around Home Meadow
  const posts = [
    [1110, 860],
    [1290, 860],
  ];
  const glow = 0.22 + Math.sin(time * 3) * 0.05;
  for (const [lx, ly] of posts) {
    ctx.fillStyle = `rgba(248, 200, 94, ${glow})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5D4029';
    ctx.fillRect(lx - 3, ly - 22, 6, 22);
    ctx.fillStyle = '#F7C95C';
    ctx.beginPath();
    ctx.arc(lx, ly - 24, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawZoneFloorAccents(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  for (const z of ZONES) {
    if (z.name === 'Home Meadow') continue;
    ctx.fillStyle = 'rgba(255, 245, 214, 0.08)';
    ctx.beginPath();
    ctx.arc(z.x, z.y, 135, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCreekAndBridges(ctx: CanvasRenderingContext2D, world: WorldData, time: number): void {
  ctx.save();
  // Creek water
  for (const seg of world.creekSegments) {
    ctx.fillStyle = '#4B8FB5';
    ctx.beginPath();
    ctx.roundRect(seg.x, seg.y, seg.w, seg.h, 16);
    ctx.fill();

    ctx.strokeStyle = '#89C4E1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Animated ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    const isVert = seg.h > seg.w;
    if (isVert) {
      for (let ry = seg.y + 24; ry < seg.y + seg.h - 20; ry += 42) {
        const shift = Math.sin(time * 2.5 + ry * 0.05) * 6;
        ctx.beginPath();
        ctx.moveTo(seg.x + 14 + shift, ry);
        ctx.lineTo(seg.x + seg.w - 18 + shift, ry + 8);
        ctx.stroke();
      }
    } else {
      for (let rx = seg.x + 24; rx < seg.x + seg.w - 20; rx += 46) {
        const shift = Math.sin(time * 2.5 + rx * 0.05) * 6;
        ctx.beginPath();
        ctx.moveTo(rx, seg.y + 16 + shift);
        ctx.lineTo(rx + 14, seg.y + seg.h - 18 + shift);
        ctx.stroke();
      }
    }
  }

  // Stone/Wood Bridges
  for (const br of world.bridges) {
    ctx.fillStyle = '#9D8161';
    ctx.beginPath();
    ctx.roundRect(br.x, br.y, br.w, br.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#6B5239';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Planks
    ctx.strokeStyle = 'rgba(84, 58, 36, 0.45)';
    ctx.lineWidth = 2;
    if (br.w > br.h) {
      for (let px = br.x + 14; px < br.x + br.w - 8; px += 16) {
        ctx.beginPath();
        ctx.moveTo(px, br.y + 4);
        ctx.lineTo(px, br.y + br.h - 4);
        ctx.stroke();
      }
    } else {
      for (let py = br.y + 14; py < br.y + br.h - 8; py += 16) {
        ctx.beginPath();
        ctx.moveTo(br.x + 4, py);
        ctx.lineTo(br.x + br.w - 4, py);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawFlowerPatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bloomed: boolean,
  bloomAnim: number,
  petalColor: string,
  time: number
): void {
  ctx.save();
  ctx.translate(x, y);

  // Grassy base tuft
  ctx.fillStyle = '#3F6A3B';
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  const offsets = [
    [-9, -2],
    [8, -5],
    [0, 5],
  ];

  for (let i = 0; i < offsets.length; i++) {
    const [fx, fy] = offsets[i];
    const sway = Math.sin(time * 2.2 + i + x * 0.02) * 1.5;

    ctx.strokeStyle = '#4B8245';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(fx, fy + 6);
    ctx.lineTo(fx + sway, fy - 5);
    ctx.stroke();

    if (!bloomed) {
      // Closed bud
      ctx.fillStyle = '#8AA882';
      ctx.beginPath();
      ctx.arc(fx + sway, fy - 6, 4.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const s = 0.65 + Math.min(1, bloomAnim) * 0.45;
      ctx.save();
      ctx.translate(fx + sway, fy - 6);
      ctx.scale(s, s);
      ctx.fillStyle = petalColor;
      for (let p = 0; p < 5; p++) {
        const ang = (p / 5) * Math.PI * 2 + time * 0.3;
        ctx.beginPath();
        ctx.arc(Math.cos(ang) * 5, Math.sin(ang) * 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FBE272';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawTreat(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number): void {
  const bob = Math.sin(phase * 3.5) * 3;
  ctx.save();
  ctx.translate(x, y + bob);

  // Soft golden aura
  ctx.fillStyle = 'rgba(247, 206, 91, 0.26)';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  // Bone-shaped treat
  ctx.fillStyle = '#F7E7C4';
  ctx.strokeStyle = '#8C5B32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-8, -3.5, 16, 7, 3);
  ctx.fill();
  ctx.stroke();

  const knobs = [
    [-8, -3.5],
    [-8, 3.5],
    [8, -3.5],
    [8, 3.5],
  ];
  for (const [kx, ky] of knobs) {
    ctx.beginPath();
    ctx.arc(kx, ky, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawWindGust(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  phase: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(phase * 2.2);
  ctx.strokeStyle = 'rgba(225, 241, 246, 0.72)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.45 + i * 0.2), a, a + 1.4);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(205, 232, 240, 0.2)';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScentGuide(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  time: number,
  timer: number
): void {
  const dx = tx - px;
  const dy = ty - py;
  const dist = Math.hypot(dx, dy);
  if (dist < 40) return;
  const nx = dx / dist;
  const ny = dy / dist;

  ctx.save();
  const alpha = Math.min(1, timer / 1.2) * 0.85;
  for (let i = 1; i <= 7; i++) {
    const stepDist = 52 + i * 38 + ((time * 80) % 38);
    if (stepDist > dist - 30) break;
    const gx = px + nx * stepDist;
    const gy = py + ny * stepDist + Math.sin(time * 5 + i) * 4;
    ctx.fillStyle = `rgba(249, 211, 92, ${alpha * (1 - i / 9)})`;
    ctx.beginPath();
    ctx.arc(gx, gy, 5.5 - i * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawStone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  isArch: boolean
): void {
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = 'rgba(20, 34, 22, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.45, radius * 1.05, radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  if (isArch) {
    // Mossy stone archway landmark
    ctx.fillStyle = '#7E8C7D';
    ctx.strokeStyle = '#4B574B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -10, radius * 0.92, Math.PI, 0, false);
    ctx.lineTo(radius * 0.92, 10);
    ctx.lineTo(radius * 0.45, 10);
    ctx.arc(0, -10, radius * 0.45, 0, Math.PI, true);
    ctx.lineTo(-radius * 0.92, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Moss cap
    ctx.fillStyle = '#5F9254';
    ctx.beginPath();
    ctx.ellipse(-6, -radius * 0.85, radius * 0.45, 7, -0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#849083';
    ctx.strokeStyle = '#515B50';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.78, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#A1AD9F';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.22, -radius * 0.2, radius * 0.42, radius * 0.24, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBramble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  shakeTimer: number,
  showHint: boolean
): void {
  const sx = shakeTimer > 0 ? Math.sin(shakeTimer * 48) * 4 : 0;
  ctx.save();
  ctx.translate(x + sx, y);

  ctx.fillStyle = 'rgba(20, 32, 22, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 12, radius * 1.05, radius * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tangled dark briar bush
  ctx.fillStyle = '#3C4F32';
  ctx.strokeStyle = '#25321E';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * radius * 0.36, Math.sin(a) * radius * 0.28, radius * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Thorns
  ctx.strokeStyle = '#6D3D2E';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * radius * 0.4, Math.sin(a) * radius * 0.4);
    ctx.lineTo(Math.cos(a) * radius * 0.95, Math.sin(a) * radius * 0.95);
    ctx.stroke();
  }

  if (showHint) {
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FBE28A';
    ctx.strokeStyle = 'rgba(22, 35, 27, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeText('Dash!', 0, -radius - 8);
    ctx.fillText('Dash!', 0, -radius - 8);
  }
  ctx.restore();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  canopyRadius: number,
  variant: 'oak' | 'pine' | 'blossom',
  time: number
): void {
  const sway = Math.sin(time * 1.3 + x * 0.01) * 1.6;
  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(18, 34, 21, 0.25)';
  ctx.beginPath();
  ctx.ellipse(4, 14, canopyRadius * 0.78, canopyRadius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.fillStyle = '#6B4930';
  ctx.strokeStyle = '#472E1C';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 26, 4);
  ctx.fill();
  ctx.stroke();

  if (variant === 'pine') {
    ctx.fillStyle = '#2F5C39';
    ctx.strokeStyle = '#1E3F26';
    ctx.lineWidth = 2;
    for (let tier = 0; tier < 3; tier++) {
      const ty = -18 - tier * 18;
      const tw = canopyRadius * (0.95 - tier * 0.2);
      ctx.beginPath();
      ctx.moveTo(sway * (tier * 0.4), ty - 34);
      ctx.lineTo(-tw, ty);
      ctx.lineTo(tw, ty);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else {
    const mainColor = variant === 'blossom' ? '#E495A7' : '#3E7344';
    const highlightColor = variant === 'blossom' ? '#F6BDCB' : '#538E55';
    const darkStroke = variant === 'blossom' ? '#9C5468' : '#284F2D';

    ctx.fillStyle = mainColor;
    ctx.strokeStyle = darkStroke;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sway, -34, canopyRadius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(-canopyRadius * 0.22 + sway, -42, canopyRadius * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCritter(ctx: CanvasRenderingContext2D, cr: Critter, time: number): void {
  const hop = Math.abs(Math.sin(time * 4 + cr.homeX)) * (cr.mood === 'loved' ? 4 : 2);
  const scaleX = 1 + cr.squash * 0.22;
  const scaleY = 1 - cr.squash * 0.18;

  ctx.save();
  ctx.translate(cr.x, cr.y);

  // Windup telegraph ring before grumpy charge
  if (cr.chargeWindup > 0) {
    ctx.strokeStyle = '#E65B4F';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, cr.radius + 10 + Math.sin(time * 24) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = 'rgba(18, 32, 20, 0.24)';
  ctx.beginPath();
  ctx.ellipse(0, 10, cr.radius * 0.85, cr.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -hop);
  ctx.scale(scaleX, scaleY);

  if (cr.kind === 'boar') {
    ctx.fillStyle = cr.mood === 'loved' ? '#8C6E58' : '#5E4234';
    ctx.strokeStyle = '#33221A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Little tusks
    ctx.fillStyle = '#F5EFE2';
    ctx.beginPath();
    ctx.arc(13, 3, 3, 0, Math.PI * 2);
    ctx.arc(-13, 3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (cr.kind === 'crow') {
    ctx.fillStyle = cr.mood === 'loved' ? '#495867' : '#2C313A';
    ctx.strokeStyle = '#181A20';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Beak
    ctx.fillStyle = '#EFA93D';
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(17, 1);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();
  } else if (cr.kind === 'squirrel') {
    // Fluffy curled tail
    ctx.fillStyle = '#B56B3A';
    ctx.strokeStyle = '#5E3419';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-11, -5, 6, 10, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Small rounded ears & body
    ctx.fillStyle = '#C97B47';
    ctx.beginPath();
    ctx.arc(-5, -10, 3.5, 0, Math.PI * 2);
    ctx.arc(5, -10, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (cr.kind === 'kitten') {
    ctx.fillStyle = '#E8A86C';
    ctx.strokeStyle = '#7C512B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-12, -16);
    ctx.lineTo(-3, -10);
    ctx.moveTo(10, -6);
    ctx.lineTo(12, -16);
    ctx.lineTo(3, -10);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Hedgehog
    ctx.fillStyle = '#735743';
    ctx.strokeStyle = '#402F23';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D7BC99';
    ctx.beginPath();
    ctx.arc(4, 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes / expression
  ctx.fillStyle = '#1E1A18';
  ctx.beginPath();
  ctx.arc(-4, -2, 1.8, 0, Math.PI * 2);
  ctx.arc(4, -2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  if (cr.mood === 'grumpy') {
    // Angry brow lines
    ctx.strokeStyle = '#F7F3EA';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(-2, -4);
    ctx.moveTo(7, -6);
    ctx.lineTo(2, -4);
    ctx.stroke();
  } else if (cr.mood === 'loved') {
    // Floating mini heart
    drawMiniHeart(ctx, 0, -22 + Math.sin(time * 5) * 2, 5.5, '#EC6A63');
  }

  ctx.restore();
}

function drawEllehcim(
  ctx: CanvasRenderingContext2D,
  player: PlayerRenderState,
  time: number
): void {
  const speed = Math.hypot(player.vx, player.vy);
  const moving = speed > 12;
  const bob = moving ? Math.abs(Math.sin(player.walkPhase)) * 3.5 : Math.sin(time * 2.5) * 1;
  const legSwing = moving ? Math.sin(player.walkPhase) * 6 : 0;

  ctx.save();
  ctx.translate(player.x, player.y);

  // Dash trail glow
  if (player.dashTimer > 0) {
    ctx.fillStyle = 'rgba(247, 206, 91, 0.3)';
    ctx.beginPath();
    ctx.arc(0, -10, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Invuln blink
  if (player.invulnTimer > 0 && Math.floor(player.invulnTimer * 18) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }

  // Shadow
  ctx.fillStyle = 'rgba(18, 30, 20, 0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);
  const sx = (1 + player.squash * 0.18) * player.facing;
  const sy = 1 - player.squash * 0.15;
  ctx.scale(sx, sy);

  // Legs & Brown Hiking Boots (Khaki pants)
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#9D8660';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-5, 4);
  ctx.lineTo(-5 + legSwing * 0.5, 13);
  ctx.moveTo(5, 4);
  ctx.lineTo(5 - legSwing * 0.5, 13);
  ctx.stroke();

  ctx.fillStyle = '#4B3221';
  ctx.beginPath();
  ctx.ellipse(-5 + legSwing * 0.5, 14, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(5 - legSwing * 0.5, 14, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cream adventure shirt + Olive Explorer Vest
  ctx.fillStyle = '#F2E8D0';
  ctx.strokeStyle = '#332B23';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-10, -12, 20, 18, 6);
  ctx.fill();
  ctx.stroke();

  // Olive vest panels
  ctx.fillStyle = '#5D7246';
  ctx.beginPath();
  ctx.roundRect(-10, -12, 7.5, 17, 3);
  ctx.roundRect(2.5, -12, 7.5, 17, 3);
  ctx.fill();

  // Crossbody brown adventurer satchel strap
  ctx.strokeStyle = '#734B2E';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.lineTo(9, 4);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = '#C98F66'; // Tan skin
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(-13, 2 - legSwing * 0.4);
  ctx.moveTo(10, -8);
  ctx.lineTo(13, 2 + legSwing * 0.4);
  ctx.stroke();

  // Back layer of short Dora-style bob hair (chin-length, curving inward)
  ctx.fillStyle = '#1E1614';
  ctx.strokeStyle = '#120D0C';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-12.5, -22);
  ctx.bezierCurveTo(-15.5, -15, -13.5, -10.5, -6.5, -10.5);
  ctx.lineTo(7.5, -11.5);
  ctx.quadraticCurveTo(11.5, -15, 10.5, -23);
  ctx.arc(0, -23, 12, 0, Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Head (Smooth tan skin, youthful adult look)
  ctx.fillStyle = '#C98F66';
  ctx.strokeStyle = '#3B281E';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -21, 10.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Warm rosy cheek & bright eyes
  ctx.fillStyle = 'rgba(230, 108, 90, 0.28)';
  ctx.beginPath();
  ctx.ellipse(5.5, -17.8, 2.4, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1E1815';
  ctx.beginPath();
  ctx.arc(1.8, -19.8, 1.45, 0, Math.PI * 2);
  ctx.arc(6.6, -19.8, 1.45, 0, Math.PI * 2);
  ctx.fill();

  // Eye catchlights
  ctx.fillStyle = '#FFFDF6';
  ctx.beginPath();
  ctx.arc(2.2, -20.3, 0.45, 0, Math.PI * 2);
  ctx.arc(7.0, -20.3, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // Warm smile
  ctx.strokeStyle = '#6B3D2E';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(4.1, -17.3, 2.7, 0.15, Math.PI - 0.15);
  ctx.stroke();

  // Front Dora-style bob WITHOUT bangs: open smooth forehead with side-swept chin-length hair framing face
  ctx.fillStyle = '#1E1614';
  ctx.strokeStyle = '#120D0C';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(-1, -23.5, 11.2, Math.PI * 0.94, Math.PI * 1.92);
  // Swept cleanly behind forehead (no bangs!) down around the back/cheek to chin
  ctx.quadraticCurveTo(3, -27.5, -3.5, -24.5);
  ctx.quadraticCurveTo(-6.2, -17, -2.8, -11.2);
  ctx.quadraticCurveTo(-11.8, -11.0, -12.6, -18.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Subtle glossy hair shine
  ctx.strokeStyle = '#3B2D28';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-2, -24.5, 8.0, Math.PI * 1.12, Math.PI * 1.68);
  ctx.stroke();

  // Love pulse wave visual halo on Ellehcim when casting
  if (player.loveAnimTimer > 0) {
    drawMiniHeart(ctx, 0, -38, 7, '#EB6B63');
  }

  ctx.restore();
}

function drawDog(
  ctx: CanvasRenderingContext2D,
  dog: DogEntity,
  time: number,
  player: PlayerRenderState
): void {
  const p = dog.profile;
  const speed = Math.hypot(dog.vx, dog.vy);
  const isMoving = speed > 10;
  const hopMult = 2.6;
  const floatLift = p.floating ? 9 + Math.sin(time * 2.8) * 3.5 : 0;
  const bob =
    floatLift +
    (isMoving
      ? Math.abs(Math.sin(dog.walkPhase)) * hopMult
      : !dog.rescued
        ? Math.abs(Math.sin(time * 3 + dog.walkPhase)) * 2.5
        : Math.sin(time * 3 + dog.walkPhase) * 0.8);

  ctx.save();
  ctx.translate(dog.x, dog.y);

  // Lost dog gentle beacon ring on ground
  if (!dog.rescued) {
    const pulse = 0.45 + Math.sin(time * 4) * 0.2;
    ctx.strokeStyle = `rgba(242, 184, 75, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 7, 24, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Soft warm aura on ground beneath floating angel dog Sunny
  if (p.hasHalo) {
    ctx.fillStyle = 'rgba(255, 218, 102, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 17 * p.sizeScale, 8.5 * p.sizeScale, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadow (smaller & softer while floating)
  ctx.fillStyle = p.floating ? 'rgba(18, 30, 20, 0.16)' : 'rgba(18, 30, 20, 0.25)';
  ctx.beginPath();
  const shadowScale = p.floating ? 0.78 : 1;
  ctx.ellipse(0, 9, 13 * p.sizeScale * shadowScale, 6.5 * p.sizeScale * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);
  const scale = p.sizeScale;
  const dir = dog.rescued ? dog.facing : player.x >= dog.x ? 1 : -1;
  ctx.scale(dir * scale * (1 + dog.squash * 0.18), scale * (1 - dog.squash * 0.15));

  const bodyW = p.chubby ? 15.5 : p.muscular ? 15 : 13.5;
  const bodyH = p.chubby ? 11.5 : p.muscular ? 10.5 : 9.5;

  // Tail (wagging!)
  const wagSpeed = p.id === 'potato' ? 18 : 11;
  const wag = Math.sin(time * wagSpeed + dog.walkPhase) * 0.45;
  ctx.save();
  ctx.translate(-bodyW + 2, -2);
  ctx.rotate(wag - 0.5);
  ctx.strokeStyle = p.coatColor;
  ctx.fillStyle = p.coatColor;
  ctx.lineCap = 'round';
  if (p.tailStyle === 'short') {
    // Potato's unique short stubby tail (and Cloudy)
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-5.5, -3.5);
    ctx.stroke();
  } else if (p.tailStyle === 'curled') {
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(-4, -5, 5, 0.3, Math.PI * 1.45);
    ctx.stroke();
  } else if (p.tailStyle === 'fluffy') {
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -6, -11, -10);
    ctx.stroke();
    if (p.id === 'spotty') {
      ctx.fillStyle = p.secondaryColor;
      ctx.beginPath();
      ctx.arc(-11, -10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-8, -4, -12, -9);
    ctx.stroke();
  }
  ctx.restore();

  // Legs
  const legSwing = isMoving ? Math.sin(dog.walkPhase) * 4 : 0;
  ctx.strokeStyle = p.coatColor;
  ctx.lineWidth = p.muscular ? 4.6 : 3.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.lineTo(-7 + legSwing, 10);
  ctx.moveTo(-2, 4);
  ctx.lineTo(-2 - legSwing, 10);
  ctx.moveTo(5, 4);
  ctx.lineTo(5 + legSwing, 10);
  ctx.moveTo(9, 4);
  ctx.lineTo(9 - legSwing, 10);
  ctx.stroke();

  // Body
  ctx.fillStyle = p.coatColor;
  ctx.strokeStyle = '#241B17';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Chest / spotted coat markings
  if (p.spotColor) {
    ctx.fillStyle = p.spotColor;
    ctx.beginPath();
    ctx.ellipse(-4.5, -3.2, 4.3, 3.0, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2.5, 2.4, 2.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-9.2, 1.8, 2.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = p.secondaryColor;
    ctx.beginPath();
    ctx.ellipse(7, 2, bodyW * 0.4, bodyH * 0.55, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Collar
  ctx.strokeStyle = p.collarColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.lineTo(10, 4);
  ctx.stroke();

  // Head
  const headX = 10;
  const headY = -7;
  const headR = p.chubby ? 9.5 : 8.5;

  // Fluffy cheek tuft for Julie
  if (p.chubby) {
    ctx.fillStyle = p.secondaryColor;
    ctx.beginPath();
    ctx.arc(headX - 3, headY + 2, 7.5, 0, Math.PI * 2);
    ctx.arc(headX + 2, headY + 2, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = p.coatColor;
  ctx.strokeStyle = '#241B17';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Spotty: unique brown mask on the left side of her face
  if (p.leftFaceMaskColor) {
    ctx.fillStyle = p.leftFaceMaskColor;
    ctx.beginPath();
    // Covers the left cheek/eye/crown patch distinctly while leaving white blaze & muzzle
    ctx.ellipse(headX - 1.2, headY - 1.6, 5.2, 5.6, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.coatColor;
    ctx.beginPath();
    ctx.ellipse(headX + 5.2, headY + 1.5, 3.6, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ears! (Distinct per dog)
  ctx.fillStyle =
    p.id === 'spikey' ? '#6D3C1E' : p.leftFaceMaskColor ? p.leftFaceMaskColor : p.coatColor;
  ctx.strokeStyle = '#241B17';
  ctx.lineWidth = 1.6;
  if (p.earStyle === 'pointed') {
    // Stormy & Sunny: crisp pointed dog ears
    ctx.beginPath();
    ctx.moveTo(headX - 6, headY - 5);
    ctx.lineTo(headX - 4, headY - 16);
    ctx.lineTo(headX + 1, headY - 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(headX + 1, headY - 6);
    ctx.lineTo(headX + 5, headY - 16);
    ctx.lineTo(headX + 7, headY - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (p.earStyle === 'beagle') {
    // Spikey: long floppy beagle-shaped ears
    ctx.beginPath();
    ctx.ellipse(headX - 5, headY + 1, 4.3, 8.8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (p.earStyle === 'terrier') {
    // Dang: cute folded terrier-lab ears
    ctx.beginPath();
    ctx.moveTo(headX - 6, headY - 5);
    ctx.lineTo(headX - 10, headY + 2);
    ctx.lineTo(headX - 3, headY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (p.earStyle === 'fluffy') {
    // Julie: small fluffy ears
    ctx.beginPath();
    ctx.arc(headX - 5, headY - 6, 4.2, 0, Math.PI * 2);
    ctx.arc(headX + 3, headY - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Spotty / Potato / Cloudy / Scoob
    ctx.beginPath();
    ctx.ellipse(headX - 4, headY - 4, 3.6, 6.2, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Golden Halo hovering above Sunny's head
  if (p.hasHalo) {
    ctx.save();
    ctx.strokeStyle = '#FFD756';
    ctx.shadowColor = '#FFE482';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(headX - 1, headY - 21, 7.5, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Muzzle & Nose (Spikey big black nose, Julie small nose, Dang pink nose)
  ctx.fillStyle = p.id === 'spotty' ? p.coatColor : p.secondaryColor;
  ctx.beginPath();
  ctx.ellipse(headX + 6, headY + 2.5, p.chubby ? 3.8 : 4.6, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.noseColor;
  const noseR = p.bigNose ? 3.5 : p.id === 'julie' ? 1.5 : 2.3;
  ctx.beginPath();
  ctx.arc(headX + 8.8, headY + 1.4, noseR, 0, Math.PI * 2);
  ctx.fill();
  if (p.bigNose) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(headX + 8.1, headY + 0.4, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Eyes (supports heterochromia: blue on screen-left, yellow on screen-right)
  if (p.leftEyeColor && p.rightEyeColor) {
    const backColor = dir >= 0 ? p.leftEyeColor : p.rightEyeColor;
    const frontColor = dir >= 0 ? p.rightEyeColor : p.leftEyeColor;

    // Inner/back eye
    ctx.fillStyle = backColor;
    ctx.strokeStyle = '#181412';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(headX + 1.8, headY - 2.3, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#181412';
    ctx.beginPath();
    ctx.arc(headX + 1.8, headY - 2.3, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Outer/front eye
    ctx.fillStyle = frontColor;
    ctx.beginPath();
    ctx.arc(headX + 5.6, headY - 2.0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#181412';
    ctx.beginPath();
    ctx.arc(headX + 5.6, headY - 2.0, 0.95, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#181412';
    ctx.beginPath();
    ctx.arc(headX + 4.5, headY - 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Potato's playful feisty brow!
  if (p.id === 'potato') {
    ctx.strokeStyle = '#3B2314';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(headX + 2, headY - 5);
    ctx.lineTo(headX + 6.5, headY - 3.8);
    ctx.stroke();
  }

  ctx.restore();

  // Unflipped Nameplate & Bark Bubble above dog
  ctx.save();
  ctx.translate(dog.x, dog.y - 26 * p.sizeScale - bob);
  if (!dog.rescued) {
    // Heart prompt for lost dog
    drawMiniHeart(ctx, 0, -16 + Math.sin(time * 5) * 2.5, 7, '#E66C5A');
    ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(20, 32, 24, 0.9)';
    ctx.strokeText(p.name, 0, -2);
    ctx.fillStyle = '#FFE8B0';
    ctx.fillText(p.name, 0, -2);

    if (dog.barkTimer > 0 && dog.barkText) {
      drawSpeechBubble(ctx, 0, -37, dog.barkText);
    }
  } else if (dog.barkTimer > 0 && dog.barkText) {
    drawSpeechBubble(ctx, 0, -10, dog.barkText);
  }
  ctx.restore();
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string
): void {
  ctx.save();
  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  const paddingX = 8;
  const textW = ctx.measureText(text).width;
  const boxW = textW + paddingX * 2;
  const boxH = 20;
  const left = x - boxW / 2;
  const top = y - boxH;

  ctx.fillStyle = 'rgba(255, 252, 242, 0.94)';
  ctx.strokeStyle = '#3B5443';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(left, top, boxW, boxH, 8);
  ctx.fill();
  ctx.stroke();

  // Small tail pointer
  ctx.beginPath();
  ctx.moveTo(x - 4, top + boxH - 1);
  ctx.lineTo(x, top + boxH + 4);
  ctx.lineTo(x + 4, top + boxH - 1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1B2A21';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, top + boxH / 2 + 0.5);
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, pt: Particle): void {
  const alpha = Math.max(0, pt.life / pt.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (pt.kind === 'heart') {
    drawMiniHeart(ctx, pt.x, pt.y, pt.size, pt.color);
  } else if (pt.kind === 'bone') {
    ctx.translate(pt.x, pt.y);
    ctx.rotate(pt.life * 10);
    ctx.fillStyle = pt.color;
    ctx.strokeStyle = '#7A4F2B';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-pt.size, -pt.size * 0.4, pt.size * 2, pt.size * 0.8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-pt.size, -pt.size * 0.4, pt.size * 0.4, 0, Math.PI * 2);
    ctx.arc(-pt.size, pt.size * 0.4, pt.size * 0.4, 0, Math.PI * 2);
    ctx.arc(pt.size, -pt.size * 0.4, pt.size * 0.4, 0, Math.PI * 2);
    ctx.arc(pt.size, pt.size * 0.4, pt.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMiniHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.45);
  ctx.bezierCurveTo(-size * 1.1, -size * 0.35, -size * 0.6, -size * 1.15, 0, -size * 0.45);
  ctx.bezierCurveTo(size * 0.6, -size * 1.15, size * 1.1, -size * 0.35, 0, size * 0.45);
  ctx.fill();
  ctx.restore();
}

function drawOffscreenDogCompass(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camera: Vec2,
  dog: DogEntity,
  sniffBoost: boolean,
  time: number
): void {
  const screenX = dog.x - camera.x;
  const screenY = dog.y - camera.y;
  const margin = 44;

  if (
    screenX >= margin &&
    screenX <= viewW - margin &&
    screenY >= margin &&
    screenY <= viewH - margin
  ) {
    return;
  }

  const cx = viewW / 2;
  const cy = viewH / 2;
  const angle = Math.atan2(screenY - cy, screenX - cx);
  const padX = viewW / 2 - 46;
  const padY = viewH / 2 - 74;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tx = cos !== 0 ? padX / Math.abs(cos) : Infinity;
  const ty = sin !== 0 ? padY / Math.abs(sin) : Infinity;
  const t = Math.min(tx, ty);

  const ix = cx + cos * t;
  const iy = cy + sin * t;
  const pulse = sniffBoost ? 1 + Math.sin(time * 8) * 0.14 : 1;

  ctx.save();
  ctx.translate(ix, iy);
  ctx.scale(pulse, pulse);

  // Clean compass badge
  ctx.fillStyle = 'rgba(28, 43, 34, 0.88)';
  ctx.strokeStyle = sniffBoost ? '#F7C65B' : '#E66C5A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pointer triangle
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = sniffBoost ? '#F7C65B' : '#E66C5A';
  ctx.beginPath();
  ctx.moveTo(25, 0);
  ctx.lineTo(17, -6);
  ctx.lineTo(17, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Dog initial inside
  ctx.fillStyle = '#FFFDF7';
  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(dog.profile.name.slice(0, 2).toUpperCase(), 0, 1);

  ctx.restore();
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camera: Vec2,
  player: PlayerRenderState,
  world: WorldData,
  time: number,
  sniffBoost: boolean
): void {
  const isCompact = viewW < 640;
  const mapW = isCompact ? 112 : 156;
  const mapH = Math.round(mapW * (WORLD_HEIGHT / WORLD_WIDTH));
  const marginRight = isCompact ? 12 : 16;
  const mapX = viewW - mapW - marginRight;
  const mapY = isCompact ? 94 : 96;

  const sx = mapW / WORLD_WIDTH;
  const sy = mapH / WORLD_HEIGHT;

  ctx.save();

  // Outer card frame
  ctx.fillStyle = 'rgba(27, 42, 33, 0.94)';
  ctx.strokeStyle = '#3B5443';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(mapX - 3, mapY - 3, mapW + 6, mapH + 6, 10);
  ctx.fill();
  ctx.stroke();

  // Clip map interior
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 7);
  ctx.clip();

  // Meadow ground
  ctx.fillStyle = '#345A3B';
  ctx.fillRect(mapX, mapY, mapW, mapH);

  // Golden Cove Beach sand & sea on minimap
  ctx.fillStyle = '#D9BE87';
  ctx.beginPath();
  ctx.ellipse(mapX + 1200 * sx, mapY + 1570 * sy, 380 * sx, 165 * sy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4B8FB5';
  ctx.fillRect(mapX + 790 * sx, mapY + BEACH_SHORE_Y * sy, 820 * sx, (WORLD_HEIGHT - BEACH_SHORE_Y) * sy);

  // Zone highlights
  for (const z of ZONES) {
    ctx.fillStyle = z.name === 'Home Meadow' ? 'rgba(229, 207, 163, 0.22)' : 'rgba(255, 245, 214, 0.08)';
    ctx.beginPath();
    ctx.arc(mapX + z.x * sx, mapY + z.y * sy, z.radius * sx * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Trail paths
  ctx.strokeStyle = '#B89A6D';
  ctx.lineWidth = isCompact ? 2.2 : 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const pts of TRAIL_ROUTES) {
    ctx.beginPath();
    ctx.moveTo(mapX + pts[0][0] * sx, mapY + pts[0][1] * sy);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(mapX + pts[i][0] * sx, mapY + pts[i][1] * sy);
    }
    ctx.stroke();
  }

  // Creek & Bridges
  ctx.fillStyle = '#4B8FB5';
  for (const seg of world.creekSegments) {
    ctx.fillRect(
      mapX + seg.x * sx,
      mapY + seg.y * sy,
      Math.max(2, seg.w * sx),
      Math.max(2, seg.h * sy)
    );
  }
  ctx.fillStyle = '#D0AF7D';
  for (const br of world.bridges) {
    ctx.fillRect(
      mapX + br.x * sx,
      mapY + br.y * sy,
      Math.max(3, br.w * sx),
      Math.max(3, br.h * sy)
    );
  }

  // Uncleared brambles
  ctx.fillStyle = '#5E3829';
  for (const br of world.brambles) {
    if (br.cleared) continue;
    ctx.beginPath();
    ctx.arc(mapX + br.x * sx, mapY + br.y * sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Camera viewport box
  ctx.strokeStyle = 'rgba(255, 253, 246, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    mapX + camera.x * sx,
    mapY + camera.y * sy,
    viewW * sx,
    viewH * sy
  );

  // Marcos & Chucha marker on beach (until met) or following in pack
  if (!world.marcos.joined) {
    const mx = mapX + world.marcos.x * sx;
    const my = mapY + world.marcos.y * sy;
    ctx.fillStyle = '#4FB8AF';
    ctx.strokeStyle = '#FFFDF6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mx, my, isCompact ? 2.6 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (!isCompact || sniffBoost) {
      ctx.font = '700 7.5px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#D5F7F2';
      ctx.fillText('Beach', mx, my - 6);
    }
  } else {
    ctx.fillStyle = '#8FE3DB';
    ctx.beginPath();
    ctx.arc(mapX + world.marcos.x * sx, mapY + world.marcos.y * sy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rescued pack dogs
  for (const dog of world.dogs) {
    if (!dog.rescued) continue;
    ctx.fillStyle = '#FCE4B0';
    ctx.beginPath();
    ctx.arc(mapX + dog.x * sx, mapY + dog.y * sy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lost dogs with pulsing beacon & short label
  const pulse = 1 + Math.sin(time * 5) * 0.22;
  for (const dog of world.dogs) {
    if (dog.rescued) continue;
    const dx = mapX + dog.x * sx;
    const dy = mapY + dog.y * sy;

    ctx.fillStyle = sniffBoost ? 'rgba(247, 198, 91, 0.35)' : 'rgba(230, 108, 90, 0.32)';
    ctx.beginPath();
    ctx.arc(dx, dy, (isCompact ? 5.5 : 6.5) * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = sniffBoost ? '#F7C65B' : '#E66C5A';
    ctx.strokeStyle = '#FFFDF6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(dx, dy, isCompact ? 2.6 : 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (!isCompact || sniffBoost) {
      ctx.font = '700 8px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFDF6';
      ctx.fillText(dog.profile.name, dx, dy - 6);
    }
  }

  // Ellehcim marker
  const px = mapX + player.x * sx;
  const py = mapY + player.y * sy;
  ctx.fillStyle = '#FFFDF6';
  ctx.strokeStyle = '#E66C5A';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(px, py, isCompact ? 3 : 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawBeachAndOcean(
  ctx: CanvasRenderingContext2D,
  beachProps: BeachProp[],
  time: number
): void {
  ctx.save();

  // Warm golden sand cove blending softly with meadow
  ctx.fillStyle = '#E6CC96';
  ctx.beginPath();
  ctx.ellipse(1200, 1595, 420, 210, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lighter warm sand inner shoreline
  ctx.fillStyle = '#F2DCAB';
  ctx.beginPath();
  ctx.ellipse(1200, 1605, 370, 170, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wet sand strip near waves
  const waveShift = Math.sin(time * 2.1) * 7;
  ctx.fillStyle = '#C9AC77';
  ctx.fillRect(790, BEACH_SHORE_Y - 14, 820, 40);

  // Turquoise ocean water at bottom edge (x: 780..1620)
  ctx.fillStyle = '#3B89AD';
  ctx.fillRect(780, BEACH_SHORE_Y + 8, 840, WORLD_HEIGHT - BEACH_SHORE_Y);

  // Animated seafoam shoreline edge
  ctx.fillStyle = '#6CC2D9';
  ctx.beginPath();
  ctx.moveTo(780, BEACH_SHORE_Y + 12);
  for (let wx = 780; wx <= 1620; wx += 40) {
    const wy = BEACH_SHORE_Y + 4 + Math.sin(wx * 0.025 + time * 2.4) * 5 + waveShift * 0.4;
    ctx.lineTo(wx, wy);
  }
  ctx.lineTo(1620, BEACH_SHORE_Y + 42);
  ctx.lineTo(780, BEACH_SHORE_Y + 42);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 253, 246, 0.78)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let wx = 790; wx <= 1610; wx += 40) {
    const wy = BEACH_SHORE_Y + 4 + Math.sin(wx * 0.025 + time * 2.4) * 5 + waveShift * 0.4;
    if (wx === 790) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  ctx.stroke();

  // Small shells & starfish on the sand
  for (const bp of beachProps) {
    if (bp.kind === 'shell') {
      ctx.fillStyle = bp.color;
      ctx.strokeStyle = '#A48863';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 6, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (bp.kind === 'starfish') {
      ctx.fillStyle = bp.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const r = 7;
        ctx.lineTo(bp.x + Math.cos(a) * r, bp.y + Math.sin(a) * r);
        const a2 = a + Math.PI / 5;
        ctx.lineTo(bp.x + Math.cos(a2) * 3, bp.y + Math.sin(a2) * 3);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  void BEACH_SAND_TOP_Y;
  ctx.restore();
}

function drawBeachUmbrella(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);

  // Ground shadow
  ctx.fillStyle = 'rgba(120, 95, 55, 0.28)';
  ctx.beginPath();
  ctx.ellipse(8, 12, 26, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wooden pole
  ctx.strokeStyle = '#754F32';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(0, -32);
  ctx.stroke();

  // Umbrella canopy
  ctx.fillStyle = color;
  ctx.strokeStyle = '#2B211A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -32, 26, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cream stripe
  ctx.fillStyle = '#FFFDF5';
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(-10, -32);
  ctx.lineTo(10, -32);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawMarcos(
  ctx: CanvasRenderingContext2D,
  marcos: MarcosEntity,
  time: number,
  player: PlayerRenderState
): void {
  const speed = Math.hypot(marcos.vx, marcos.vy);
  const moving = speed > 12;
  const bob = moving ? Math.abs(Math.sin(marcos.walkPhase)) * 3.2 : Math.sin(time * 2.2) * 1;
  const legSwing = moving ? Math.sin(marcos.walkPhase) * 5.5 : 0;
  const dir = marcos.joined ? marcos.facing : player.x >= marcos.x ? 1 : -1;

  ctx.save();
  ctx.translate(marcos.x, marcos.y);

  // Friendly beacon ring if waiting at beach
  if (!marcos.joined) {
    const pulse = 0.45 + Math.sin(time * 3.5) * 0.2;
    ctx.strokeStyle = `rgba(79, 184, 175, ${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 12, 26, 13, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shadow
  ctx.fillStyle = 'rgba(20, 32, 24, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 15, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);
  ctx.scale(dir * (1 + marcos.squash * 0.16), 1 - marcos.squash * 0.14);

  // Legs (tan shorts + sandals)
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#B87F56';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-5, 4);
  ctx.lineTo(-5 + legSwing * 0.5, 13);
  ctx.moveTo(5, 4);
  ctx.lineTo(5 - legSwing * 0.5, 13);
  ctx.stroke();

  // Sandals
  ctx.fillStyle = '#6E4C32';
  ctx.beginPath();
  ctx.ellipse(-5 + legSwing * 0.5, 14, 4.5, 2.8, 0, 0, Math.PI * 2);
  ctx.ellipse(5 - legSwing * 0.5, 14, 4.5, 2.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Khaki beach shorts
  ctx.fillStyle = '#D5BC8B';
  ctx.strokeStyle = '#3B2F23';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-9, 1, 18, 7, 3);
  ctx.fill();
  ctx.stroke();

  // Breezy coastal teal shirt
  ctx.fillStyle = '#3B9B94';
  ctx.strokeStyle = '#244A47';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-10, -12, 20, 15, 5);
  ctx.fill();
  ctx.stroke();

  // Arms
  ctx.strokeStyle = '#B87F56';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(-10, -8);
  ctx.lineTo(-13, 2 - legSwing * 0.4);
  ctx.moveTo(10, -8);
  ctx.lineTo(13, 2 + legSwing * 0.4);
  ctx.stroke();

  // Head
  ctx.fillStyle = '#B87F56';
  ctx.strokeStyle = '#3B281E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -21, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Short wavy dark hair
  ctx.fillStyle = '#291E19';
  ctx.beginPath();
  ctx.arc(0, -24, 10.5, Math.PI * 0.9, Math.PI * 2.1);
  ctx.quadraticCurveTo(3, -27, -4, -24);
  ctx.closePath();
  ctx.fill();

  // Eyes & smile
  ctx.fillStyle = '#181412';
  ctx.beginPath();
  ctx.arc(2, -20, 1.4, 0, Math.PI * 2);
  ctx.arc(6.5, -20, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6B3D2E';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(4, -17.5, 2.6, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();

  // Unflipped nameplate or speech bubble
  ctx.save();
  ctx.translate(marcos.x, marcos.y - 36 - bob);
  ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(20, 32, 24, 0.9)';
  if (!marcos.joined) {
    ctx.strokeText('Marcos', 0, -2);
    ctx.fillStyle = '#BFF6F0';
    ctx.fillText('Marcos', 0, -2);
  } else if (marcos.talkTimer > 0 && marcos.talkText) {
    ctx.strokeText(marcos.talkText, 0, -4);
    ctx.fillStyle = '#FFFDF7';
    ctx.fillText(marcos.talkText, 0, -4);
  }
  ctx.restore();
}

function drawChucha(
  ctx: CanvasRenderingContext2D,
  chucha: ChuchaEntity,
  time: number,
  player: PlayerRenderState
): void {
  const p = CHUCHA_PROFILE;
  const speed = Math.hypot(chucha.vx, chucha.vy);
  const isMoving = speed > 10;
  const bob = isMoving ? Math.abs(Math.sin(chucha.walkPhase)) * 2.6 : Math.sin(time * 3.2) * 1;
  const dir = chucha.joined ? chucha.facing : player.x >= chucha.x ? 1 : -1;

  ctx.save();
  ctx.translate(chucha.x, chucha.y);

  // Shadow
  ctx.fillStyle = 'rgba(18, 30, 20, 0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 13, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -bob);
  ctx.scale(dir * 0.96 * (1 + chucha.squash * 0.18), 0.96 * (1 - chucha.squash * 0.15));

  // Wagging white tail
  const wag = Math.sin(time * 13 + chucha.walkPhase) * 0.45;
  ctx.save();
  ctx.translate(-12, -2);
  ctx.rotate(wag - 0.5);
  ctx.strokeStyle = p.coatColor;
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-8, -4, -12, -9);
  ctx.stroke();
  ctx.restore();

  // Legs
  const legSwing = isMoving ? Math.sin(chucha.walkPhase) * 4 : 0;
  ctx.strokeStyle = p.coatColor;
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.lineTo(-7 + legSwing, 10);
  ctx.moveTo(-2, 4);
  ctx.lineTo(-2 - legSwing, 10);
  ctx.moveTo(5, 4);
  ctx.lineTo(5 + legSwing, 10);
  ctx.moveTo(9, 4);
  ctx.lineTo(9 - legSwing, 10);
  ctx.stroke();

  // White body
  ctx.fillStyle = p.coatColor;
  ctx.strokeStyle = '#241B17';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13.5, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // A few distinct dark spots on Chucha's white coat!
  ctx.fillStyle = p.spotColor;
  ctx.beginPath();
  ctx.ellipse(-4, -3, 3.8, 2.8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, 2.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-8, 2, 2.1, 0, Math.PI * 2);
  ctx.fill();

  // Coastal teal collar
  ctx.strokeStyle = p.collarColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.lineTo(10, 4);
  ctx.stroke();

  // Head
  const headX = 10;
  const headY = -7;
  ctx.fillStyle = p.coatColor;
  ctx.strokeStyle = '#241B17';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(headX, headY, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cute dark spot around one ear / crown
  ctx.fillStyle = p.spotColor;
  ctx.beginPath();
  ctx.arc(headX - 3, headY - 4, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Ear
  ctx.fillStyle = p.spotColor;
  ctx.strokeStyle = '#241B17';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(headX - 4, headY - 4, 3.5, 6, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Nose & Eye
  ctx.fillStyle = p.noseColor;
  ctx.beginPath();
  ctx.arc(headX + 8.5, headY + 1.5, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#181412';
  ctx.beginPath();
  ctx.arc(headX + 4.5, headY - 2, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Unflipped nameplate or bark
  ctx.save();
  ctx.translate(chucha.x, chucha.y - 26 - bob);
  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(20, 32, 24, 0.88)';
  if (!chucha.joined) {
    ctx.strokeText('Chucha', 0, -2);
    ctx.fillStyle = '#FFFDF6';
    ctx.fillText('Chucha', 0, -2);
  } else if (chucha.barkTimer > 0 && chucha.barkText) {
    ctx.strokeText(chucha.barkText, 0, -6);
    ctx.fillStyle = '#D5F7F2';
    ctx.fillText(chucha.barkText, 0, -6);
  }
  ctx.restore();
}
