import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CHUCHA_PROFILE, DOG_PROFILES, DogProfile } from './types';

interface AnimatedDogRig {
  id: string;
  root: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  tongueMesh: THREE.Mesh;
  haloMesh?: THREE.Mesh;
  groundAura?: THREE.Mesh;
  basePos: THREE.Vector3;
  baseRotY: number;
  baseHeadRotX: number;
  baseHeadRotY: number;
  baseScale: number;
  wagSpeed: number;
  phaseOffset: number;
  floating: boolean;
  isSpotty: boolean;
}

interface FloatingHeartInstance {
  mesh: THREE.Mesh;
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  baseScale: number;
  spinSpeed: number;
}

interface CloudRig {
  group: THREE.Group;
  baseX: number;
  speed: number;
  range: number;
}

export interface TitleDioramaController {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  resize: (width: number, height: number) => void;
  setPointer: (normX: number, normY: number) => void;
  update: (dt: number, elapsed: number) => void;
  dispose: () => void;
}

export function createTitleDioramaScene(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): TitleDioramaController {
  const scene = new THREE.Scene();
  const fogColor = new THREE.Color('#E8D39B');
  scene.background = fogColor;
  scene.fog = new THREE.FogExp2(fogColor, 0.022);

  // Track resources for clean GPU teardown on unmount
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  // PBR IBL Environment via PMREM + RoomEnvironment
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const roomEnv = new RoomEnvironment();
  const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.62;
  roomEnv.dispose();
  pmremGenerator.dispose();

  // Camera
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.1, 140);
  camera.position.set(-1.6, 3.3, 10.0);

  // 3-Point Storybook Sunlight Lighting
  const hemiLight = new THREE.HemisphereLight('#FFF5D6', '#46673A', 0.85);
  hemiLight.position.set(0, 18, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#FFE9B8', 1.85);
  sunLight.position.set(6.5, 11.5, 7.5);
  sunLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 1.5;
    sunLight.shadow.camera.far = 32;
    sunLight.shadow.camera.left = -7.5;
    sunLight.shadow.camera.right = 7.5;
    sunLight.shadow.camera.top = 6.5;
    sunLight.shadow.camera.bottom = -5.5;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
  }
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight('#FFD594', 0.65);
  rimLight.position.set(-6, 5.5, -7);
  scene.add(rimLight);

  // Shared materials cache
  const matCache = new Map<string, THREE.MeshStandardMaterial>();
  const getStdMat = (
    hex: string,
    roughness = 0.78,
    metalness = 0.02,
    extra?: Partial<THREE.MeshStandardMaterialParameters>
  ): THREE.MeshStandardMaterial => {
    const key = `${hex}_${roughness}_${metalness}_${extra?.emissive ?? ''}`;
    const cached = matCache.get(key);
    if (cached) return cached;
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: hex,
        roughness,
        metalness,
        ...extra,
      })
    );
    matCache.set(key, mat);
    return mat;
  };

  // Shared soft radial contact shadow texture
  const shadowTex = trackTex(createContactShadowTexture());
  const contactShadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  const contactShadowGeo = trackGeo(new THREE.PlaneGeometry(1, 1));
  contactShadowGeo.rotateX(-Math.PI / 2);

  // Build Sky Dome & Sun Halo
  buildSkyBackdrop(scene, trackGeo, trackMat, trackTex);

  // Build Drifting 3D Clouds
  const clouds = buildClouds(scene, trackGeo, getStdMat);

  // Build Valley Terrain, Sandy Clearing & Distant Hills
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
  buildMeadowTerrain(scene, trackGeo, trackMat, trackTex, maxAniso);

  // Build Mossy Stone Arch, Woodland Trees & Instanced Wildflowers/Grass
  buildMossyStoneArch(scene, trackGeo, getStdMat, !isSoftwareGl);
  buildStoryTree(scene, -4.6, -2.8, 1.05, trackGeo, getStdMat, !isSoftwareGl);
  buildStoryTree(scene, 4.3, -2.5, 1.16, trackGeo, getStdMat, !isSoftwareGl);
  buildStoryTree(scene, 0.3, -5.2, 0.92, trackGeo, getStdMat, !isSoftwareGl);
  buildInstancedMeadowDetails(scene, trackGeo, trackMat, !isSoftwareGl);

  // Build Ellehcim & Marcos
  const ellehcimRig = buildEllehcimRig(scene, trackGeo, getStdMat, contactShadowGeo, contactShadowMat, !isSoftwareGl);
  const marcosRig = buildMarcosRig(scene, trackGeo, getStdMat, contactShadowGeo, contactShadowMat, !isSoftwareGl);

  // Build All 9 Dogs + Chucha (NO Shiba Inu!)
  const dogRigs: AnimatedDogRig[] = [];

  const addDog = (
    profile: DogProfile,
    x: number,
    y: number,
    z: number,
    rotY: number,
    headRotX: number,
    headRotY: number,
    phaseOffset: number
  ) => {
    const rig = buildDogRig(
      scene,
      profile,
      x,
      y,
      z,
      rotY,
      headRotX,
      headRotY,
      phaseOffset,
      trackGeo,
      trackMat,
      getStdMat,
      contactShadowGeo,
      contactShadowMat,
      !isSoftwareGl
    );
    dogRigs.push(rig);
  };

  const stormy = DOG_PROFILES.find((d) => d.id === 'stormy')!;
  const sunny = DOG_PROFILES.find((d) => d.id === 'sunny')!;
  const dang = DOG_PROFILES.find((d) => d.id === 'dang')!;
  const cloudy = DOG_PROFILES.find((d) => d.id === 'cloudy')!;
  const scoob = DOG_PROFILES.find((d) => d.id === 'scoob')!;
  const spotty = DOG_PROFILES.find((d) => d.id === 'spotty')!;
  const spikey = DOG_PROFILES.find((d) => d.id === 'spikey')!;
  const julie = DOG_PROFILES.find((d) => d.id === 'julie')!;
  const potato = DOG_PROFILES.find((d) => d.id === 'potato')!;

  // Back arc (facing fondly toward Ellehcim & camera)
  addDog(stormy, -2.55, 0.03, -0.95, 0.48, -0.14, 0.16, 0.3);
  addDog(cloudy, -1.85, 0.02, -0.12, 0.52, -0.16, 0.18, 1.4);
  addDog(dang, 1.58, 0.03, -0.78, -0.58, -0.15, -0.18, 2.2);

  // Sunny: Brown girl dog gently FLOATING in mid-air with a glowing golden HALO!
  addDog(sunny, -1.88, 1.72, -0.68, 0.42, 0.14, 0.15, 0.8);

  // Chucha: Marcos's white girl dog with dark spots standing beside Marcos
  const chuchaAsProfile: DogProfile = {
    id: 'spotty',
    name: CHUCHA_PROFILE.name,
    gender: 'Girl',
    ageGroup: 'Adult',
    breedOrType: 'Coastal Companion',
    description: CHUCHA_PROFILE.description,
    startingCompanion: true,
    coatColor: CHUCHA_PROFILE.coatColor,
    secondaryColor: '#EDE9DF',
    spotColor: CHUCHA_PROFILE.spotColor,
    earStyle: CHUCHA_PROFILE.earStyle,
    tailStyle: CHUCHA_PROFILE.tailStyle,
    noseColor: CHUCHA_PROFILE.noseColor,
    sizeScale: 1.0,
    collarColor: CHUCHA_PROFILE.collarColor,
    rescueHint: '',
    rescueLine: '',
  };
  const chuchaRig = buildDogRig(
    scene,
    chuchaAsProfile,
    2.32,
    0.02,
    0.02,
    -0.62,
    -0.15,
    -0.18,
    1.1,
    trackGeo,
    trackMat,
    getStdMat,
    contactShadowGeo,
    contactShadowMat,
    !isSoftwareGl,
    'chucha'
  );
  dogRigs.push(chuchaRig);

  // Foreground arc: Spotty right under Ellehcim's petting hand + Spikey, Julie, Potato, Scoob looking up at Ellehcim!
  addDog(spotty, -1.18, 0.01, 0.52, 0.42, -0.22, 0.18, 0.1);
  addDog(spikey, -0.52, 0.01, 1.28, 0.22, -0.24, 0.12, 1.9);
  addDog(julie, 0.24, 0.01, 1.34, -0.16, -0.22, -0.14, 2.7);
  addDog(potato, 0.98, 0.01, 1.15, -0.36, -0.22, -0.16, 3.5);
  addDog(scoob, 1.66, 0.01, 0.66, -0.46, -0.18, -0.15, 4.1);

  // Pre-allocated 3D Floating Hearts Pool (zero per-frame allocations!)
  const heartPool = buildFloatingHeartPool(scene, trackGeo, trackMat);
  let heartSpawnTimer = 0.2;

  // Responsive Camera State & Pointer Parallax (pre-allocated math vectors)
  let viewW = 1280;
  let viewH = 720;
  let targetCamPos = new THREE.Vector3(-1.8, 3.25, 9.8);
  let targetLookAt = new THREE.Vector3(-1.55, 0.78, 0.15);
  const currentCamPos = targetCamPos.clone();
  const currentLookAt = targetLookAt.clone();
  const pointerTarget = new THREE.Vector2(0, 0);
  const pointerSmooth = new THREE.Vector2(0, 0);
  const tmpCamPos = new THREE.Vector3();
  const tmpLookAt = new THREE.Vector3();

  const updateCameraFraming = () => {
    const aspect = viewW / Math.max(1, viewH);
    const isMobile = viewW < 640;

    if (isMobile) {
      // Portrait framing: push camera further back so all 10 dogs fit across width,
      // and aim lower so the entire diorama sits cleanly in the UPPER half above the bottom UI!
      camera.fov = 44;
      const distZ = THREE.MathUtils.clamp(6.85 / Math.max(0.36, aspect * 0.84), 11.2, 18.8);
      targetCamPos.set(-0.08, 3.85, distZ);
      targetLookAt.set(-0.08, -1.62, 0.18);
    } else {
      // Desktop / tablet landscape: place diorama nicely on the right 60% of the screen
      camera.fov = 38;
      const horizFactor = THREE.MathUtils.clamp(1.78 / Math.max(0.9, aspect), 0.92, 1.38);
      targetCamPos.set(-1.75, 3.15, 9.6 * horizFactor);
      targetLookAt.set(-1.55, 0.72, 0.12);
    }

    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  const resize = (width: number, height: number) => {
    viewW = Math.max(320, width);
    viewH = Math.max(320, height);
    updateCameraFraming();
    currentCamPos.copy(targetCamPos);
    currentLookAt.copy(targetLookAt);
  };

  const setPointer = (normX: number, normY: number) => {
    pointerTarget.set(
      THREE.MathUtils.clamp(normX, -1, 1),
      THREE.MathUtils.clamp(normY, -1, 1)
    );
  };

  const spawnHeart3D = (originX: number, originY: number, originZ: number, colorIdx: number) => {
    for (let i = 0; i < heartPool.length; i++) {
      const h = heartPool[i];
      if (!h.active) {
        h.active = true;
        h.life = 1.55;
        h.maxLife = 1.55;
        h.pos.set(
          originX + (Math.random() - 0.5) * 0.22,
          originY,
          originZ + (Math.random() - 0.5) * 0.18
        );
        h.vel.set(
          (Math.random() - 0.5) * 0.24,
          0.62 + Math.random() * 0.28,
          (Math.random() - 0.5) * 0.14
        );
        h.baseScale = 0.78 + Math.random() * 0.35;
        h.spinSpeed = (Math.random() - 0.5) * 1.4;
        const palette = ['#EC6A63', '#F7C65B', '#FF9E96'];
        (h.mesh.material as THREE.MeshStandardMaterial).color.set(palette[colorIdx % palette.length]);
        (h.mesh.material as THREE.MeshStandardMaterial).emissive.set(palette[colorIdx % palette.length]);
        h.mesh.visible = true;
        return;
      }
    }
  };

  let heartCounter = 0;

  const update = (dt: number, elapsed: number) => {
    // Smooth pointer parallax + gentle breathing camera orbit
    const dampAlpha = 1 - Math.exp(-5.0 * dt);
    pointerSmooth.lerp(pointerTarget, dampAlpha);

    const swayX = Math.sin(elapsed * 0.45) * 0.22 + pointerSmooth.x * 0.45;
    const swayY = Math.cos(elapsed * 0.36) * 0.1 + pointerSmooth.y * -0.22;

    currentCamPos.lerp(targetCamPos, dampAlpha);
    currentLookAt.lerp(targetLookAt, dampAlpha);

    tmpCamPos.set(currentCamPos.x + swayX, currentCamPos.y + swayY, currentCamPos.z);
    tmpLookAt.set(currentLookAt.x, currentLookAt.y, currentLookAt.z);
    camera.position.copy(tmpCamPos);
    camera.lookAt(tmpLookAt);

    // Drifting clouds
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const offset = ((elapsed * c.speed) % c.range) - c.range * 0.5;
      c.group.position.x = c.baseX + offset;
    }

    // Petting & shoulder-pat rhythms
    const petCycle = Math.sin(elapsed * 4.4);
    const shoulderPat = Math.sin(elapsed * 2.6);
    const breatheE = Math.sin(elapsed * 2.2) * 0.018;
    const breatheM = Math.sin(elapsed * 2.2 + 0.6) * 0.018;

    // Ellehcim breathing & animated petting arm stroking Spotty's head
    ellehcimRig.upperBody.position.y = 0.52 + breatheE;
    ellehcimRig.headGroup.rotation.x = 0.12 + Math.sin(elapsed * 2.2) * 0.03;
    ellehcimRig.petArmPivot.rotation.z = -0.14 + petCycle * 0.12;
    ellehcimRig.petArmPivot.rotation.y = -0.16;
    ellehcimRig.petArmPivot.rotation.x = 0.08 + petCycle * 0.06;

    // Marcos breathing & animated arm gently patting above/on Ellehcim's shoulder
    marcosRig.upperBody.position.y = 0.88 + breatheM;
    marcosRig.headGroup.rotation.y = -0.18 + Math.sin(elapsed * 1.3) * 0.05;
    marcosRig.shoulderArmPivot.rotation.z = 0.42 - Math.abs(shoulderPat) * 0.14;
    marcosRig.shoulderArmPivot.rotation.x = 0.04 + Math.sin(elapsed * 2.6) * 0.04;

    // Spawn floating 3D hearts from Ellehcim petting Spotty & Marcos's shoulder touch
    heartSpawnTimer -= dt;
    if (heartSpawnTimer <= 0) {
      heartSpawnTimer = 0.44;
      heartCounter++;
      spawnHeart3D(-1.12, 0.86, 0.62, heartCounter);
      if (heartCounter % 2 === 0) {
        spawnHeart3D(-0.15, 0.92, 0.30, heartCounter + 2);
      }
    }

    // Update 3D hearts
    for (let i = 0; i < heartPool.length; i++) {
      const h = heartPool[i];
      if (!h.active) continue;
      h.life -= dt;
      if (h.life <= 0) {
        h.active = false;
        h.mesh.visible = false;
        continue;
      }
      h.pos.addScaledVector(h.vel, dt);
      h.mesh.position.copy(h.pos);
      h.mesh.rotation.y += h.spinSpeed * dt;
      const ratio = h.life / h.maxLife;
      const pop = ratio > 0.8 ? (1 - ratio) * 5 : ratio;
      const s = h.baseScale * THREE.MathUtils.clamp(pop, 0.05, 1.0);
      h.mesh.scale.setScalar(s);
    }

    // Animate all 9 dogs + Chucha (wagging tails, happy bounce, tongue pant, Sunny floating + halo glow)
    for (let i = 0; i < dogRigs.length; i++) {
      const dog = dogRigs[i];
      const wag = Math.sin(elapsed * dog.wagSpeed + dog.phaseOffset) * 0.58;
      dog.tailPivot.rotation.y = wag;
      dog.tailPivot.rotation.z = Math.sin(elapsed * dog.wagSpeed * 0.5 + dog.phaseOffset) * 0.14;

      if (dog.floating) {
        const hover = Math.sin(elapsed * 2.5 + dog.phaseOffset) * 0.14;
        dog.root.position.y = dog.basePos.y + hover;
        if (dog.haloMesh) {
          dog.haloMesh.rotation.z = Math.sin(elapsed * 1.8) * 0.08;
          dog.haloMesh.position.y = 0.36 + Math.sin(elapsed * 3.1) * 0.025;
        }
        if (dog.groundAura) {
          const auraPulse = 1 + Math.sin(elapsed * 2.5 + dog.phaseOffset) * 0.08;
          dog.groundAura.scale.set(0.9 * auraPulse, 1, 0.9 * auraPulse);
        }
      } else {
        const bounce = Math.abs(Math.sin(elapsed * 3.5 + dog.phaseOffset)) * 0.032;
        if (dog.isSpotty) {
          // Spotty gently squashes & nods under Ellehcim's petting hand!
          const press = Math.max(0, -petCycle) * 0.065;
          dog.root.position.y = dog.basePos.y + bounce * 0.4;
          dog.root.scale.set(
            dog.baseScale * (1 + press * 0.6),
            dog.baseScale * (1 - press),
            dog.baseScale * (1 + press * 0.6)
          );
          dog.headPivot.rotation.x = dog.baseHeadRotX + petCycle * 0.09;
        } else {
          dog.root.position.y = dog.basePos.y + bounce;
          dog.headPivot.rotation.x = dog.baseHeadRotX + Math.sin(elapsed * 2.8 + dog.phaseOffset) * 0.04;
        }
      }

      dog.headPivot.rotation.y = dog.baseHeadRotY + Math.sin(elapsed * 1.8 + dog.phaseOffset) * 0.05;
      dog.tongueMesh.position.y = -0.105 + Math.sin(elapsed * 9.5 + dog.phaseOffset) * 0.008;
    }
  };

  const dispose = () => {
    envRT.dispose();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    for (const t of textures) t.dispose();
    matCache.clear();
  };

  return {
    scene,
    camera,
    resize,
    setPointer,
    update,
    dispose,
  };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(18, 30, 18, 0.72)');
  grad.addColorStop(0.55, 'rgba(18, 30, 18, 0.28)');
  grad.addColorStop(1, 'rgba(18, 30, 18, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildSkyBackdrop(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
  trackTex: <T extends THREE.Texture>(t: T) => T
) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#3C6E58');
  g.addColorStop(0.32, '#8EB481');
  g.addColorStop(0.56, '#E8D39B');
  g.addColorStop(0.75, '#F5DFAA');
  g.addColorStop(1, '#799D5A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 512);

  const skyTex = trackTex(new THREE.CanvasTexture(c));
  skyTex.colorSpace = THREE.SRGBColorSpace;

  const skyGeo = trackGeo(new THREE.SphereGeometry(62, 24, 16));
  const skyMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false,
    })
  );
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Soft warm golden sun disc & glow in the upper sky
  const sunGlowGeo = trackGeo(new THREE.SphereGeometry(2.6, 20, 16));
  const sunGlowMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FFF4C9',
      transparent: true,
      opacity: 0.82,
      fog: false,
    })
  );
  const sunDisc = new THREE.Mesh(sunGlowGeo, sunGlowMat);
  sunDisc.position.set(5.5, 9.2, -32);
  scene.add(sunDisc);
}

