import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Vector3,
  Mesh,
} from "@babylonjs/core";
import { WORLD_SIZE } from "../engine/CoordinateEngine";

function seed(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type BiomeType = "GRASS" | "FOREST" | "MOUNTAIN" | "WATER" | "DESERT" | "SWAMP";

interface BiomeAnchor {
  px: number; py: number;
  rx: number; ry: number;
  angle: number;
  type: BiomeType;
}

const BIOME_BASE: Record<BiomeType, [number, number, number]> = {
  GRASS:    [80, 162, 50],
  FOREST:   [26,  76, 18],
  MOUNTAIN: [112, 103, 90],
  WATER:    [34,  98, 178],
  DESERT:   [196, 162,  96],
  SWAMP:    [44,  76, 36],
};

const BIOME_DARK: Record<BiomeType, [number, number, number]> = {
  GRASS:    [52, 118, 28],
  FOREST:   [16,  52, 10],
  MOUNTAIN: [82,  76, 66],
  WATER:    [22,  68, 138],
  DESERT:   [170, 138, 72],
  SWAMP:    [30,  56, 24],
};

const BIOME_LIGHT: Record<BiomeType, [number, number, number]> = {
  GRASS:    [110, 190, 72],
  FOREST:   [38, 100, 24],
  MOUNTAIN: [148, 140, 126],
  WATER:    [58, 132, 210],
  DESERT:   [218, 190, 128],
  SWAMP:    [60, 98, 48],
};

function lerp3(a: [number,number,number], b: [number,number,number], t: number): [number,number,number] {
  return [
    Math.round(a[0] + (b[0]-a[0])*t),
    Math.round(a[1] + (b[1]-a[1])*t),
    Math.round(a[2] + (b[2]-a[2])*t),
  ];
}

function rgb(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function drawBiomePatch(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  rx: number, ry: number,
  angle: number,
  type: BiomeType,
  alpha: number
) {
  const base = BIOME_BASE[type];
  const dark = BIOME_DARK[type];
  const light = BIOME_LIGHT[type];

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle);
  ctx.scale(1, ry / rx);

  // Outer soft blob
  const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
  const mid = lerp3(dark, base, 0.5);
  grad.addColorStop(0,   rgb(...base, alpha));
  grad.addColorStop(0.3, rgb(...base, alpha * 0.95));
  grad.addColorStop(0.6, rgb(...mid,  alpha * 0.7));
  grad.addColorStop(0.85, rgb(...dark, alpha * 0.45));
  grad.addColorStop(1,   rgb(...dark, 0));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Inner highlight (slight lighter core)
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(angle + 0.3);
  ctx.scale(1, (ry * 0.5) / (rx * 0.5));
  const grad2 = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 0.4);
  grad2.addColorStop(0,   rgb(...light, alpha * 0.25));
  grad2.addColorStop(1,   rgb(...light, 0));
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function addBiomeDetail(
  ctx: CanvasRenderingContext2D,
  texSize: number,
  anchors: BiomeAnchor[]
) {
  // Forest trees from above (dark green dots)
  for (const a of anchors) {
    if (a.type !== "FOREST") continue;
    const count = 60;
    for (let i = 0; i < count; i++) {
      const angle = seed(a.px * 31 + a.py * 17 + i * 7) * Math.PI * 2;
      const dist = seed(a.px * 13 + a.py * 29 + i * 11) * a.rx * 0.85;
      const tx = a.px + Math.cos(angle) * dist;
      const ty = a.py + Math.sin(angle) * dist * (a.ry / a.rx);
      const r = 3 + seed(a.px + a.py + i * 19) * 7;
      const v = seed(a.px * 3 + i) * 0.4;
      const [br, bg, bb] = BIOME_DARK.FOREST;
      ctx.globalAlpha = 0.35 + v * 0.3;
      ctx.fillStyle = rgb(br + Math.round(v * 20), bg + Math.round(v * 30), bb + Math.round(v * 10));
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mountain rocks — grey patches and streaks
  for (const a of anchors) {
    if (a.type !== "MOUNTAIN") continue;
    const count = 50;
    for (let i = 0; i < count; i++) {
      const angle = seed(a.px * 41 + a.py * 23 + i * 13) * Math.PI * 2;
      const dist = seed(a.px * 7 + a.py * 37 + i * 17) * a.rx * 0.9;
      const tx = a.px + Math.cos(angle) * dist;
      const ty = a.py + Math.sin(angle) * dist * (a.ry / a.rx);
      const w = 4 + seed(a.px + i * 3) * 16;
      const h = 2 + seed(a.py + i * 5) * 8;
      const rot = seed(i * 37) * Math.PI;
      const v = seed(a.px + i * 11) * 0.6;
      const gv = Math.round(v * 50);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.28 + v * 0.25;
      ctx.fillStyle = v > 0.5
        ? rgb(155 + gv, 150 + gv, 140 + gv)
        : rgb(70 + gv, 65 + gv, 58 + gv);
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Snow caps on peaks (lighter center)
    ctx.save();
    ctx.translate(a.px, a.py);
    const snowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, a.rx * 0.28);
    snowGrad.addColorStop(0, rgb(235, 235, 230, 0.55));
    snowGrad.addColorStop(1, rgb(200, 198, 190, 0));
    ctx.fillStyle = snowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, a.rx * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Water shimmer lines
  for (const a of anchors) {
    if (a.type !== "WATER") continue;
    for (let i = 0; i < 18; i++) {
      const lineY = a.py - a.ry * 0.7 + i * (a.ry * 1.4 / 18);
      const lineX1 = a.px - a.rx * (0.5 + seed(a.px + i) * 0.35);
      const lineX2 = a.px + a.rx * (0.5 + seed(a.py + i) * 0.35);
      ctx.globalAlpha = 0.1 + seed(i * 17) * 0.1;
      ctx.strokeStyle = rgb(140, 195, 240);
      ctx.lineWidth = 1 + seed(i * 3) * 1.5;
      ctx.beginPath();
      ctx.moveTo(lineX1, lineY);
      ctx.lineTo(lineX2, lineY + seed(i * 7) * 3 - 1.5);
      ctx.stroke();
    }
  }

  // Desert dunes
  for (const a of anchors) {
    if (a.type !== "DESERT") continue;
    for (let i = 0; i < 30; i++) {
      const tx = a.px + (seed(a.px + i * 7) - 0.5) * a.rx * 1.5;
      const ty = a.py + (seed(a.py + i * 11) - 0.5) * a.ry * 1.5;
      const rx = 8 + seed(i * 5) * 30;
      const ry = 2 + seed(i * 9) * 8;
      const rot = seed(i * 3) * Math.PI;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.15 + seed(i * 13) * 0.2;
      const dv = seed(i * 19);
      ctx.fillStyle = dv > 0.5 ? rgb(218, 186, 120) : rgb(160, 130, 72);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Grass blades / patches across whole map
  for (let i = 0; i < 1200; i++) {
    const tx = seed(i * 3.71) * texSize;
    const ty = seed(i * 5.33) * texSize;
    const v = seed(i * 9.11);
    ctx.globalAlpha = 0.06 + v * 0.1;
    ctx.fillStyle = v > 0.6
      ? rgb(108, 190, 68)
      : v > 0.3 ? rgb(54, 108, 28) : rgb(80, 148, 40);
    ctx.beginPath();
    ctx.ellipse(tx, ty, 3 + v * 12, 2 + v * 8, seed(i) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createWorldFloor(scene: Scene): Mesh {
  const ground = MeshBuilder.CreateGround(
    "WorldFloor",
    { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: 4 },
    scene
  );
  ground.position = new Vector3(WORLD_SIZE / 2, 0, WORLD_SIZE / 2);
  ground.isPickable = true;
  ground.receiveShadows = true;

  const texSize = 2048;
  const texture = new DynamicTexture("BiomeTex", { width: texSize, height: texSize }, scene);
  const ctx = texture.getContext() as CanvasRenderingContext2D;

  // Base fill — rich grassland
  const baseGrad = ctx.createLinearGradient(0, 0, texSize, texSize);
  baseGrad.addColorStop(0,   rgb(68, 148, 42));
  baseGrad.addColorStop(0.4, rgb(80, 162, 50));
  baseGrad.addColorStop(0.7, rgb(58, 130, 36));
  baseGrad.addColorStop(1,   rgb(72, 155, 44));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, texSize, texSize);

  // Scale factor: texSize / WORLD_SIZE
  const sc = texSize / WORLD_SIZE;

  // Define biome anchors
  const anchors: BiomeAnchor[] = [];
  let s = 0;

  const addAnchors = (
    type: BiomeType,
    count: number,
    minRx: number, maxRx: number,
    minRatio: number, maxRatio: number
  ) => {
    for (let i = 0; i < count; i++) {
      const wx = 200 + seed(s++) * (WORLD_SIZE - 400);
      const wy = 200 + seed(s++) * (WORLD_SIZE - 400);
      const rx = (minRx + seed(s++) * (maxRx - minRx)) * sc;
      const ratio = minRatio + seed(s++) * (maxRatio - minRatio);
      const angle = seed(s++) * Math.PI;
      anchors.push({ px: wx * sc, py: wy * sc, rx, ry: rx * ratio, angle, type });
    }
  };

  // Large forest zones — many, spread across the world
  addAnchors("FOREST",   18, 120, 280, 0.5, 1.2);
  // Mountain ranges — elongated
  addAnchors("MOUNTAIN", 10, 130, 320, 0.35, 0.65);
  // Water bodies — roughly circular
  addAnchors("WATER",     8,  90, 200, 0.6, 1.1);
  // Desert patches
  addAnchors("DESERT",    7, 100, 240, 0.5, 0.9);
  // Swamp patches (dark greenish)
  addAnchors("SWAMP",     5,  80, 160, 0.6, 1.0);
  // Extra grassland bright patches
  addAnchors("GRASS",    12,  80, 180, 0.55, 1.0);

  ctx.globalAlpha = 1;

  // Draw biomes back-to-front: GRASS first, then thematic, WATER on top
  const order: BiomeType[] = ["GRASS", "DESERT", "SWAMP", "FOREST", "MOUNTAIN", "WATER"];
  const alphaMap: Record<BiomeType, number> = {
    GRASS: 0.4, FOREST: 0.88, MOUNTAIN: 0.85, WATER: 0.92, DESERT: 0.80, SWAMP: 0.75,
  };

  for (const biomeType of order) {
    for (const a of anchors) {
      if (a.type !== biomeType) continue;
      ctx.globalAlpha = 1;
      drawBiomePatch(ctx, a.px, a.py, a.rx, a.ry, a.angle, a.type, alphaMap[a.type]);
    }
  }

  ctx.globalAlpha = 1;
  addBiomeDetail(ctx, texSize, anchors);

  // Vignette edge darkening (world edge)
  const vignette = ctx.createRadialGradient(
    texSize * 0.5, texSize * 0.5, texSize * 0.3,
    texSize * 0.5, texSize * 0.5, texSize * 0.72
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.globalAlpha = 1;
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, texSize, texSize);

  // Coast/shore glow around water bodies
  for (const a of anchors) {
    if (a.type !== "WATER") continue;
    ctx.save();
    ctx.translate(a.px, a.py);
    ctx.scale(1, a.ry / a.rx);
    const shore = ctx.createRadialGradient(0, 0, a.rx * 0.85, 0, 0, a.rx * 1.12);
    shore.addColorStop(0, "rgba(120,196,120,0)");
    shore.addColorStop(0.5, "rgba(140,210,110,0.22)");
    shore.addColorStop(1, "rgba(80,160,60,0)");
    ctx.fillStyle = shore;
    ctx.beginPath();
    ctx.arc(0, 0, a.rx * 1.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  texture.update();

  // No tiling — single texture covers the world
  texture.wrapU = 0;
  texture.wrapV = 0;
  texture.uScale = 1;
  texture.vScale = 1;

  const mat = new StandardMaterial("BiomeMat", scene);
  mat.diffuseTexture = texture;
  mat.diffuseColor = new Color3(1.0, 1.0, 1.0);
  mat.specularColor = new Color3(0.04, 0.05, 0.03);
  mat.ambientColor = new Color3(0.55, 0.65, 0.45);
  ground.material = mat;
  return ground;
}
