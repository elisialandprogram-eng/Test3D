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
  DynamicTexture,
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

const KINGDOM_THEMES = [
  { primary: new Color3(0.28, 0.22, 0.18), secondary: new Color3(0.55, 0.50, 0.44), accent: new Color3(0.75, 0.60, 0.20) },
  { primary: new Color3(0.20, 0.28, 0.40), secondary: new Color3(0.50, 0.52, 0.58), accent: new Color3(0.72, 0.68, 0.22) },
  { primary: new Color3(0.22, 0.30, 0.20), secondary: new Color3(0.45, 0.52, 0.42), accent: new Color3(0.68, 0.58, 0.18) },
  { primary: new Color3(0.38, 0.28, 0.14), secondary: new Color3(0.58, 0.52, 0.40), accent: new Color3(0.78, 0.62, 0.16) },
  { primary: new Color3(0.32, 0.18, 0.35), secondary: new Color3(0.52, 0.46, 0.55), accent: new Color3(0.75, 0.58, 0.18) },
  { primary: new Color3(0.18, 0.30, 0.38), secondary: new Color3(0.44, 0.52, 0.55), accent: new Color3(0.70, 0.62, 0.18) },
];

const KINGDOM_NAMES = [
  "Ironveil Keep", "Stormcrest", "Ashenmoor", "Duskhaven", "Embervale",
  "Frostpeak", "Grimhold", "Hallowmere", "Irongate", "Jadespire",
  "Kingsfall", "Lightshade", "Moonhallow", "Nightwatch", "Oakhaven",
  "Peakwatch", "Queensbury", "Ravencrest", "Shadowfen", "Thornwall", "Umbervale",
];

const KINGDOM_TYPES = ["Iron Age", "Bronze Age", "Stone Age", "Silver Age", "Gold Age"];

export function generateKingdomPositions(): Kingdom[] {
  const rand = seededRand(99173);
  const kingdoms: Kingdom[] = [];

  kingdoms.push({
    name: "Ironveil Keep",
    x: 0, z: 0,
    type: "Gold Age", level: 25,
    colorTheme: KINGDOM_THEMES[0],
    isShowcase: true,
  });

  for (let t = 0; t < 400 && kingdoms.length < 21; t++) {
    const x = (rand() - 0.5) * 420;
    const z = (rand() - 0.5) * 420;
    let tooClose = false;
    for (const k of kingdoms) {
      const dx = x - k.x, dz = z - k.z;
      if (dx * dx + dz * dz < 26 * 26) { tooClose = true; break; }
    }
    if (tooClose) continue;
    const idx = kingdoms.length;
    kingdoms.push({
      name: KINGDOM_NAMES[idx] ?? `Kingdom ${idx}`,
      x, z,
      type: KINGDOM_TYPES[Math.floor(rand() * KINGDOM_TYPES.length)],
      level: Math.floor(rand() * 22) + 3,
      colorTheme: KINGDOM_THEMES[Math.floor(rand() * KINGDOM_THEMES.length)],
    });
  }
  return kingdoms;
}

