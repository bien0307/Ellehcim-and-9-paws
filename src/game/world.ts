import {
  BrambleObstacle,
  ChuchaEntity,
  Critter,
  DOG_PROFILES,
  DogEntity,
  FlowerPatch,
  MarcosEntity,
  StoneProp,
  TreatItem,
  TreeProp,
  WindGust,
} from './types';

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1800;

export interface ZoneInfo {
  name: string;
  x: number;
  y: number;
  radius: number;
}

export const ZONES: ZoneInfo[] = [
  { name: 'Home Meadow', x: 1200, y: 920, radius: 340 },
  { name: 'Sunbeam Meadow', x: 1960, y: 1440, radius: 420 },
  { name: 'Mossy Stone Arches', x: 460, y: 420, radius: 420 },
  { name: 'Creekside Clearing', x: 1960, y: 420, radius: 420 },
  { name: 'Clover Hollow', x: 460, y: 1420, radius: 420 },
  { name: 'Lantern Ridge', x: 1200, y: 240, radius: 360 },
  { name: 'Golden Cove Beach', x: 1200, y: 1550, radius: 380 },
];

export const BEACH_SAND_TOP_Y = 1410;
export const BEACH_SHORE_Y = 1640;

export interface CreekRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Creek runs diagonally/curved in NE quadrant, with two safe stone bridge crossings
export interface BridgeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BeachProp {
  x: number;
  y: number;
  kind: 'shell' | 'starfish' | 'umbrella';
  color: string;
}

export interface WorldData {
  dogs: DogEntity[];
  marcos: MarcosEntity;
  chucha: ChuchaEntity;
  beachProps: BeachProp[];
  brambles: BrambleObstacle[];
  flowers: FlowerPatch[];
  critters: Critter[];
  gusts: WindGust[];
  treats: TreatItem[];
  trees: TreeProp[];
  stones: StoneProp[];
  creekSegments: CreekRect[];
  bridges: BridgeRect[];
}

export function getZoneName(x: number, y: number): string {
  let best = 'Whispering Trails';
  let bestDist = Infinity;
  for (const z of ZONES) {
    const d = Math.hypot(x - z.x, y - z.y);
    if (d < z.radius && d < bestDist) {
      bestDist = d;
      best = z.name;
    }
  }
  return best;
}