function buildClouds(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  getStdMat: (hex: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial
): CloudRig[] {
  const mat = getStdMat('#FFF9EB', 0.96, 0.0);
  const sphereGeo = trackGeo(new THREE.SphereGeometry(1, 14, 12));
  const specs = [
    { x: -3, y: 7.4, z: -22, scale: 1.25, speed: 0.42 },
    { x: 6, y: 6.2, z: -26, scale: 1.05, speed: 0.28 },
    { x: -9, y: 8.1, z: -28, scale: 1.4, speed: 0.34 },
  ];

  return specs.map((sp) => {
    const group = new THREE.Group();
    const puffs: [number, number, number, number][] = [
      [-1.0, -0.1, 0, 0.85],
      [0, 0.25, 0.1, 1.15],
      [1.1, -0.05, 0, 0.8],
      [0.45, -0.15, 0.35, 0.72],
    ];
    for (const [px, py, pz, pr] of puffs) {
      const m = new THREE.Mesh(sphereGeo, mat);
      m.position.set(px, py, pz);
      m.scale.set(pr * 1.15, pr * 0.82, pr * 0.85);
      group.add(m);
    }
    group.position.set(sp.x, sp.y, sp.z);
    group.scale.setScalar(sp.scale);
    scene.add(group);
    return { group, baseX: sp.x, speed: sp.speed, range: 36 };
  });
}

function buildMeadowTerrain(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
  trackTex: <T extends THREE.Texture>(t: T) => T,
  maxAniso: number
) {
  // Ground meadow texture with warm sandy clearing in the center
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#5B8644';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle grass variation patches
  for (let i = 0; i < 420; i++) {
    const px = ((i * 73) % 512);
    const py = ((i * 139) % 512);
    const r = 8 + (i % 16);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(116, 158, 76, 0.22)' : 'rgba(54, 88, 42, 0.18)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sunlit sandy trail clearing patch under the characters (centered at UV 0.5, 0.5)
  const sandyGrad = ctx.createRadialGradient(256, 260, 12, 256, 260, 108);
  sandyGrad.addColorStop(0, 'rgba(232, 206, 152, 0.82)');
  sandyGrad.addColorStop(0.6, 'rgba(218, 192, 138, 0.45)');
  sandyGrad.addColorStop(1, 'rgba(91, 134, 68, 0)');
  ctx.fillStyle = sandyGrad;
  ctx.beginPath();
  ctx.ellipse(256, 260, 128, 78, 0, 0, Math.PI * 2);
  ctx.fill();

  const groundTex = trackTex(new THREE.CanvasTexture(c));
  groundTex.colorSpace = THREE.SRGBColorSpace;
  groundTex.anisotropy = maxAniso;

  const groundGeo = trackGeo(new THREE.PlaneGeometry(56, 56, 48, 48));
  groundGeo.rotateX(-Math.PI / 2);

  // Gentle rolling meadow perimeter keeping center clearing flat at y=0
  const posAttr = groundGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const dist = Math.hypot(x * 0.72, z);
    const rise = Math.max(0, dist - 4.2) * 0.14;
    const hill = Math.sin(x * 0.25) * Math.cos(z * 0.22) * rise;
    const backSlope = z < -4 ? Math.min(2.6, (-z - 4) * 0.18) : 0;
    posAttr.setY(i, Math.max(-0.08, hill * 0.4 + backSlope));
  }
  groundGeo.computeVertexNormals();

  const groundMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.94,
      metalness: 0.0,
    })
  );
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Distant rolling hills silhouette rings for valley depth
  const hillGeo = trackGeo(new THREE.SphereGeometry(1, 20, 14));
  const hillMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#638C51',
      roughness: 0.95,
      metalness: 0.0,
    })
  );
  const hillSpecs: [number, number, number, number, number, number][] = [
    [-12, -1.0, -17, 10, 4.2, 6],
    [11, -0.8, -18, 11, 4.6, 6],
    [0, -1.2, -23, 14, 5.2, 7],
  ];
  for (const [hx, hy, hz, sx, sy, sz] of hillSpecs) {
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.position.set(hx, hy, hz);
    hill.scale.set(sx, sy, sz);
    scene.add(hill);
  }
}

