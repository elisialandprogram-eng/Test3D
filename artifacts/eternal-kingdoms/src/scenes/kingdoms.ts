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
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// LOK-accurate stone/dark palettes
const THEMES = [
  { primary: new Color3(0.24, 0.19, 0.15), secondary: new Color3(0.55, 0.50, 0.44), accent: new Color3(0.78, 0.60, 0.20) },
  { primary: new Color3(0.18, 0.24, 0.38), secondary: new Color3(0.50, 0.52, 0.58), accent: new Color3(0.72, 0.68, 0.22) },
  { primary: new Color3(0.20, 0.28, 0.18), secondary: new Color3(0.44, 0.52, 0.40), accent: new Color3(0.68, 0.58, 0.18) },
  { primary: new Color3(0.36, 0.26, 0.12), secondary: new Color3(0.56, 0.50, 0.38), accent: new Color3(0.80, 0.62, 0.16) },
  { primary: new Color3(0.30, 0.16, 0.32), secondary: new Color3(0.50, 0.44, 0.54), accent: new Color3(0.75, 0.58, 0.18) },
  { primary: new Color3(0.16, 0.28, 0.36), secondary: new Color3(0.44, 0.50, 0.54), accent: new Color3(0.70, 0.62, 0.18) },
];

const NAMES = [
  "Ironveil Keep","Stormcrest","Ashenmoor","Duskhaven","Embervale",
  "Frostpeak","Grimhold","Hallowmere","Irongate","Jadespire",
  "Kingsfall","Lightshade","Moonhallow","Nightwatch","Oakhaven",
  "Peakwatch","Queensbury","Ravencrest","Shadowfen","Thornwall","Umbervale",
];
const TYPES = ["Iron Age","Bronze Age","Stone Age","Silver Age","Gold Age"];

export function generateKingdomPositions(): Kingdom[] {
  const rand = seededRand(99173);
  const list: Kingdom[] = [];

  list.push({ name: "Ironveil Keep", x: 0, z: 0, type: "Gold Age", level: 25, colorTheme: THEMES[0], isShowcase: true });

  for (let t = 0; t < 500 && list.length < 21; t++) {
    const x = (rand() - 0.5) * 420;
    const z = (rand() - 0.5) * 420;
    let bad = false;
    for (const k of list) {
      const dx = x - k.x, dz = z - k.z;
      if (dx * dx + dz * dz < 26 * 26) { bad = true; break; }
    }
    if (bad) continue;
    const idx = list.length;
    list.push({
      name: NAMES[idx] ?? `Kingdom ${idx}`,
      x, z,
      type: TYPES[Math.floor(rand() * TYPES.length)],
      level: Math.floor(rand() * 22) + 3,
      colorTheme: THEMES[Math.floor(rand() * THEMES.length)],
    });
  }
  return list;
}

