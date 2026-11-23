export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'STORY' | 'VICTORY' | 'GAME_OVER';

export type DogId =
  | 'spotty'
  | 'spikey'
  | 'julie'
  | 'potato'
  | 'scoob'
  | 'stormy'
  | 'cloudy'
  | 'sunny'
  | 'dang';

export interface DogProfile {
  id: DogId;
  name: string;
  gender: 'Boy' | 'Girl';
  ageGroup: 'Adult' | 'Puppy';
  breedOrType: string;
  description: string;
  startingCompanion: boolean;
  coatColor: string;
  secondaryColor: string;
  earStyle: 'border' | 'beagle' | 'fluffy' | 'perky' | 'pointed' | 'terrier';
  tailStyle: 'long' | 'short' | 'fluffy' | 'curled';
  noseColor: string;
  sizeScale: number;
  chubby?: boolean;
  muscular?: boolean;
  bigNose?: boolean;
  hasHalo?: boolean;
  floating?: boolean;
  spotColor?: string;
  leftFaceMaskColor?: string;
  leftEyeColor?: string;
  rightEyeColor?: string;
  collarColor: string;
  rescueHint: string;
  rescueLine: string;
}

export const DOG_PROFILES: DogProfile[] = [
  {
    id: 'spotty',
    name: 'Spotty',
    gender: 'Girl',
    ageGroup: 'Adult',
    breedOrType: 'Border Collie Mix',
    description: 'Loyal brown-and-white spotted border collie mix girl with a unique brown mask on the left side of her face.',
    startingCompanion: true,
    coatColor: '#F6F3EC',
    secondaryColor: '#8C5230',
    spotColor: '#8C5230',
    leftFaceMaskColor: '#754124',
    earStyle: 'border',
    tailStyle: 'fluffy',
    noseColor: '#1E1B18',
    sizeScale: 1.05,
    collarColor: '#D95D47',
    rescueHint: 'Always by Ellehcim’s side.',
    rescueLine: 'Spotty’s sharp eyes are ready to track the pack!',
  },
  {
    id: 'spikey',
    name: 'Spikey',
    gender: 'Boy',
    ageGroup: 'Puppy',
    breedOrType: 'Half-Aspin · Beagle-Eared Pup',
    description: 'Brown half-aspin boy puppy with a big black nose and beagle-shaped floppy ears.',
    startingCompanion: true,
    coatColor: '#9A5B32',
    secondaryColor: '#DFB98C',
    earStyle: 'beagle',
    tailStyle: 'long',
    noseColor: '#141110',
    bigNose: true,
    sizeScale: 0.78,
    collarColor: '#3A7D5C',
    rescueHint: 'Always by Ellehcim’s side.',
    rescueLine: 'Spikey’s beagle ears perk up at every trail!',
  },
  {
    id: 'julie',
    name: 'Julie',
    gender: 'Girl',
    ageGroup: 'Puppy',
    breedOrType: 'Half-Aspin · Fluffy Chubby Pup',
    description: 'A fluffy, chubby half-aspin girl puppy with a sweet small nose whose warm cuddles spread calm and love.',
    startingCompanion: true,
    coatColor: '#E8CFA8',
    secondaryColor: '#FBF4E6',
    earStyle: 'fluffy',
    tailStyle: 'fluffy',
    noseColor: '#3B2822',
    sizeScale: 0.76,
    chubby: true,
    collarColor: '#E57A6B',
    rescueHint: 'Always by Ellehcim’s side.',
    rescueLine: 'Julie’s fluffiness spreads warmth everywhere!',
  },
  {
    id: 'potato',
    name: 'Potato',
    gender: 'Girl',
    ageGroup: 'Puppy',
    breedOrType: 'Half-Aspin · Short-Tailed Pup',
    description: 'A playful, short-tempered half-aspin girl puppy with a unique short tail—her feisty dash busts through thorny brambles!',
    startingCompanion: true,
    coatColor: '#C98A4B',
    secondaryColor: '#F5DFC2',
    earStyle: 'perky',
    tailStyle: 'short',
    noseColor: '#2E2019',
    sizeScale: 0.74,
    collarColor: '#E9A825',
    rescueHint: 'Always by Ellehcim’s side.',
    rescueLine: 'Potato’s short tail wags like a tiny propeller!',
  },
  {
    id: 'scoob',
    name: 'Scoob',
    gender: 'Boy',
    ageGroup: 'Puppy',
    breedOrType: 'Brown Puppy',
    description: 'Sweet brown boy puppy with a blue left eye and yellow right eye, caught behind thorny brambles in Sunbeam Meadow.',
    startingCompanion: false,
    coatColor: '#8B542E',
    secondaryColor: '#B57948',
    earStyle: 'border',
    tailStyle: 'long',
    noseColor: '#231914',
    sizeScale: 0.8,
    leftEyeColor: '#3B9EFF',
    rightEyeColor: '#F5C438',
    collarColor: '#2F8B85',
    rescueHint: 'South-East Sunbeam Meadow behind thorny brambles.',
    rescueLine: 'Scoob bounds into your arms, his blue and yellow eyes shining with joy!',
  },
  {
    id: 'stormy',
    name: 'Stormy',
    gender: 'Boy',
    ageGroup: 'Adult',
    breedOrType: 'Latte Pointed-Ear Dog',
    description: 'Warm latte-colored dog with alert pointed ears waiting near the Mossy Stone Arches.',
    startingCompanion: false,
    coatColor: '#C5A27D',
    secondaryColor: '#EDE0CF',
    earStyle: 'pointed',
    tailStyle: 'curled',
    noseColor: '#2D211B',
    sizeScale: 1.04,
    collarColor: '#5B7096',
    rescueHint: 'North-West Mossy Stone Arches amid swirling breezes.',
    rescueLine: 'Stormy shakes off the mist and rejoins the pack!',
  },
  {
    id: 'cloudy',
    name: 'Cloudy',
    gender: 'Boy',
    ageGroup: 'Puppy',
    breedOrType: 'Half-Aspin · Muscular Brown Pup',
    description: 'A sturdy, muscular brown half-aspin boy puppy standing brave across the Creekside Stepping Stones.',
    startingCompanion: false,
    coatColor: '#78482A',
    secondaryColor: '#A96F49',
    earStyle: 'perky',
    tailStyle: 'short',
    noseColor: '#231814',
    sizeScale: 0.84,
    muscular: true,
    collarColor: '#4E7FA8',
    rescueHint: 'North-East Creekside Clearing past the stone crossing.',
    rescueLine: 'Cloudy puffs out his chest proudly—back with Mom!',
  },
  {
    id: 'sunny',
    name: 'Sunny',
    gender: 'Girl',
    ageGroup: 'Puppy',
    breedOrType: 'Half-Aspin · Angel Brown Pup',
    description: 'Sweet brown half-aspin girl puppy with pointed ears, a glowing golden halo, floating gently above Clover Hollow.',
    startingCompanion: false,
    coatColor: '#A66C3E',
    secondaryColor: '#F3DFC1',
    earStyle: 'pointed',
    tailStyle: 'fluffy',
    noseColor: '#3B231D',
    sizeScale: 0.74,
    hasHalo: true,
    floating: true,
    collarColor: '#F2B84B',
    rescueHint: 'South-West Clover Hollow floating gently beside sleeping wildflowers.',
    rescueLine: 'Sunny floats softly down with her golden halo shining warm love!',
  },
  {
    id: 'dang',
    name: 'Dang',
    gender: 'Girl',
    ageGroup: 'Puppy',
    breedOrType: 'Half-Aspin · White Lab-Terrier Mix',
    description: 'Bright white half-aspin Labrador and terrier mix girl puppy with a charming pink nose at Lantern Ridge.',
    startingCompanion: false,
    coatColor: '#F7F5EE',
    secondaryColor: '#E5DFD0',
    earStyle: 'terrier',
    tailStyle: 'long',
    noseColor: '#EC8B9B',
    sizeScale: 0.8,
    collarColor: '#C85B7B',
    rescueHint: 'Far North Lantern Ridge guarded by grumpy briar critters.',
    rescueLine: 'Dang boops Ellehcim’s hand with her pink nose!',
  },
];