function buildMossyStoneArch(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  getStdMat: (hex: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial,
  castShadow: boolean
) {
  const archGroup = new THREE.Group();
  const stoneMat = getStdMat('#7D887A', 0.92, 0.02);
  const mossMat = getStdMat('#4C7B45', 0.9, 0.0);
  const rockGeo = trackGeo(new THREE.DodecahedronGeometry(0.42, 1));
  const mossGeo = trackGeo(new THREE.SphereGeometry(0.28, 10, 8));

  // Build mossy stone arch ring
  const steps = 11;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI;
    const rx = Math.cos(a) * 1.55;
    const ry = Math.sin(a) * 1.65 + 0.35;
    const stone = new THREE.Mesh(rockGeo, stoneMat);
    stone.position.set(rx, ry, 0);
    stone.rotation.set(i * 0.4, i * 0.7, a);
    stone.scale.set(0.85, 0.75, 0.95);
    stone.castShadow = castShadow;
    stone.receiveShadow = true;
    archGroup.add(stone);

    if (i % 2 === 1) {
      const moss = new THREE.Mesh(mossGeo, mossMat);
      moss.position.set(rx * 1.04, ry + 0.18, 0.15);
      moss.scale.set(1.2, 0.6, 0.9);
      archGroup.add(moss);
    }
  }

  archGroup.position.set(-2.35, 0, -2.55);
  archGroup.rotation.y = 0.25;
  scene.add(archGroup);
}

