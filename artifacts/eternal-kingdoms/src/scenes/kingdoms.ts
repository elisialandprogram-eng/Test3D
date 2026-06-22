import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  ShadowGenerator,
  ActionManager,
  ExecuteCodeAction,
} from "@babylonjs/core";

export interface Kingdom {
  name: string;
  x: number;
  z: number;
  type: string;
  level: number;
  colorTheme: { primary: Color3; secondary: Color3; accent: Color3 };
  isShowcase?: boolean;
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function terrainHeight(x: number, z: number): number {
  const nx = x / 500;
  const nz = z / 500;
  const n = Math.sin(nx * 127.1 + nz * 311.7) * 43758.5453;
  return ((n - Math.floor(n)) - 0.5) * 4.5;
}

const KINGDOM_THEMES = [
  {
    primary: new Color3(0.55, 0.18, 0.12),
    secondary: new Color3(0.75, 0.72, 0.65),
    accent: new Color3(0.85, 0.7, 0.15),
  },
  {
    primary: new Color3(0.14, 0.25, 0.52),
    secondary: new Color3(0.72, 0.72, 0.75),
    accent: new Color3(0.85, 0.82, 0.25),
  },
  {
    primary: new Color3(0.18, 0.42, 0.22),
    secondary: new Color3(0.68, 0.70, 0.62),
    accent: new Color3(0.78, 0.68, 0.18),
  },
  {
    primary: new Color3(0.45, 0.32, 0.12),
    secondary: new Color3(0.72, 0.65, 0.55),
    accent: new Color3(0.82, 0.75, 0.22),
  },
  {
    primary: new Color3(0.38, 0.12, 0.42),
    secondary: new Color3(0.70, 0.68, 0.72),
    accent: new Color3(0.88, 0.72, 0.15),
  },
  {
    primary: new Color3(0.12, 0.35, 0.42),
    secondary: new Color3(0.65, 0.72, 0.72),
    accent: new Color3(0.82, 0.78, 0.20),
  },
];

const KINGDOM_NAMES = [
  "Ironveil Keep", "Stormcrest Hold", "Ashenmoor", "Duskhaven", "Embervale",
  "Frostpeak", "Grimhold", "Hallowmere", "Irongate", "Jadespire",
  "Kingsfall", "Lightshade", "Moonhallow", "Nightwatch", "Oakhaven",
  "Peakwatch", "Queensbury", "Ravencrest", "Shadowfen", "Thornwall",
  "Umbervale",
];

const KINGDOM_TYPES = ["Iron Age", "Bronze Age", "Stone Age", "Silver Age", "Gold Age"];

export function generateKingdomPositions(): Kingdom[] {
  const rand = seededRand(99173);
  const kingdoms: Kingdom[] = [];

  kingdoms.push({
    name: "Ironveil Keep",
    x: 0,
    z: 0,
    type: "Gold Age",
    level: 25,
    colorTheme: KINGDOM_THEMES[0],
    isShowcase: true,
  });

  for (let t = 0; t < 300 && kingdoms.length < 21; t++) {
    const x = (rand() - 0.5) * 400;
    const z = (rand() - 0.5) * 400;

    let tooClose = false;
    for (const k of kingdoms) {
      const dx = x - k.x;
      const dz = z - k.z;
      if (dx * dx + dz * dz < 28 * 28) { tooClose = true; break; }
    }
    if (tooClose) continue;

    const idx = kingdoms.length;
    kingdoms.push({
      name: KINGDOM_NAMES[idx] ?? `Kingdom ${idx}`,
      x,
      z,
      type: KINGDOM_TYPES[Math.floor(rand() * KINGDOM_TYPES.length)],
      level: Math.floor(rand() * 22) + 3,
      colorTheme: KINGDOM_THEMES[Math.floor(rand() * KINGDOM_THEMES.length)],
    });
  }

  return kingdoms;
}

function buildCastle(
  scene: Scene,
  kingdom: Kingdom,
  shadowGenerator: ShadowGenerator | null,
  onSelect: (k: Kingdom) => void,
) {
  const { x, z, colorTheme, isShowcase } = kingdom;
  const baseH = terrainHeight(x, z);
  const scale = isShowcase ? 1.6 : 0.75 + (Math.sin(x * 0.37 + z * 0.29) * 0.5 + 0.5) * 0.5;

  const root = new Mesh(`kingdom_root_${kingdom.name}`, scene);
  root.position = new Vector3(x, baseH, z);

  const wallMat = new StandardMaterial(`wallMat_${kingdom.name}`, scene);
  wallMat.diffuseColor = colorTheme.secondary;
  wallMat.specularColor = new Color3(0.04, 0.04, 0.04);

  const roofMat = new StandardMaterial(`roofMat_${kingdom.name}`, scene);
  roofMat.diffuseColor = colorTheme.primary;
  roofMat.specularColor = new Color3(0.06, 0.04, 0.04);

  const accentMat = new StandardMaterial(`accentMat_${kingdom.name}`, scene);
  accentMat.diffuseColor = colorTheme.accent;
  accentMat.specularColor = new Color3(0.15, 0.12, 0.05);
  accentMat.specularPower = 32;

  const groundMat = new StandardMaterial(`groundMat_${kingdom.name}`, scene);
  groundMat.diffuseColor = new Color3(0.52, 0.48, 0.40);
  groundMat.specularColor = new Color3(0.02, 0.02, 0.02);

  const meshes: Mesh[] = [];
  function addMesh(m: Mesh) {
    m.parent = root;
    meshes.push(m);
    if (shadowGenerator) {
      shadowGenerator.addShadowCaster(m);
      m.receiveShadows = true;
    }
    m.actionManager = new ActionManager(scene);
    m.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, () => onSelect(kingdom)),
    );
    return m;
  }

  const baseW = 10 * scale;

  const base = MeshBuilder.CreateBox(`${kingdom.name}_base`, {
    width: baseW, height: 0.6 * scale, depth: baseW,
  }, scene);
  base.position.y = 0.3 * scale;
  base.material = groundMat;
  addMesh(base);

  const wallH = 2.4 * scale;
  const wallT = 0.6 * scale;
  const wallDefs = [
    { w: baseW, h: wallH, d: wallT, px: 0, pz: -(baseW / 2 - wallT / 2) },
    { w: baseW, h: wallH, d: wallT, px: 0, pz: (baseW / 2 - wallT / 2) },
    { w: wallT, h: wallH, d: baseW - wallT * 2, px: -(baseW / 2 - wallT / 2), pz: 0 },
    { w: wallT, h: wallH, d: baseW - wallT * 2, px: (baseW / 2 - wallT / 2), pz: 0 },
  ];
  wallDefs.forEach(({ w, h, d, px, pz }, i) => {
    const wall = MeshBuilder.CreateBox(`${kingdom.name}_wall_${i}`, { width: w, height: h, depth: d }, scene);
    wall.position.y = h / 2 + 0.6 * scale;
    wall.position.x = px;
    wall.position.z = pz;
    wall.material = wallMat;
    addMesh(wall);
  });

  const btW = 0.5 * scale;
  const btH = 0.45 * scale;
  const btSpacing = 1.5 * scale;
  const btCount = Math.floor(baseW / btSpacing);
  for (let side = 0; side < 4; side++) {
    for (let b = 0; b < btCount; b++) {
      if (b % 2 !== 0) continue;
      const bt = MeshBuilder.CreateBox(`${kingdom.name}_bt_${side}_${b}`, {
        width: btW, height: btH, depth: btW,
      }, scene);
      const t = -baseW / 2 + b * btSpacing + btSpacing / 2;
      const topY = wallH + 0.6 * scale + btH / 2;
      if (side === 0) bt.position.set(t, topY, -(baseW / 2 - wallT / 2));
      else if (side === 1) bt.position.set(t, topY, (baseW / 2 - wallT / 2));
      else if (side === 2) bt.position.set(-(baseW / 2 - wallT / 2), topY, t);
      else bt.position.set((baseW / 2 - wallT / 2), topY, t);
      bt.material = wallMat;
      addMesh(bt);
    }
  }

  const towerCorners = [
    { tx: -baseW / 2, tz: -baseW / 2 },
    { tx: baseW / 2, tz: -baseW / 2 },
    { tx: -baseW / 2, tz: baseW / 2 },
    { tx: baseW / 2, tz: baseW / 2 },
  ];
  towerCorners.forEach(({ tx, tz }, i) => {
    const towerD = 3 * scale;
    const towerH = (isShowcase ? 9 : 5.5) * scale + (i === 0 ? 1.8 * scale : 0);
    const tower = MeshBuilder.CreateCylinder(`${kingdom.name}_tower_${i}`, {
      height: towerH, diameter: towerD, tessellation: 10,
    }, scene);
    tower.position.set(tx, towerH / 2 + 0.6 * scale, tz);
    tower.material = wallMat;
    addMesh(tower);

    const cone = MeshBuilder.CreateCylinder(`${kingdom.name}_cone_${i}`, {
      height: 2.5 * scale, diameterTop: 0, diameterBottom: towerD * 1.1, tessellation: 10,
    }, scene);
    cone.position.set(tx, towerH + 0.6 * scale + 1.25 * scale, tz);
    cone.material = roofMat;
    addMesh(cone);
  });

  const keepW = 5.5 * scale;
  const keepH = (isShowcase ? 7.5 : 4.5) * scale;
  const keep = MeshBuilder.CreateBox(`${kingdom.name}_keep`, {
    width: keepW, height: keepH, depth: keepW,
  }, scene);
  keep.position.y = keepH / 2 + 0.6 * scale;
  keep.material = wallMat;
  addMesh(keep);

  const keepRoof = MeshBuilder.CreateCylinder(`${kingdom.name}_keepRoof`, {
    height: 3 * scale, diameterTop: 0.3 * scale, diameterBottom: keepW * 1.2, tessellation: 8,
  }, scene);
  keepRoof.position.y = keepH + 0.6 * scale + 1.5 * scale;
  keepRoof.material = roofMat;
  addMesh(keepRoof);

  if (isShowcase) {
    const flagPole = MeshBuilder.CreateCylinder(`${kingdom.name}_flagpole`, {
      height: 4 * scale, diameter: 0.15 * scale, tessellation: 6,
    }, scene);
    flagPole.position.y = keepH + 0.6 * scale + 3 * scale + 2 * scale;
    flagPole.material = accentMat;
    addMesh(flagPole);

    const flag = MeshBuilder.CreateBox(`${kingdom.name}_flag`, {
      width: 1.8 * scale, height: 0.9 * scale, depth: 0.1 * scale,
    }, scene);
    flag.position.set(0.9 * scale, keepH + 0.6 * scale + 3 * scale + 3.7 * scale, 0);
    flag.material = roofMat;
    addMesh(flag);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const torch = MeshBuilder.CreateCylinder(`${kingdom.name}_torch_${i}`, {
        height: 0.8 * scale, diameter: 0.2 * scale, tessellation: 6,
      }, scene);
      torch.position.set(
        Math.cos(angle) * baseW * 0.38,
        wallH + 0.6 * scale + 0.4 * scale,
        Math.sin(angle) * baseW * 0.38,
      );
      torch.material = accentMat;
      addMesh(torch);
    }

    const gate = MeshBuilder.CreateBox(`${kingdom.name}_gate`, {
      width: 2.2 * scale, height: 3.5 * scale, depth: wallT,
    }, scene);
    gate.position.set(0, 3.5 * scale / 2 + 0.6 * scale, -(baseW / 2 - wallT / 2));
    gate.material = groundMat;
    addMesh(gate);
  }

  return root;
}

export function createKingdoms(
  scene: Scene,
  kingdoms: Kingdom[],
  shadowGenerator: ShadowGenerator | null,
  onSelect: (k: Kingdom) => void,
) {
  kingdoms.forEach((k) => buildCastle(scene, k, shadowGenerator, onSelect));
}