export interface ChuchaProfile {
  id: 'chucha';
  name: string;
  gender: 'Girl';
  description: string;
  coatColor: string;
  spotColor: string;
  earStyle: 'border';
  tailStyle: 'long';
  noseColor: string;
  collarColor: string;
}

export const CHUCHA_PROFILE: ChuchaProfile = {
  id: 'chucha',
  name: 'Chucha',
  gender: 'Girl',
  description: 'Marcos’s bright white girl dog with a few dark spots and a keen coastal nose.',
  coatColor: '#F9F7F1',
  spotColor: '#292628',
  earStyle: 'border',
  tailStyle: 'long',
  noseColor: '#251F1D',
  collarColor: '#3BA39C',
};

export interface MarcosEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  walkPhase: number;
  squash: number;
  joined: boolean;
  talkTimer: number;
  talkText: string | null;
}

export interface ChuchaEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  walkPhase: number;
  squash: number;
  joined: boolean;
  barkTimer: number;
  barkText: string | null;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface DogEntity {
  profile: DogProfile;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number; // -1 left, 1 right
  rescued: boolean;
  calmProgress: number; // 0..1 when found in world before joining
  needsLove: boolean;
  walkPhase: number;
  squash: number;
  barkTimer: number;
  barkText: string | null;
}

export interface BrambleObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  cleared: boolean;
  shakeTimer: number;
}

export interface FlowerPatch {
  id: string;
  x: number;
  y: number;
  radius: number;
  bloomed: boolean;
  bloomAnim: number;
  petalColor: string;
}

export interface Critter {
  id: string;
  kind: 'hedgehog' | 'squirrel' | 'kitten' | 'boar' | 'crow';
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  radius: number;
  mood: 'grumpy' | 'shy' | 'loved';
  patrolAngle: number;
  chargeWindup: number; // >0 means telegraphing bump
  chargeTimer: number;
  chargeDirX: number;
  chargeDirY: number;
  squash: number;
  loveCooldown: number;
}

export interface WindGust {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  phase: number;
  range: number;
  speed: number;
  axis: 'x' | 'y';
}

export interface TreatItem {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  revealed: boolean;
  bobPhase: number;
}

export interface TreeProp {
  x: number;
  y: number;
  radius: number;
  canopyRadius: number;
  variant: 'oak' | 'pine' | 'blossom';
}

export interface StoneProp {
  x: number;
  y: number;
  radius: number;
  isArch?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'heart' | 'spark' | 'dust' | 'petal' | 'leaf' | 'scent' | 'bone';
}

export interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  kind: 'love' | 'sniff';
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface HudSnapshot {
  gameState: GameState;
  warmth: number;
  maxWarmth: number;
  packFullness: number;
  maxPackFullness: number;
  bonesCount: number;
  lovePoints: number;
  rescuedIds: DogId[];
  flowersBloomed: number;
  totalFlowers: number;
  crittersBefriended: number;
  totalCritters: number;
  elapsedSeconds: number;
  loveCooldownRatio: number;
  feedCooldownRatio: number;
  sniffCooldownRatio: number;
  dashCooldownRatio: number;
  activeZoneName: string;
  recentRescue: { id: DogId; name: string; line: string } | null;
  metMarcos: boolean;
  bestScore: number;
  isNewBest: boolean;
}