// ── Build a single LOK-style mini-castle ─────────────────────────────────────
function buildCastle(
  scene: Scene,
  k: Kingdom,
  sg: ShadowGenerator | null,
  onSelect: (k: Kingdom) => void,
) {
  const { x, z, colorTheme, isShowcase } = k;

  // LOK kingdoms are TINY from top view — non-showcase ~3-4 units wide
  const S = isShowcase ? 0.75 : 0.30 + (Math.abs(Math.sin(x * 0.5 + z * 0.3)) * 0.12);

  const root = new Mesh(`kr_${k.name}`, scene);
  root.position = new Vector3(x, 0, z);

  const wMat = new StandardMaterial(`wm_${k.name}`, scene);
  wMat.diffuseColor = colorTheme.secondary;
  wMat.specularColor = Color3.Black();
  wMat.ambientColor = colorTheme.secondary.scale(0.6);

  const rMat = new StandardMaterial(`rm_${k.name}`, scene);
  rMat.diffuseColor = colorTheme.primary;
  rMat.specularColor = Color3.Black();
  rMat.ambientColor = colorTheme.primary.scale(0.6);

  const gMat = new StandardMaterial(`gm_${k.name}`, scene);
  gMat.diffuseColor = new Color3(0.58, 0.52, 0.44);
  gMat.specularColor = Color3.Black();
  gMat.ambientColor = new Color3(0.5, 0.48, 0.42);

  const aMat = new StandardMaterial(`am_${k.name}`, scene);
  aMat.diffuseColor = colorTheme.accent;
  aMat.specularColor = Color3.Black();
  aMat.emissiveColor = colorTheme.accent.scale(0.1);

  const all: Mesh[] = [];
  const add = (m: Mesh) => {
    m.parent = root;
    all.push(m);
    if (sg) { sg.addShadowCaster(m); m.receiveShadows = true; }
    m.actionManager = new ActionManager(scene);
    m.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => onSelect(k)));
    return m;
  };

  const BW = 6 * S; // base width

  // Ground pad
  const base = MeshBuilder.CreateBox(`b_${k.name}`, { width: BW + S, height: 0.3 * S, depth: BW + S }, scene);
  base.position.y = 0.15 * S;
  base.material = gMat;
  add(base);

  // Curtain walls
  const WH = 1.4 * S, WT = 0.35 * S;
  [
    { w: BW, h: WH, d: WT, px: 0, pz: -BW / 2 },
    { w: BW, h: WH, d: WT, px: 0, pz:  BW / 2 },
    { w: WT, h: WH, d: BW, px: -BW / 2, pz: 0 },
    { w: WT, h: WH, d: BW, px:  BW / 2, pz: 0 },
  ].forEach(({ w, h, d, px, pz }, i) => {
    const wall = MeshBuilder.CreateBox(`w_${k.name}_${i}`, { width: w, height: h, depth: d }, scene);
    wall.position.set(px, 0.3 * S + h / 2, pz);
    wall.material = wMat;
    add(wall);
  });

  // Corner towers
  [
    { tx: -BW / 2, tz: -BW / 2 },
    { tx:  BW / 2, tz: -BW / 2 },
    { tx: -BW / 2, tz:  BW / 2 },
    { tx:  BW / 2, tz:  BW / 2 },
  ].forEach(({ tx, tz }, i) => {
    const tD = 1.6 * S;
    const tH = (isShowcase ? 3.2 : 2.2) * S + (i === 0 ? 0.4 * S : 0);
    const tower = MeshBuilder.CreateCylinder(`t_${k.name}_${i}`, { height: tH, diameter: tD, tessellation: 9 }, scene);
    tower.position.set(tx, 0.3 * S + tH / 2, tz);
    tower.material = wMat;
    add(tower);

    const tr = MeshBuilder.CreateCylinder(`tr_${k.name}_${i}`, {
      height: 0.9 * S, diameterTop: 0, diameterBottom: tD * 1.15, tessellation: 9,
    }, scene);
    tr.position.set(tx, 0.3 * S + tH + 0.45 * S, tz);
    tr.material = rMat;
    add(tr);
  });

  // Central keep
  const KW = 3.2 * S;
  const KH = (isShowcase ? 4.0 : 2.8) * S;
  const keep = MeshBuilder.CreateBox(`k_${k.name}`, { width: KW, height: KH, depth: KW }, scene);
  keep.position.y = 0.3 * S + KH / 2;
  keep.material = wMat;
  add(keep);

  // Keep roof cone
  const kr = MeshBuilder.CreateCylinder(`kr_${k.name}`, {
    height: (isShowcase ? 2.0 : 1.4) * S, diameterTop: 0, diameterBottom: KW * 1.2, tessellation: 8,
  }, scene);
  kr.position.y = 0.3 * S + KH + (isShowcase ? 1.0 : 0.7) * S;
  kr.material = rMat;
  add(kr);

  // Showcase extras: flag
  if (isShowcase) {
    const pole = MeshBuilder.CreateCylinder(`p_${k.name}`, { height: 3.0 * S, diameter: 0.1 * S, tessellation: 5 }, scene);
    pole.position.y = 0.3 * S + KH + 2.0 * S + 1.5 * S;
    pole.material = aMat;
    add(pole);

    const flag = MeshBuilder.CreateBox(`f_${k.name}`, { width: 1.4 * S, height: 0.7 * S, depth: 0.08 * S }, scene);
    flag.position.set(0.7 * S, 0.3 * S + KH + 2.0 * S + 2.9 * S, 0);
    flag.material = rMat;
    add(flag);
  }

  // Level badge — diamond sprite
  buildBadge(scene, root, k, S);
}

function buildBadge(scene: Scene, parent: Mesh, k: Kingdom, S: number) {
  const BADGE_W = 3.0, BADGE_H = 1.4;
  const plane = MeshBuilder.CreatePlane(`badge_${k.name}`, { width: BADGE_W, height: BADGE_H }, scene);
  const castleH = 0.3 * S + (k.isShowcase ? 4.0 : 2.8) * S + (k.isShowcase ? 2.0 : 1.4) * S + 2.5;
  plane.position = new Vector3(0, castleH, 0);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  plane.parent = parent;

  const tex = new DynamicTexture(`bt_${k.name}`, { width: 256, height: 128 }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, 256, 128);

  // Diamond icon
  const diamondX = 30, diamondY = 64, dSize = 18;
  ctx.save();
  ctx.translate(diamondX, diamondY);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = k.isShowcase ? "#ffd700" : "#cc4444";
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.fillRect(-dSize / 2, -dSize / 2, dSize, dSize);
  ctx.strokeRect(-dSize / 2, -dSize / 2, dSize, dSize);
  ctx.restore();

  // Level text
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`Lv.${k.level}`, 52, 64);

  tex.update();
  const mat = new StandardMaterial(`bm_${k.name}`, scene);
  mat.diffuseTexture = tex;
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveColor = new Color3(1, 1, 1);
  mat.disableLighting = true;
  mat.backFaceCulling = false;
  plane.material = mat;
}

export function createKingdoms(
  scene: Scene,
  kingdoms: Kingdom[],
  sg: ShadowGenerator | null,
  onSelect: (k: Kingdom) => void,
) {
  kingdoms.forEach((k) => buildCastle(scene, k, sg, onSelect));
}