function buildStoryTree(
  scene: THREE.Scene,
  x: number,
  z: number,
  scale: number,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  getStdMat: (hex: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial,
  castShadow: boolean
) {
  const tree = new THREE.Group();
  const trunkMat = getStdMat('#5C3E28', 0.9, 0.02);
  const leafDark = getStdMat('#37663A', 0.88, 0.0);
  const leafMid = getStdMat('#4A7E44', 0.86, 0.0);
  const leafLight = getStdMat('#659B50', 0.85, 0.0);

  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.36, 2.2, 10));
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = castShadow;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const canopyGeo = trackGeo(new THREE.IcosahedronGeometry(1, 2));
  const clusters: [number, number, number, number, THREE.MeshStandardMaterial][] = [
    [0, 2.75, 0, 1.35, leafMid],
    [-0.9, 2.25, 0.2, 0.95, leafDark],
    [0.95, 2.3, 0.15, 0.92, leafDark],
    [0.15, 3.25, 0.3, 0.9, leafLight],
    [-0.45, 2.65, 0.6, 0.78, leafLight],
  ];
  for (const [cx, cy, cz, cr, mat] of clusters) {
    const cMesh = new THREE.Mesh(canopyGeo, mat);
    cMesh.position.set(cx, cy, cz);
    cMesh.scale.set(cr, cr * 0.86, cr);
    cMesh.castShadow = castShadow;
    cMesh.receiveShadow = true;
    tree.add(cMesh);
  }

  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);
  scene.add(tree);
}

function buildInstancedMeadowDetails(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
  castShadow: boolean
) {
  // Instanced wildflowers (petals + bright centers) + grass blades around clearing perimeter
  const grassGeo = trackGeo(new THREE.ConeGeometry(0.04, 0.26, 5));
  grassGeo.translate(0, 0.13, 0);
  const grassMat = trackMat(new THREE.MeshStandardMaterial({ color: '#619345', roughness: 0.9 }));
  const grassCount = 42;
  const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  grassInst.receiveShadow = true;
  grassInst.castShadow = castShadow;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < grassCount; i++) {
    const angle = (i / grassCount) * Math.PI * 2 + (i % 3) * 0.17;
    const rad = 2.6 + ((i * 37) % 18) * 0.24;
    const gx = Math.cos(angle) * rad * 1.25;
    const gz = Math.sin(angle) * rad * 0.85;
    dummy.position.set(gx, 0, gz);
    dummy.rotation.set((i % 5 - 2) * 0.08, angle, (i % 3 - 1) * 0.09);
    dummy.scale.setScalar(0.85 + (i % 4) * 0.2);
    dummy.updateMatrix();
    grassInst.setMatrixAt(i, dummy.matrix);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  scene.add(grassInst);

  // Wildflowers (18 cheerful colored blossoms around the clearing)
  const petalGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.06, 0.05, 6));
  const petalMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.72 }));
  const centerGeo = trackGeo(new THREE.SphereGeometry(0.048, 8, 6));
  const centerMat = trackMat(new THREE.MeshStandardMaterial({ color: '#FFF2A6', roughness: 0.6 }));

  const flowerCoords: [number, number, string][] = [
    [-2.7, 0.95, '#F6C851'],
    [-2.1, 1.55, '#F293A3'],
    [-1.4, 1.88, '#FFF2B8'],
    [0.6, 1.85, '#F293A3'],
    [1.85, 1.48, '#F6C851'],
    [2.65, 0.92, '#A7D7F5'],
    [-3.1, -0.35, '#FFF2B8'],
    [2.95, -0.45, '#F293A3'],
    [-1.1, -1.45, '#A7D7F5'],
    [0.9, -1.52, '#F6C851'],
    [2.1, -1.3, '#FFF2B8'],
    [-2.4, -1.55, '#F293A3'],
    [-0.1, 1.98, '#F6C851'],
    [1.3, 1.72, '#A7D7F5'],
  ];

  const petalsInst = new THREE.InstancedMesh(petalGeo, petalMat, flowerCoords.length);
  const centersInst = new THREE.InstancedMesh(centerGeo, centerMat, flowerCoords.length);
  const colorTmp = new THREE.Color();

  for (let i = 0; i < flowerCoords.length; i++) {
    const [fx, fz, fc] = flowerCoords[i];
    dummy.position.set(fx, 0.05, fz);
    dummy.rotation.set(0, i * 0.6, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    petalsInst.setMatrixAt(i, dummy.matrix);
    petalsInst.setColorAt(i, colorTmp.set(fc));

    dummy.position.set(fx, 0.08, fz);
    dummy.updateMatrix();
    centersInst.setMatrixAt(i, dummy.matrix);
  }
  petalsInst.instanceMatrix.needsUpdate = true;
  if (petalsInst.instanceColor) petalsInst.instanceColor.needsUpdate = true;
  centersInst.instanceMatrix.needsUpdate = true;
  scene.add(petalsInst);
  scene.add(centersInst);
}