// Deterministic pseudo-random generator so each run has a crisp, reliable layout
function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWorld(): WorldData {
  const rand = mulberry32(202609);

  // Lost dog home coordinates
  const lostLocations: Record<string, { x: number; y: number }> = {
    scoob: { x: 2040, y: 1480 },
    stormy: { x: 410, y: 390 },
    cloudy: { x: 2050, y: 380 },
    sunny: { x: 430, y: 1460 },
    dang: { x: 1200, y: 210 },
  };

  const dogs: DogEntity[] = DOG_PROFILES.map((profile, idx) => {
    if (profile.startingCompanion) {
      const angle = (idx / 4) * Math.PI * 2 + 0.6;
      return {
        profile,
        x: 1200 + Math.cos(angle) * 52,
        y: 920 + Math.sin(angle) * 52,
        vx: 0,
        vy: 0,
        facing: 1,
        rescued: true,
        calmProgress: 1,
        needsLove: false,
        walkPhase: idx * 1.3,
        squash: 0,
        barkTimer: 0,
        barkText: null,
      };
    }
    const loc = lostLocations[profile.id] ?? { x: 1200, y: 400 };
    return {
      profile,
      x: loc.x,
      y: loc.y,
      vx: 0,
      vy: 0,
      facing: -1,
      rescued: false,
      calmProgress: 0,
      needsLove: true,
      walkPhase: idx * 0.9,
      squash: 0,
      barkTimer: 0,
      barkText: null,
    };
  });

  // Creek segments separating NE Clearing (Cloudy) with two wide stone bridges
  const creekSegments: CreekRect[] = [
    { x: 1580, y: 40, w: 68, h: 250 },
    { x: 1580, y: 390, w: 68, h: 220 },
    { x: 1648, y: 540, w: 280, h: 68 },
    { x: 2030, y: 540, w: 330, h: 68 },
  ];

  const bridges: BridgeRect[] = [
    { x: 1572, y: 290, w: 84, h: 100 }, // West-to-East bridge to Cloudy
    { x: 1928, y: 532, w: 102, h: 84 }, // South-to-North bridge to Cloudy
  ];

  // Thorny brambles guarding Scoob (SE), Dang (North), and optional treat coves
  const brambles: BrambleObstacle[] = [
    // Guarding Sunbeam Meadow (Scoob)
    { id: 'br-1', x: 1810, y: 1360, radius: 34, cleared: false, shakeTimer: 0 },
    { id: 'br-2', x: 1850, y: 1435, radius: 34, cleared: false, shakeTimer: 0 },
    { id: 'br-3', x: 1895, y: 1510, radius: 34, cleared: false, shakeTimer: 0 },
    // Guarding Lantern Ridge (Dang)
    { id: 'br-4', x: 1120, y: 390, radius: 34, cleared: false, shakeTimer: 0 },
    { id: 'br-5', x: 1200, y: 380, radius: 34, cleared: false, shakeTimer: 0 },
    { id: 'br-6', x: 1280, y: 390, radius: 34, cleared: false, shakeTimer: 0 },
    // Side bramble caches with treats
    { id: 'br-7', x: 920, y: 1260, radius: 32, cleared: false, shakeTimer: 0 },
    { id: 'br-8', x: 1500, y: 800, radius: 32, cleared: false, shakeTimer: 0 },
  ];

  // Sleeping wildflower patches across the valley (Spread Love blooms them!)
  const petalPalette = ['#F47C7C', '#F7C65B', '#F09BB8', '#90C4F8', '#F8A96B'];
  const flowerCoords: Array<[number, number]> = [
    [1100, 820],
    [1310, 840],
    [1340, 1040],
    [940, 680],
    [720, 560],
    [520, 480],
    [350, 520],
    [820, 1120],
    [600, 1290],
    [480, 1360],
    [340, 1480],
    [520, 1550],
    [1520, 1140],
    [1720, 1280],
    [1940, 1340],
    [2120, 1410],
    [1440, 580],
    [1760, 440],
    [1940, 320],
    [2120, 460],
    [1060, 470],
    [1330, 470],
    [1130, 260],
    [1270, 260],
  ];

  const flowers: FlowerPatch[] = flowerCoords.map(([x, y], idx) => ({
    id: `fl-${idx}`,
    x,
    y,
    radius: 30,
    bloomed: false,
    bloomAnim: 0,
    petalColor: petalPalette[idx % petalPalette.length],
  }));

  // Woodland critters: grumpy boars/crows (telegraphed bump unless calmed with Love!) & shy squirrels/hedgehogs
  const critters: Critter[] = [
    // Near Center & Trails (friendly/shy intro)
    {
      id: 'cr-1',
      kind: 'squirrel',
      x: 1020,
      y: 960,
      homeX: 1020,
      homeY: 960,
      vx: 0,
      vy: 0,
      radius: 18,
      mood: 'shy',
      patrolAngle: 0,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    {
      id: 'cr-2',
      kind: 'hedgehog',
      x: 1380,
      y: 940,
      homeX: 1380,
      homeY: 940,
      vx: 0,
      vy: 0,
      radius: 18,
      mood: 'shy',
      patrolAngle: 1.4,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    // Sunbeam Meadow (Scoob area)
    {
      id: 'cr-3',
      kind: 'crow',
      x: 1940,
      y: 1410,
      homeX: 1940,
      homeY: 1410,
      vx: 0,
      vy: 0,
      radius: 20,
      mood: 'grumpy',
      patrolAngle: 0.5,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    {
      id: 'cr-4',
      kind: 'kitten',
      x: 1650,
      y: 1380,
      homeX: 1650,
      homeY: 1380,
      vx: 0,
      vy: 0,
      radius: 18,
      mood: 'shy',
      patrolAngle: 2.1,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    // Mossy Arches (Stormy area)
    {
      id: 'cr-5',
      kind: 'boar',
      x: 560,
      y: 520,
      homeX: 560,
      homeY: 520,
      vx: 0,
      vy: 0,
      radius: 22,
      mood: 'grumpy',
      patrolAngle: 1.1,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    {
      id: 'cr-6',
      kind: 'hedgehog',
      x: 690,
      y: 360,
      homeX: 690,
      homeY: 360,
      vx: 0,
      vy: 0,
      radius: 18,
      mood: 'shy',
      patrolAngle: 0,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    // Creekside Clearing (Cloudy area)
    {
      id: 'cr-7',
      kind: 'boar',
      x: 1890,
      y: 380,
      homeX: 1890,
      homeY: 380,
      vx: 0,
      vy: 0,
      radius: 22,
      mood: 'grumpy',
      patrolAngle: 2.6,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    {
      id: 'cr-8',
      kind: 'squirrel',
      x: 2130,
      y: 290,
      homeX: 2130,
      homeY: 290,
      vx: 0,
      vy: 0,
      radius: 18,
      mood: 'shy',
      patrolAngle: 0.7,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    // Clover Hollow (Sunny area)
    {
      id: 'cr-9',
      kind: 'squirrel',
      x: 520,
      y: 1470,
      homeX: 520,
      homeY: 1470,
      vx: 0,
      vy: 0,
      radius: 18,
      mood: 'shy',
      patrolAngle: 1.7,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    {
      id: 'cr-10',
      kind: 'crow',
      x: 680,
      y: 1320,
      homeX: 680,
      homeY: 1320,
      vx: 0,
      vy: 0,
      radius: 20,
      mood: 'grumpy',
      patrolAngle: 0.2,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    // Lantern Ridge (Dang area)
    {
      id: 'cr-11',
      kind: 'boar',
      x: 1120,
      y: 250,
      homeX: 1120,
      homeY: 250,
      vx: 0,
      vy: 0,
      radius: 23,
      mood: 'grumpy',
      patrolAngle: 0.9,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
    {
      id: 'cr-12',
      kind: 'crow',
      x: 1290,
      y: 250,
      homeX: 1290,
      homeY: 250,
      vx: 0,
      vy: 0,
      radius: 20,
      mood: 'grumpy',
      patrolAngle: 2.3,
      chargeWindup: 0,
      chargeTimer: 0,
      chargeDirX: 0,
      chargeDirY: 0,
      squash: 0,
      loveCooldown: 0,
    },
  ];

  // Swirling gentle wind gusts near Mossy Arches & Lantern Ridge
  const gusts: WindGust[] = [
    { id: 'wg-1', x: 520, y: 420, baseX: 520, baseY: 420, radius: 28, phase: 0, range: 110, speed: 1.5, axis: 'y' },
    { id: 'wg-2', x: 430, y: 290, baseX: 430, baseY: 290, radius: 26, phase: 1.6, range: 100, speed: 1.7, axis: 'x' },
    { id: 'wg-3', x: 1200, y: 310, baseX: 1200, baseY: 310, radius: 26, phase: 0.8, range: 140, speed: 1.8, axis: 'x' },
  ];

  // Dog treats scattered along trails and behind brambles
  const treatCoords: Array<{ x: number; y: number; revealed: boolean }> = [
    { x: 910, y: 1320, revealed: false },
    { x: 1550, y: 780, revealed: false },
    { x: 760, y: 740, revealed: true },
    { x: 1460, y: 1180, revealed: true },
    { x: 1620, y: 340, revealed: true },
    { x: 1190, y: 560, revealed: true },
    { x: 640, y: 1160, revealed: false },
    { x: 2080, y: 1320, revealed: false },
  ];

  const treats: TreatItem[] = treatCoords.map((t, i) => ({
    id: `tr-${i}`,
    x: t.x,
    y: t.y,
    collected: false,
    revealed: t.revealed,
    bobPhase: i * 0.9,
  }));

  // Stone props & mossy arches
  const stones: StoneProp[] = [
    // Mossy Stone Arches landmark in NW
    { x: 350, y: 350, radius: 34, isArch: true },
    { x: 510, y: 300, radius: 34, isArch: true },
    { x: 280, y: 460, radius: 26 },
    // Lantern Ridge stones
    { x: 1040, y: 160, radius: 28, isArch: true },
    { x: 1360, y: 160, radius: 28, isArch: true },
    // Scattered meadow boulders
    { x: 860, y: 900, radius: 22 },
    { x: 1480, y: 1020, radius: 24 },
    { x: 1750, y: 1560, radius: 26 },
    { x: 650, y: 1540, radius: 24 },
  ];

  // Place trees carefully around landmarks and clearings while keeping trails & beach open
  const trees: TreeProp[] = [];
  const keepClearPoints: Array<{ x: number; y: number; r: number }> = [
    { x: 1200, y: 920, r: 210 }, // Home meadow
    { x: 2040, y: 1480, r: 220 }, // Scoob
    { x: 410, y: 390, r: 220 }, // Stormy
    { x: 2050, y: 380, r: 220 }, // Cloudy
    { x: 430, y: 1460, r: 220 }, // Sunny
    { x: 1200, y: 210, r: 220 }, // Dang
    { x: 1200, y: 1520, r: 320 }, // Golden Cove Beach (Marcos & Chucha)
    { x: 1200, y: 1200, r: 150 }, // South beach trail
    // Path corridors
    { x: 920, y: 740, r: 140 },
    { x: 680, y: 560, r: 140 },
    { x: 1480, y: 1120, r: 140 },
    { x: 1780, y: 1340, r: 150 },
    { x: 900, y: 1120, r: 140 },
    { x: 660, y: 1300, r: 150 },
    { x: 1200, y: 650, r: 130 },
    { x: 1200, y: 420, r: 140 },
    { x: 1614, y: 340, r: 130 }, // Bridge 1
    { x: 1979, y: 574, r: 130 }, // Bridge 2
  ];

  // Outer perimeter forest border (leave South Beach shoreline open from x=860..1540!)
  for (let x = 60; x <= WORLD_WIDTH - 60; x += 130) {
    trees.push({ x: x + (rand() - 0.5) * 30, y: 55 + rand() * 20, radius: 24, canopyRadius: 56, variant: rand() > 0.4 ? 'pine' : 'oak' });
    if (x < 840 || x > 1560) {
      trees.push({ x: x + (rand() - 0.5) * 30, y: WORLD_HEIGHT - 55 - rand() * 20, radius: 24, canopyRadius: 56, variant: rand() > 0.4 ? 'oak' : 'pine' });
    }
  }
  for (let y = 160; y <= WORLD_HEIGHT - 160; y += 130) {
    trees.push({ x: 55 + rand() * 20, y: y + (rand() - 0.5) * 30, radius: 24, canopyRadius: 56, variant: 'pine' });
    trees.push({ x: WORLD_WIDTH - 55 - rand() * 20, y: y + (rand() - 0.5) * 30, radius: 24, canopyRadius: 56, variant: 'oak' });
  }

  // Interior scenic trees (keep sand beach area clear)
  for (let i = 0; i < 62; i++) {
    const tx = 160 + rand() * (WORLD_WIDTH - 320);
    const ty = 150 + rand() * (BEACH_SAND_TOP_Y - 210);

    // Ensure it doesn't block clear zones, creek, bridges, stones, or brambles
    let blocked = false;
    for (const kp of keepClearPoints) {
      if (Math.hypot(tx - kp.x, ty - kp.y) < kp.r) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      for (const c of creekSegments) {
        if (tx > c.x - 70 && tx < c.x + c.w + 70 && ty > c.y - 70 && ty < c.y + c.h + 70) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) {
      for (const br of brambles) {
        if (Math.hypot(tx - br.x, ty - br.y) < 110) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) {
      for (const fl of flowers) {
        if (Math.hypot(tx - fl.x, ty - fl.y) < 80) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) {
      for (const tr of trees) {
        if (Math.hypot(tx - tr.x, ty - tr.y) < 120) {
          blocked = true;
          break;
        }
      }
    }
    if (!blocked) {
      const rPick = rand();
      const variant: TreeProp['variant'] = rPick < 0.28 ? 'blossom' : rPick < 0.64 ? 'oak' : 'pine';
      trees.push({
        x: tx,
        y: ty,
        radius: 22,
        canopyRadius: 48 + rand() * 14,
        variant,
      });
    }
  }

  // Marcos & Chucha waiting together at Golden Cove Beach!
  const marcos: MarcosEntity = {
    x: 1185,
    y: 1555,
    vx: 0,
    vy: 0,
    facing: 1,
    walkPhase: 0,
    squash: 0,
    joined: false,
    talkTimer: 0,
    talkText: null,
  };

  const chucha: ChuchaEntity = {
    x: 1235,
    y: 1565,
    vx: 0,
    vy: 0,
    facing: -1,
    walkPhase: 0.5,
    squash: 0,
    joined: false,
    barkTimer: 0,
    barkText: null,
  };

  const beachProps: BeachProp[] = [
    { x: 1095, y: 1510, kind: 'umbrella', color: '#E66C5A' },
    { x: 1320, y: 1530, kind: 'umbrella', color: '#4B8FB5' },
    { x: 1020, y: 1605, kind: 'shell', color: '#F7E7CE' },
    { x: 1140, y: 1618, kind: 'starfish', color: '#E97D5E' },
    { x: 1280, y: 1612, kind: 'shell', color: '#F3D2C1' },
    { x: 1390, y: 1600, kind: 'starfish', color: '#E97D5E' },
  ];

  return {
    dogs,
    marcos,
    chucha,
    beachProps,
    brambles,
    flowers,
    critters,
    gusts,
    treats,
    trees,
    stones,
    creekSegments,
    bridges,
  };
}