// LOK-style: small, compact, flat-looking castle with level badge
function buildKingdom(
  scene: Scene,
  kingdom: Kingdom,
  shadowGenerator: ShadowGenerator | null,
  onSelect: (k: Kingdom) => void,
) {
  const { x, z, colorTheme, isShowcase, level } = kingdom;
  const scale = isShowcase ? 1.0 : 0.55 + (Math.abs(Math.sin(x * 0.5 + z * 0.3)) * 0.25);

  const root = new Mesh(`k_root_${kingdom.name}`, scene);
  root.position = new Vector3(x, 0, z);

  const wallMat = new StandardMaterial(`wm_${kingdom.name}`, scene);
  wallMat.diffuseColor = colorTheme.secondary;
  wallMat.specularColor = new Color3(0.03, 0.03, 0.03);

  const roofMat = new StandardMaterial(`rm_${kingdom.name}`, scene);
  roofMat.diffuseColor = colorTheme.primary;
  roofMat.specularColor = new Color3(0.02, 0.02, 0.02);

  const groundMat = new StandardMaterial(`gm_${kingdom.name}`, scene);
  groundMat.diffuseColor = new Color3(0.55, 0.50, 0.42);
  groundMat.specularColor = Color3.Black();

  const accentMat = new StandardMaterial(`am_${kingdom.name}`, scene);
  accentMat.diffuseColor = colorTheme.accent;
  accentMat.specularColor = new Color3(0.1, 0.08, 0.02);
  accentMat.specularPower = 24;

  const meshes: Mesh[] = [];
  function add(m: Mesh) {
    m.parent = root;
    meshes.push(m);
    if (shadowGenerator) { shadowGenerator.addShadowCaster(m); m.receiveShadows = true; }
    m.actionManager = new ActionManager(scene);
    m.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => onSelect(kingdom)));
    return m;
  }

  const S = scale;
  const baseW = 6 * S;

  // Ground platform
  const base = MeshBuilder.CreateBox(`k_base_${kingdom.name}`, { width: baseW + 1 * S, height: 0.35 * S, depth: baseW + 1 * S }, scene);
  base.position.y = 0.175 * S;
  base.material = groundMat;
  add(base);

  // Main keep (compact box)
  const keepW = 3.0 * S;
  const keepH = (isShowcase ? 3.5 : 2.4) * S;
  const keep = MeshBuilder.CreateBox(`k_keep_${kingdom.name}`, { width: keepW, height: keepH, depth: keepW }, scene);
  keep.position.y = 0.35 * S + keepH / 2;
  keep.material = wallMat;
  add(keep);

  // Roof
  const roof = MeshBuilder.CreateCylinder(`k_roof_${kingdom.name}`, {
    height: (isShowcase ? 1.8 : 1.3) * S,
    diameterTop: 0,
    diameterBottom: keepW * 1.15,
    tessellation: 8,
  }, scene);
  roof.position.y = 0.35 * S + keepH + (isShowcase ? 0.9 : 0.65) * S;
  roof.material = roofMat;
  add(roof);

  // 4 corner towers (smaller)
  const towerOffsets = [
    { tx: -baseW / 2, tz: -baseW / 2 },
    { tx: baseW / 2, tz: -baseW / 2 },
    { tx: -baseW / 2, tz: baseW / 2 },
    { tx: baseW / 2, tz: baseW / 2 },
  ];
  towerOffsets.forEach(({ tx, tz }, i) => {
    const tD = 1.5 * S;
    const tH = (isShowcase ? 2.8 : 1.8) * S + (i === 0 ? 0.5 * S : 0);
    const tower = MeshBuilder.CreateCylinder(`k_tw_${kingdom.name}_${i}`, {
      height: tH, diameter: tD, tessellation: 8,
    }, scene);
    tower.position.set(tx, 0.35 * S + tH / 2, tz);
    tower.material = wallMat;
    add(tower);

    const tRoof = MeshBuilder.CreateCylinder(`k_tr_${kingdom.name}_${i}`, {
      height: 0.8 * S, diameterTop: 0, diameterBottom: tD * 1.12, tessellation: 8,
    }, scene);
    tRoof.position.set(tx, 0.35 * S + tH + 0.4 * S, tz);
    tRoof.material = roofMat;
    add(tRoof);
  });

  // Curtain walls connecting towers
  const wallH = 1.4 * S;
  const wallT = 0.35 * S;
  const wallDefs = [
    { w: baseW, h: wallH, d: wallT, px: 0, pz: -baseW / 2 },
    { w: baseW, h: wallH, d: wallT, px: 0, pz: baseW / 2 },
    { w: wallT, h: wallH, d: baseW, px: -baseW / 2, pz: 0 },
    { w: wallT, h: wallH, d: baseW, px: baseW / 2, pz: 0 },
  ];
  wallDefs.forEach(({ w, h, d, px, pz }, i) => {
    const wall = MeshBuilder.CreateBox(`k_w_${kingdom.name}_${i}`, { width: w, height: h, depth: d }, scene);
    wall.position.set(px, 0.35 * S + h / 2, pz);
    wall.material = wallMat;
    add(wall);
  });

  // Showcase extras
  if (isShowcase) {
    const pole = MeshBuilder.CreateCylinder(`k_pole_${kingdom.name}`, {
      height: 2.8 * S, diameter: 0.1 * S, tessellation: 5,
    }, scene);
    pole.position.y = 0.35 * S + keepH + 1.8 * S + 1.4 * S;
    pole.material = accentMat;
    add(pole);

    const flag = MeshBuilder.CreateBox(`k_flag_${kingdom.name}`, {
      width: 1.2 * S, height: 0.65 * S, depth: 0.08 * S,
    }, scene);
    flag.position.set(0.6 * S, 0.35 * S + keepH + 1.8 * S + 2.7 * S, 0);
    flag.material = roofMat;
    add(flag);
  }

  // Level badge — floating diamond plane with text
  createLevelBadge(scene, root, kingdom, S);

  return root;
}

function createLevelBadge(scene: Scene, parent: Mesh, kingdom: Kingdom, scale: number) {
  const badgeSize = 2.2;
  const badgePlane = MeshBuilder.CreatePlane(`k_badge_${kingdom.name}`, {
    width: badgeSize, height: badgeSize * 0.55,
  }, scene);

  const totalHeight = 0.35 * scale + (kingdom.isShowcase ? 5.5 : 3.5) * scale + 2.2;
  badgePlane.position = new Vector3(0, totalHeight, 0);
  badgePlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  badgePlane.parent = parent;

  const badgeTex = new DynamicTexture(`badge_tex_${kingdom.name}`, { width: 256, height: 128 }, scene, false);
  const ctx = badgeTex.getContext() as CanvasRenderingContext2D;

  ctx.clearRect(0, 0, 256, 128);

  // Diamond shape
  ctx.save();
  ctx.translate(36, 64);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = kingdom.isShowcase ? "#c9a227" : "#888899";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeRect(-16, -16, 32, 32);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Lv.${kingdom.level}`, 62, 69);

  badgeTex.update();

  const badgeMat = new StandardMaterial(`badge_mat_${kingdom.name}`, scene);
  badgeMat.diffuseTexture = badgeTex;
  badgeMat.emissiveColor = new Color3(1, 1, 1);
  badgeMat.disableLighting = true;
  badgeMat.diffuseTexture.hasAlpha = true;
  badgeMat.useAlphaFromDiffuseTexture = true;
  badgeMat.backFaceCulling = false;
  badgePlane.material = badgeMat;
}

export function createKingdoms(
  scene: Scene,
  kingdoms: Kingdom[],
  shadowGenerator: ShadowGenerator | null,
  onSelect: (k: Kingdom) => void,
) {
  kingdoms.forEach((k) => buildKingdom(scene, k, shadowGenerator, onSelect));
}