function buildEllehcimRig(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  getStdMat: (hex: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial,
  shadowGeo: THREE.BufferGeometry,
  shadowMat: THREE.Material,
  castShadow: boolean
) {
  const root = new THREE.Group();
  root.position.set(-0.36, 0, 0.26);
  root.rotation.y = -0.22;

  const skinMat = getStdMat('#C98F66', 0.72, 0.02);
  const hairMat = getStdMat('#1D1513', 0.56, 0.05);
  const shirtMat = getStdMat('#F2E8D0', 0.85, 0.0);
  const vestMat = getStdMat('#5D7246', 0.85, 0.0);
  const pantMat = getStdMat('#9D8660', 0.86, 0.0);
  const bootMat = getStdMat('#4B3221', 0.78, 0.04);
  const strapMat = getStdMat('#734B2E', 0.75, 0.04);
  const eyeMat = getStdMat('#1A1412', 0.25, 0.1);
  const whiteMat = getStdMat('#FFFDF6', 0.3, 0.0);
  const cheekMat = getStdMat('#E67C6C', 0.82, 0.0);
  const smileMat = getStdMat('#7D3E31', 0.65, 0.0);

  // Soft contact shadow
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(0, 0.015, 0.05);
  shadow.scale.set(0.95, 1, 0.85);
  root.add(shadow);

  // Kneeling khaki legs & laced hiking boots
  const thighGeo = trackGeo(new THREE.CapsuleGeometry(0.115, 0.24, 8, 12));
  const leftThigh = new THREE.Mesh(thighGeo, pantMat);
  leftThigh.position.set(-0.14, 0.22, 0.06);
  leftThigh.rotation.set(0.6, 0, 0.08);
  leftThigh.castShadow = castShadow;
  root.add(leftThigh);

  const rightThigh = new THREE.Mesh(thighGeo, pantMat);
  rightThigh.position.set(0.14, 0.2, -0.02);
  rightThigh.rotation.set(1.15, 0, -0.08);
  rightThigh.castShadow = castShadow;
  root.add(rightThigh);

  const bootGeo = trackGeo(new THREE.CapsuleGeometry(0.08, 0.14, 6, 10));
  const leftBoot = new THREE.Mesh(bootGeo, bootMat);
  leftBoot.position.set(-0.16, 0.09, 0.2);
  leftBoot.rotation.x = Math.PI * 0.48;
  leftBoot.castShadow = castShadow;
  root.add(leftBoot);

  const rightBoot = new THREE.Mesh(bootGeo, bootMat);
  rightBoot.position.set(0.16, 0.09, -0.22);
  rightBoot.rotation.x = Math.PI * 0.42;
  rightBoot.castShadow = castShadow;
  root.add(rightBoot);

  // Upper body group (breathing pivot)
  const upperBody = new THREE.Group();
  upperBody.position.set(0, 0.52, 0.04);
  root.add(upperBody);

  // Shirt torso
  const torsoGeo = trackGeo(new THREE.CapsuleGeometry(0.19, 0.26, 8, 14));
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.scale.set(1.05, 1, 0.82);
  torso.castShadow = castShadow;
  upperBody.add(torso);

  // Olive Explorer Vest panels (left & right front open jacket panels + back)
  const vestPanelGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.42, 0.28));
  const vestL = new THREE.Mesh(vestPanelGeo, vestMat);
  vestL.position.set(-0.14, 0.01, 0.02);
  vestL.rotation.z = 0.04;
  vestL.castShadow = castShadow;
  upperBody.add(vestL);

  const vestR = new THREE.Mesh(vestPanelGeo, vestMat);
  vestR.position.set(0.14, 0.01, 0.02);
  vestR.rotation.z = -0.04;
  vestR.castShadow = castShadow;
  upperBody.add(vestR);

  const vestBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.42, 0.12)), vestMat);
  vestBack.position.set(0, 0.01, -0.1);
  upperBody.add(vestBack);

  // Crossbody satchel strap
  const strap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.24, 0.024, 8, 24)), strapMat);
  strap.position.set(0, 0.02, 0.01);
  strap.rotation.set(0.25, 0.1, 0.72);
  strap.scale.set(1.05, 1.32, 0.75);
  upperBody.add(strap);

  // Left arm resting affectionately near heart/waist
  const armGeo = trackGeo(new THREE.CapsuleGeometry(0.056, 0.28, 6, 10));
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.set(0.25, 0.02, 0.08);
  leftArm.rotation.set(-0.45, 0, -0.45);
  leftArm.castShadow = castShadow;
  upperBody.add(leftArm);

  // Animated Right Petting Arm reaching out over Spotty's head!
  const petArmPivot = new THREE.Group();
  petArmPivot.position.set(-0.22, 0.16, 0.08);
  upperBody.add(petArmPivot);

  const upperPetArm = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.058, 0.28, 6, 10)), skinMat);
  upperPetArm.position.set(-0.22, -0.06, 0.14);
  upperPetArm.rotation.set(0.42, 0.25, 1.12);
  upperPetArm.castShadow = castShadow;
  petArmPivot.add(upperPetArm);

  const forePetArm = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.052, 0.26, 6, 10)), skinMat);
  forePetArm.position.set(-0.5, -0.14, 0.26);
  forePetArm.rotation.set(0.35, 0.2, 1.28);
  forePetArm.castShadow = castShadow;
  petArmPivot.add(forePetArm);

  const petHand = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.075, 10, 8)), skinMat);
  petHand.position.set(-0.68, -0.17, 0.31);
  petHand.scale.set(1.25, 0.72, 1.0);
  petHand.castShadow = castShadow;
  petArmPivot.add(petHand);

  // Neck
  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 10)), skinMat);
  neck.position.set(0, 0.26, 0.01);
  upperBody.add(neck);

  // Head Group (Youthful adult face + Short dark Dora-style chin-length bob WITHOUT bangs!)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.44, 0.04);
  upperBody.add(headGroup);

  const headMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.215, 20, 16)), skinMat);
  headMesh.scale.set(1.0, 1.04, 0.96);
  headMesh.castShadow = castShadow;
  headGroup.add(headMesh);

  // Hair Crown & Back Dome — swept cleanly ABOVE the open smooth forehead (NO bangs!)
  const hairCrown = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.232, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.54)),
    hairMat
  );
  // Tilted backwards so front hairline stays high above her forehead!
  hairCrown.position.set(0, 0.03, -0.045);
  hairCrown.rotation.x = -0.36;
  hairCrown.castShadow = castShadow;
  headGroup.add(hairCrown);

  // Back of Dora bob hair wrapping smoothly around back of neck to chin level
  const hairBack = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.225, 0.245, 0.27, 16, 1, false, Math.PI * 0.65, Math.PI * 1.7)),
    hairMat
  );
  hairBack.position.set(0, -0.08, -0.04);
  hairBack.castShadow = castShadow;
  headGroup.add(hairBack);

  // Left & Right chin-length Dora bob side locks curving inward around cheeks (leaving brow 100% clear)
  const sideBobGeo = trackGeo(new THREE.CapsuleGeometry(0.075, 0.19, 8, 10));
  const bobLeft = new THREE.Mesh(sideBobGeo, hairMat);
  bobLeft.position.set(-0.205, -0.05, 0.02);
  bobLeft.rotation.set(0.08, 0, -0.18);
  bobLeft.scale.set(0.85, 1.05, 1.15);
  bobLeft.castShadow = castShadow;
  headGroup.add(bobLeft);

  const bobRight = new THREE.Mesh(sideBobGeo, hairMat);
  bobRight.position.set(0.205, -0.05, 0.02);
  bobRight.rotation.set(0.08, 0, 0.18);
  bobRight.scale.set(0.85, 1.05, 1.15);
  bobRight.castShadow = castShadow;
  headGroup.add(bobRight);

  // Inward-curling bob tips at chin level
  const tipGeo = trackGeo(new THREE.SphereGeometry(0.082, 10, 8));
  const tipL = new THREE.Mesh(tipGeo, hairMat);
  tipL.position.set(-0.165, -0.185, 0.03);
  tipL.scale.set(1.15, 0.78, 1.1);
  headGroup.add(tipL);

  const tipR = new THREE.Mesh(tipGeo, hairMat);
  tipR.position.set(0.165, -0.185, 0.03);
  tipR.scale.set(1.15, 0.78, 1.1);
  headGroup.add(tipR);

  // Youthful bright eyes + white catchlights + rosy cheeks + warm smile
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.026, 10, 8));
  const shineGeo = trackGeo(new THREE.SphereGeometry(0.01, 6, 6));
  const cheekGeo = trackGeo(new THREE.SphereGeometry(0.036, 8, 6));

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.072, 0.01, 0.195);
    headGroup.add(eye);

    const shine = new THREE.Mesh(shineGeo, whiteMat);
    shine.position.set(side * 0.072 + 0.008, 0.02, 0.214);
    headGroup.add(shine);

    const cheek = new THREE.Mesh(cheekGeo, cheekMat);
    cheek.position.set(side * 0.115, -0.04, 0.17);
    cheek.scale.set(1.2, 0.7, 0.5);
    headGroup.add(cheek);
  }

  // Happy upward smile arc
  const smileGeo = trackGeo(new THREE.TorusGeometry(0.056, 0.012, 8, 14, Math.PI * 0.85));
  const smile = new THREE.Mesh(smileGeo, smileMat);
  smile.position.set(0, -0.048, 0.195);
  smile.rotation.z = Math.PI + 0.22;
  headGroup.add(smile);

  scene.add(root);
  return { root, upperBody, headGroup, petArmPivot };
}

