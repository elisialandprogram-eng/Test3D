import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Vector3,
  Mesh,
} from "@babylonjs/core";

// Simple smooth noise
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (d - b) * ux * uy - (c - a) * ux * uy;
}

function fbm(x: number, y: number, octaves = 4): number {
  let v = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return v / max;
}

const TEX_SIZE = 1024;

// LOK terrain color palette
const PALETTE = {
  grass_bright: [88, 167, 50],    // bright lime green (main)
  grass_mid: [68, 138, 42],       // medium green
  grass_dark: [48, 105, 30],      // darker green (forest shade)
  dirt: [180, 140, 82],           // sandy dirt path
  dirt_dark: [148, 110, 58],      // darker dirt
  forest: [38, 85, 22],           // deep forest
};

function lerpColor(a: number[], b: number[], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function createTerrain(scene: Scene): Mesh {
  const WORLD_SIZE = 500;
  const SUBDIVISIONS = 4; // Flat terrain - no need for many subdivisions

  const ground = MeshBuilder.CreateGround(
    "terrain",
    { width: WORLD_SIZE, height: WORLD_SIZE, subdivisions: SUBDIVISIONS },
    scene,
  );
  ground.position.y = 0;

  // Build the painted texture
  const tex = new DynamicTexture("terrainTex", { width: TEX_SIZE, height: TEX_SIZE }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;

  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const data = imgData.data;

  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px = 0; px < TEX_SIZE; px++) {
      const nx = px / TEX_SIZE;
      const ny = py / TEX_SIZE;

      // Large color zones
      const zone = fbm(nx * 2.5 + 0.3, ny * 2.5 + 0.7, 4);
      const detail = fbm(nx * 7, ny * 7, 3);
      const micro = fbm(nx * 18, ny * 18, 2);

      // Dirt path winding (noise-based "rivers" of dirt)
      const dirtNoise = fbm(nx * 3 + 1.7, ny * 3 + 0.9, 4);
      const dirtRidge = Math.abs(dirtNoise - 0.45);
      const dirtFactor = smoothstep(0.06, 0.0, dirtRidge);

      // Forest patches
      const forestNoise = fbm(nx * 2.8 + 5.1, ny * 2.8 + 3.3, 3);
      const forestFactor = smoothstep(0.52, 0.65, forestNoise);

      let r: number, g: number, b: number;
      let color: [number, number, number];

      // Base grass
      if (zone < 0.35) {
        color = lerpColor(PALETTE.grass_dark, PALETTE.grass_mid, detail);
      } else if (zone < 0.65) {
        color = lerpColor(PALETTE.grass_mid, PALETTE.grass_bright, detail);
      } else {
        color = lerpColor(PALETTE.grass_bright, PALETTE.grass_mid, detail * 0.5);
      }

      // Apply forest patches
      if (forestFactor > 0.01) {
        color = lerpColor(color, PALETTE.forest, forestFactor * 0.6);
      }

      // Apply micro-texture variation
      color = [
        Math.max(0, Math.min(255, color[0] + Math.round((micro - 0.5) * 14))),
        Math.max(0, Math.min(255, color[1] + Math.round((micro - 0.5) * 18))),
        Math.max(0, Math.min(255, color[2] + Math.round((micro - 0.5) * 8))),
      ];

      // Apply dirt paths on top
      if (dirtFactor > 0.05) {
        const dirtColor = lerpColor(PALETTE.dirt_dark, PALETTE.dirt, detail);
        color = lerpColor(color, dirtColor, Math.min(1, dirtFactor * 2.5));
      }

      [r, g, b] = color;
      const idx = (py * TEX_SIZE + px) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  tex.update();

  const mat = new StandardMaterial("terrainMat", scene);
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.02, 0.02, 0.02);
  mat.ambientColor = new Color3(0.5, 0.5, 0.5);

  ground.material = mat;
  ground.receiveShadows = true;

  // Water patches
  const waterPatches = [
    { x: -90, z: 55, w: 28, h: 18 },
    { x: 95, z: -65, w: 24, h: 16 },
    { x: -110, z: -75, w: 20, h: 14 },
    { x: 65, z: 110, w: 22, h: 14 },
    { x: -45, z: 125, w: 16, h: 12 },
    { x: 125, z: 45, w: 18, h: 12 },
  ];

  waterPatches.forEach(({ x, z, w, h }, i) => {
    const water = MeshBuilder.CreateGround(`water_${i}`, { width: w, height: h, subdivisions: 2 }, scene);
    water.position = new Vector3(x, 0.05, z);
    const wm = new StandardMaterial(`waterMat_${i}`, scene);
    wm.diffuseColor = new Color3(0.25, 0.52, 0.72);
    wm.specularColor = new Color3(0.4, 0.55, 0.75);
    wm.specularPower = 80;
    wm.alpha = 0.82;
    water.material = wm;
  });

  return ground;
}