function buildMarcosRig(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  getStdMat: (hex: string, roughness?: number, metalness?: number) => THREE.MeshStandardMaterial,
  shadowGeo: THREE.BufferGeometry,
  shadowMat: THREE.Material,
  castShadow: boolean
) {
  const root = new THREE.Group();
  root.position.set(0.62, 0, 0.22);
  root.rotation.y = -0.14;

  const skinMat = getStdMat('#B87F56', 0.74, 0.02);
  const hairMat = getStdMat('#261C17', 0.62, 0.04);
  const shirtMat = getStdMat('#3B9B94', 0.82, 0.0);
  const shortMat = getStdMat('#D5BC8B', 0.86, 0.0);
  const sandalMat = getStdMat('#6E4C32', 0.8, 0.02);
  const eyeMat = getStdMat('#181412', 0.25, 0.1);
  const whiteMat = getStdMat('#FFFDF6', 0.3, 0.0);
  const cheekMat = getStdMat('#E67C6C', 0.82, 0.0);
  const smileMat = getStdMat('#6B3D2E', 0.65, 0.0);

  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.set(0, 0.015, 0);
  shadow.scale.set(0.9, 1, 0.85);
  root.add(shadow);

  // Standing legs & sandals
  const legGeo = trackGeo(new THREE.CapsuleGeometry(0.068, 0.34, 6, 10));
  const legL = new THREE.Mesh(legGeo, skinMat);
  legL.position.set(-0.11, 0.28, 0);
  legL.castShadow = castShadow;
  root.add(legL);

  const legR = new THREE.Mesh(legGeo, skinMat);
  legR.position.set(0.11, 0.28, 0);
  legR.castShadow = castShadow;
  root.add(legR);

  const sandalGeo = trackGeo(new THREE.CapsuleGeometry(0.068, 0.13, 6, 10));
  for (const sx of [-0.11, 0.11]) {
    const s = new THREE.Mesh(sandalGeo, sandalMat);
    s.position.set(sx, 0.06, 0.04);
    s.rotation.x = Math.PI * 0.5;
    s.scale.set(1, 1, 0.65);
    s.castShadow = castShadow;
    root.add(s);
  }

  // Khaki shorts
  const shorts = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.28, 0.26)), shortMat);
  shorts.position.set(0, 0.56, 0);
  shorts.castShadow = castShadow;
  root.add(shorts);

  // Upper body pivot
  const upperBody = new THREE.Group();
  upperBody.position.set(0, 0.88, 0);
  root.add(upperBody);

  const torso = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.205, 0.28, 8, 14)), shirtMat);
  torso.scale.set(1.06, 1, 0.78);
  torso.castShadow = castShadow;
  upperBody.add(torso);

  // Right arm resting warmly by his side
  const rightArm = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.056, 0.3, 6, 10)), skinMat);
  rightArm.position.set(0.25, -0.02, 0.03);
  rightArm.rotation.set(0.1, 0, -0.22);
  rightArm.castShadow = castShadow;
  upperBody.add(rightArm);

  // Animated Left Shoulder-Pat Arm reaching across to rest/pat above Ellehcim's shoulder!
  const shoulderArmPivot = new THREE.Group();
  shoulderArmPivot.position.set(-0.22, 0.14, 0.04);
  upperBody.add(shoulderArmPivot);

  const reachArm = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.055, 0.44, 6, 10)), skinMat);
  reachArm.position.set(-0.28, -0.02, 0.06);
  reachArm.rotation.set(0.08, 0.15, 1.38);
  reachArm.castShadow = castShadow;
  shoulderArmPivot.add(reachArm);

  const shoulderHand = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.075, 10, 8)), skinMat);
  shoulderHand.position.set(-0.56, -0.03, 0.08);
  shoulderHand.scale.set(1.22, 0.72, 1.0);
  shoulderHand.castShadow = castShadow;
  shoulderArmPivot.add(shoulderHand);

  // Neck & Head
  const neck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.072, 0.082, 0.14, 10)), skinMat);
  neck.position.set(0, 0.28, 0);
  upperBody.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.46, 0.02);
  upperBody.add(headGroup);

  const headMesh = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.21, 18, 14)), skinMat);
  headMesh.scale.set(1.0, 1.04, 0.96);
  headMesh.castShadow = castShadow;
  headGroup.add(headMesh);

  // Short wavy dark hair
  const hairCap = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.222, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56)),
    hairMat
  );
  hairCap.position.set(0, 0.03, -0.025);
  hairCap.rotation.x = -0.22;
  hairCap.castShadow = castShadow;
  headGroup.add(hairCap);

  const waveTop = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 10, 8)), hairMat);
  waveTop.position.set(0.02, 0.19, 0.08);
  waveTop.scale.set(1.3, 0.55, 0.9);
  headGroup.add(waveTop);

  // Happy smiling eyes + rosy cheeks + warm smile
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.025, 10, 8));
  const shineGeo = trackGeo(new THREE.SphereGeometry(0.009, 6, 6));
  const cheekGeo = trackGeo(new THREE.SphereGeometry(0.035, 8, 6));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.07, 0.01, 0.192);
    headGroup.add(eye);

    const shine = new THREE.Mesh(shineGeo, whiteMat);
    shine.position.set(side * 0.07 + 0.007, 0.018, 0.21);
    headGroup.add(shine);

    const cheek = new THREE.Mesh(cheekGeo, cheekMat);
    cheek.position.set(side * 0.11, -0.04, 0.168);
    cheek.scale.set(1.18, 0.68, 0.5);
    headGroup.add(cheek);
  }

  const smile = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.055, 0.012, 8, 14, Math.PI * 0.85)),
    smileMat
  );
  smile.position.set(0, -0.045, 0.192);
  smile.rotation.z = Math.PI + 0.22;
  headGroup.add(smile);

  scene.add(root);
  return { root, upperBody, headGroup, shoulderArmPivot };
}

function buildDogRig(
  scene: THREE.Scene,
  p: DogProfile,
  x: number,
  y: number,
  z: number,
  rotY: number,
  headRotX: number,
  headRotY: number,
  phaseOffset: number,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
  getStdMat: (hex: string, roughness?: number, metalness?: number, extra?: Partial<THREE.MeshStandardMaterialParameters>) => THREE.MeshStandardMaterial,
  shadowGeo: THREE.BufferGeometry,
  shadowMat: THREE.Material,
  castShadow: boolean,
  overrideId?: string
): AnimatedDogRig {
  const id = overrideId ?? p.id;
  const root = new THREE.Group();
  const baseScale = p.sizeScale * 1.08;
  root.position.set(x, y, z);
  root.rotation.y = rotY;
  root.scale.setScalar(baseScale);

  const coatMat = getStdMat(p.coatColor, 0.84, 0.0);
  const secMat = getStdMat(p.secondaryColor, 0.84, 0.0);
  const collarMat = getStdMat(p.collarColor, 0.45, 0.12);
  const goldMat = getStdMat('#F2B84B', 0.3, 0.65);
  const noseMat = getStdMat(p.noseColor, 0.22, 0.08);
  const darkEyeMat = getStdMat('#181412', 0.18, 0.1);
  const whiteShineMat = getStdMat('#FFFDF6', 0.2, 0.0);
  const tongueMat = getStdMat('#F27C8E', 0.45, 0.0);
  const smileMat = getStdMat('#241B17', 0.6, 0.0);

  // Soft grounded contact shadow or Sunny's golden floating aura
  let groundAura: THREE.Mesh | undefined;
  if (p.floating) {
    const auraMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#FFE078',
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      })
    );
    const circleAura = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.46, 20)),
      auraMat
    );
    circleAura.rotation.x = -Math.PI / 2;
    circleAura.position.set(x, 0.025, z);
    scene.add(circleAura);
    groundAura = circleAura;
  } else {
    const cShadow = new THREE.Mesh(shadowGeo, shadowMat);
    cShadow.position.set(0, 0.015, 0);
    cShadow.scale.set(0.76, 1, 0.96);
    root.add(cShadow);
  }

  // Body dimensions (chubby / muscular / sleek)
  const bodyW = p.chubby ? 0.22 : p.muscular ? 0.21 : 0.185;
  const bodyH = p.chubby ? 0.185 : p.muscular ? 0.175 : 0.16;
  const bodyL = p.chubby ? 0.27 : 0.26;

  // 4 Grounded Legs (center of body sits at y = 0.27)
  const legR = p.muscular ? 0.05 : 0.043;
  const legGeo = trackGeo(new THREE.CapsuleGeometry(legR, 0.15, 6, 8));
  const legOffsets: [number, number][] = [
    [-bodyW * 0.56, bodyL * 0.52],
    [bodyW * 0.56, bodyL * 0.52],
    [-bodyW * 0.56, -bodyL * 0.52],
    [bodyW * 0.56, -bodyL * 0.52],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.set(lx, 0.125, lz);
    leg.castShadow = castShadow;
    root.add(leg);
  }

  // Torso
  const torsoGeo = trackGeo(new THREE.SphereGeometry(1, 16, 12));
  const torso = new THREE.Mesh(torsoGeo, coatMat);
  torso.position.set(0, 0.28, 0);
  torso.scale.set(bodyW, bodyH, bodyL);
  torso.castShadow = castShadow;
  torso.receiveShadow = true;
  root.add(torso);

  // Coat spots or cream chest fluff
  if (p.spotColor) {
    const spotMat = getStdMat(p.spotColor, 0.84, 0.0);
    const spotGeo = trackGeo(new THREE.SphereGeometry(0.085, 10, 8));
    const spots: [number, number, number, number][] = [
      [-bodyW * 0.72, 0.34, -0.06, 1.05],
      [bodyW * 0.74, 0.29, 0.08, 0.85],
      [0.02, 0.41, -0.14, 0.92],
    ];
    for (const [sx, sy, sz, ss] of spots) {
      const sp = new THREE.Mesh(spotGeo, spotMat);
      sp.position.set(sx, sy, sz);
      sp.scale.set(ss * 0.8, ss * 0.65, ss * 1.1);
      root.add(sp);
    }
  } else {
    const chest = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(bodyW * 0.76, 12, 10)), secMat);
    chest.position.set(0, 0.26, bodyL * 0.62);
    chest.scale.set(1, 1.08, 0.65);
    root.add(chest);
  }

  // Collar + Golden Tag
  const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.135, 0.022, 8, 16)), collarMat);
  collar.position.set(0, 0.37, bodyL * 0.56);
  collar.rotation.x = Math.PI * 0.36;
  root.add(collar);

  const tag = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.026, 8, 6)), goldMat);
  tag.position.set(0, 0.30, bodyL * 0.82);
  root.add(tag);

  // Articulated Wagging Tail Pivot
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.34, -bodyL * 0.88);
  root.add(tailPivot);

  if (p.tailStyle === 'short') {
    const stub = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.036, 0.08, 6, 8)), coatMat);
    stub.position.set(0, 0.06, -0.05);
    stub.rotation.x = -0.65;
    stub.castShadow = castShadow;
    tailPivot.add(stub);
  } else if (p.tailStyle === 'curled') {
    const curl = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.075, 0.028, 8, 14, Math.PI * 1.4)), coatMat);
    curl.position.set(0, 0.1, -0.04);
    curl.rotation.y = Math.PI * 0.5;
    curl.castShadow = castShadow;
    tailPivot.add(curl);
  } else if (p.tailStyle === 'fluffy') {
    const tail = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.048, 0.18, 6, 10)), coatMat);
    tail.position.set(0, 0.12, -0.08);
    tail.rotation.x = -0.7;
    tail.castShadow = castShadow;
    tailPivot.add(tail);
    if (p.spotColor) {
      const tip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.052, 8, 8)), getStdMat(p.spotColor, 0.84, 0.0));
      tip.position.set(0, 0.21, -0.15);
      tailPivot.add(tip);
    }
  } else {
    const tail = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.032, 0.2, 6, 8)), coatMat);
    tail.position.set(0, 0.12, -0.08);
    tail.rotation.x = -0.65;
    tail.castShadow = castShadow;
    tailPivot.add(tail);
  }

  // Articulated Head Pivot (looking warmly toward Ellehcim!)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.48, bodyL * 0.68);
  headPivot.rotation.set(headRotX, headRotY, 0);
  root.add(headPivot);

  const headR = p.chubby ? 0.175 : 0.158;
  const cranium = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(headR, 18, 14)), coatMat);
  cranium.scale.set(1.04, 0.96, 1.0);
  cranium.castShadow = castShadow;
  headPivot.add(cranium);

  if (p.chubby) {
    // Julie's extra fluffy cheeks
    const fluffGeo = trackGeo(new THREE.SphereGeometry(0.095, 10, 8));
    for (const s of [-1, 1]) {
      const puff = new THREE.Mesh(fluffGeo, secMat);
      puff.position.set(s * 0.115, -0.04, 0.03);
      headPivot.add(puff);
    }
  }

  // Spotty's unique brown mask covering the LEFT side of her face (+X in local dog space!)
  if (p.leftFaceMaskColor) {
    const maskMat = getStdMat(p.leftFaceMaskColor, 0.84, 0.0);
    const maskPatch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(headR * 0.72, 12, 10)), maskMat);
    maskPatch.position.set(headR * 0.44, 0.025, headR * 0.36);
    maskPatch.scale.set(0.75, 0.92, 0.78);
    headPivot.add(maskPatch);
  } else if (id === 'chucha' && p.spotColor) {
    const chuchaSpot = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(headR * 0.45, 10, 8)),
      getStdMat(p.spotColor, 0.84, 0.0)
    );
    chuchaSpot.position.set(-headR * 0.56, headR * 0.38, headR * 0.25);
    headPivot.add(chuchaSpot);
  }

  // Ears
  const earHex =
    p.id === 'spikey' ? '#6D3C1E' : p.leftFaceMaskColor ? p.leftFaceMaskColor : p.spotColor && id === 'chucha' ? p.spotColor : p.coatColor;
  const earMat = getStdMat(earHex, 0.84, 0.0);

  if (p.earStyle === 'pointed') {
    const earGeo = trackGeo(new THREE.ConeGeometry(0.058, 0.16, 8));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(s * 0.095, headR + 0.04, -0.02);
      ear.rotation.z = -s * 0.22;
      ear.castShadow = castShadow;
      headPivot.add(ear);
    }
  } else if (p.earStyle === 'beagle') {
    // Spikey's long floppy beagle-shaped ears!
    const beagleEarGeo = trackGeo(new THREE.CapsuleGeometry(0.052, 0.14, 6, 8));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(beagleEarGeo, earMat);
      ear.position.set(s * (headR + 0.015), -0.04, 0.0);
      ear.rotation.z = s * 0.22;
      ear.scale.set(0.65, 1.15, 1.1);
      ear.castShadow = castShadow;
      headPivot.add(ear);
    }
  } else if (p.earStyle === 'terrier') {
    const earGeo = trackGeo(new THREE.ConeGeometry(0.05, 0.12, 6));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(s * (headR * 0.85), headR * 0.62, 0.03);
      ear.rotation.set(0.85, 0, -s * 0.9);
      ear.castShadow = castShadow;
      headPivot.add(ear);
    }
  } else if (p.earStyle === 'fluffy') {
    const earGeo = trackGeo(new THREE.SphereGeometry(0.075, 10, 8));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(s * (headR * 0.85), headR * 0.52, -0.01);
      ear.scale.set(0.8, 1.1, 0.95);
      headPivot.add(ear);
    }
  } else {
    // Border collie half-flop / perky
    const earGeo = trackGeo(new THREE.CapsuleGeometry(0.046, 0.095, 6, 8));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, earMat);
      ear.position.set(s * (headR * 0.9), headR * 0.42, 0.01);
      ear.rotation.z = s * (p.earStyle === 'perky' ? -0.35 : 0.35);
      ear.castShadow = castShadow;
      headPivot.add(ear);
    }
  }

  // Glowing Golden Halo for Sunny!
  let haloMesh: THREE.Mesh | undefined;
  if (p.hasHalo) {
    const haloGeo = trackGeo(new THREE.TorusGeometry(0.155, 0.024, 10, 24));
    const haloMat = getStdMat('#FFD756', 0.2, 0.4, {
      emissive: '#FFB92E',
      emissiveIntensity: 0.95,
    });
    haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.set(0, 0.36, 0);
    haloMesh.rotation.x = Math.PI * 0.5;
    headPivot.add(haloMesh);
  }

  // Muzzle
  const muzzleColor = p.id === 'spotty' ? coatMat : secMat;
  const muzzle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.082, 12, 10)), muzzleColor);
  muzzle.position.set(0, -0.036, headR * 0.84);
  muzzle.scale.set(1.05, 0.85, 1.05);
  headPivot.add(muzzle);

  // Smile crease + animated pink tongue poking out!
  const smileArc = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.04, 0.008, 6, 10, Math.PI * 0.8)),
    smileMat
  );
  smileArc.position.set(0, -0.068, headR + 0.048);
  smileArc.rotation.z = Math.PI + 0.3;
  headPivot.add(smileArc);

  const tongueMesh = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.024, 0.032, 6, 8)), tongueMat);
  tongueMesh.position.set(0.01, -0.105, headR + 0.052);
  tongueMesh.rotation.x = 0.42;
  tongueMesh.scale.set(1.0, 1.0, 0.52);
  headPivot.add(tongueMesh);

  // Nose (Spikey gets BIG BLACK NOSE!)
  const noseR = p.bigNose ? 0.058 : p.id === 'julie' ? 0.026 : 0.038;
  const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(noseR, 12, 10)), noseMat);
  nose.position.set(0, -0.008, headR + 0.072);
  nose.scale.set(1.12, 0.88, 0.92);
  headPivot.add(nose);

  // Eyes (Scoob: blue LEFT eye at +X, yellow RIGHT eye at -X; others: shiny dark eyes with catchlights)
  const eyeR = 0.028;
  const eyeGeo = trackGeo(new THREE.SphereGeometry(eyeR, 10, 8));
  const shineGeo = trackGeo(new THREE.SphereGeometry(0.01, 6, 6));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(0.014, 8, 6));

  if (p.leftEyeColor && p.rightEyeColor) {
    const leftEyeMat = getStdMat(p.leftEyeColor, 0.2, 0.1);
    const rightEyeMat = getStdMat(p.rightEyeColor, 0.2, 0.1);

    // Dog's anatomical LEFT eye (+X)
    const leftEye = new THREE.Mesh(eyeGeo, leftEyeMat);
    leftEye.position.set(0.064, 0.038, headR * 0.86);
    headPivot.add(leftEye);
    const leftPupil = new THREE.Mesh(pupilGeo, darkEyeMat);
    leftPupil.position.set(0.066, 0.038, headR * 0.86 + 0.019);
    headPivot.add(leftPupil);

    // Dog's anatomical RIGHT eye (-X)
    const rightEye = new THREE.Mesh(eyeGeo, rightEyeMat);
    rightEye.position.set(-0.064, 0.038, headR * 0.86);
    headPivot.add(rightEye);
    const rightPupil = new THREE.Mesh(pupilGeo, darkEyeMat);
    rightPupil.position.set(-0.066, 0.038, headR * 0.86 + 0.019);
    headPivot.add(rightPupil);
  } else {
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, darkEyeMat);
      eye.position.set(s * 0.064, 0.038, headR * 0.86);
      headPivot.add(eye);
      const shine = new THREE.Mesh(shineGeo, whiteShineMat);
      shine.position.set(s * 0.064 + 0.008, 0.048, headR * 0.86 + 0.022);
      headPivot.add(shine);
    }
  }

  scene.add(root);

  return {
    id,
    root,
    headPivot,
    tailPivot,
    tongueMesh,
    haloMesh,
    groundAura,
    basePos: new THREE.Vector3(x, y, z),
    baseRotY: rotY,
    baseHeadRotX: headRotX,
    baseHeadRotY: headRotY,
    baseScale,
    wagSpeed: p.id === 'potato' ? 18.5 : 11.5,
    phaseOffset,
    floating: Boolean(p.floating),
    isSpotty: id === 'spotty',
  };
}

function buildFloatingHeartPool(
  scene: THREE.Scene,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T
): FloatingHeartInstance[] {
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.06);
  heartShape.bezierCurveTo(-0.11, 0.02, -0.07, 0.12, 0, 0.045);
  heartShape.bezierCurveTo(0.07, 0.12, 0.11, 0.02, 0, -0.06);

  const heartGeo = trackGeo(
    new THREE.ExtrudeGeometry(heartShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 2,
    })
  );
  heartGeo.center();

  const pool: FloatingHeartInstance[] = [];
  for (let i = 0; i < 18; i++) {
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#EC6A63',
        emissive: '#EC6A63',
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.05,
      })
    );
    const mesh = new THREE.Mesh(heartGeo, mat);
    mesh.visible = false;
    scene.add(mesh);
    pool.push({
      mesh,
      active: false,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 1.5,
      baseScale: 1,
      spinSpeed: 0,
    });
  }
  return pool;
}
