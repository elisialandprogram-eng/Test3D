import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
  Color3,
  Vector3,
  Mesh,
} from "@babylonjs/core";

// ── Noise helpers ───────────────────────────────────────────────────────────
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (d - b) * ux * uy - (c - a) * ux * uy;
}
function fbm(x: number, y: number, oct = 5): number {
  let v = 0, a = 0.5, f = 1, m = 0;
  for (let i = 0; i < oct; i++) {
    v += smoothNoise(x * f, y * f) * a;
    m += a; a *= 0.5; f *= 2.1;
  }
  return v / m;
}
function ss(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
function lerp3(a: number[], b: number[], t: number): [number,number,number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// ── LOK accurate palette ─────────────────────────────────────────────────────
// These match the actual LOK screenshot pixel colours:
const C = {
  grassA:  [112, 195,  62],   // Bright lime-green (LOK main grass)
  grassB:  [ 88, 168,  46],   // Medium green
  grassC:  [ 64, 135,  32],   // Darker green patches
  grassD:  [ 48, 108,  22],   // Shadowed green under trees
  dirtA:   [200, 165, 100],   // Bright sandy dirt path
  dirtB:   [168, 132,  72],   // Shaded dirt
  forest:  [ 34,  88,  16],   // Dense forest dark
  water:   [ 68, 148, 210],   // Lake/river
};

const TEX = 2048;

export function createTerrain(scene: Scene): Mesh {
  const WORLD = 500;

  const ground = MeshBuilder.CreateGround("terrain", { width: WORLD, height: WORLD, subdivisions: 2 }, scene);
  ground.position.y = 0;

  const tex = new DynamicTexture("terrainTex", { width: TEX, height: TEX }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const img = ctx.createImageData(TEX, TEX);
  const d = img.data;

  for (let py = 0; py < TEX; py++) {
    for (let px = 0; px < TEX; px++) {
      const nx = px / TEX;
      const ny = py / TEX;

      // ── Large organic colour zones ──────────────────────────────────────────
      const zone   = fbm(nx * 2.2 + 0.3, ny * 2.2 + 0.7, 5);
      const detail = fbm(nx * 6   + 1.1, ny * 6   + 0.9, 4);
      const micro  = fbm(nx * 20  + 3.3, ny * 20  + 2.1, 3);

      // ── Winding organic dirt trails ─────────────────────────────────────────
      // Two separate trail networks blended together
      const d1 = fbm(nx * 2.8 + 0.7, ny * 2.8 + 2.1, 5);
      const d2 = fbm(nx * 3.4 + 4.5, ny * 3.4 + 1.3, 4);
      const dirtRidge = Math.min(Math.abs(d1 - 0.44), Math.abs(d2 - 0.51));
      const dirtFactor = ss(0.055, 0.0, dirtRidge);

      // ── Forest density patches ──────────────────────────────────────────────
      const fNoise  = fbm(nx * 2.4 + 5.1, ny * 2.4 + 3.3, 4);
      const fFactor = ss(0.55, 0.70, fNoise);

      // ── Base grass colour ───────────────────────────────────────────────────
      let color: [number,number,number];
      if (zone < 0.28) {
        color = lerp3(C.grassC, C.grassB, detail);
      } else if (zone < 0.52) {
        color = lerp3(C.grassB, C.grassA, detail);
      } else if (zone < 0.72) {
        color = lerp3(C.grassA, C.grassB, detail * 0.7);
      } else {
        color = lerp3(C.grassB, C.grassC, detail * 0.5);
      }

      // ── Forest shadow underneath tree clusters ──────────────────────────────
      if (fFactor > 0.01) {
        color = lerp3(color, C.forest, fFactor * 0.55);
      }

      // ── Micro colour variation (hand-painted texture feel) ──────────────────
      color = [
        Math.max(0, Math.min(255, color[0] + Math.round((micro - 0.5) * 18))),
        Math.max(0, Math.min(255, color[1] + Math.round((micro - 0.5) * 22))),
        Math.max(0, Math.min(255, color[2] + Math.round((micro - 0.5) * 10))),
      ];

      // ── Dirt trails overwrite grass ─────────────────────────────────────────
      if (dirtFactor > 0.02) {
        const dc = lerp3(C.dirtB, C.dirtA, detail);
        color = lerp3(color, dc, Math.min(1, dirtFactor * 2.8));
      }

      const idx = (py * TEX + px) * 4;
      d[idx]     = color[0];
      d[idx + 1] = color[1];
      d[idx + 2] = color[2];
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  tex.update();

  const mat = new StandardMaterial("terrainMat", scene);
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.0, 0.0, 0.0);   // No specular — flat painted look
  mat.ambientColor  = new Color3(0.85, 0.85, 0.85); // Bright ambient — LOK is very bright
  ground.material = mat;
  ground.receiveShadows = false; // Flat lit — no ground shadows

  // ── Water bodies ────────────────────────────────────────────────────────────
  const waters = [
    { x: -88, z:  52, w: 30, h: 20 },
    { x:  92, z: -68, w: 26, h: 18 },
    { x:-108, z: -72, w: 22, h: 16 },
    { x:  62, z: 112, w: 24, h: 16 },
    { x: -42, z: 128, w: 18, h: 14 },
    { x: 128, z:  42, w: 20, h: 14 },
  ];
  waters.forEach(({ x, z, w, h }, i) => {
    const wg = MeshBuilder.CreateGround(`water_${i}`, { width: w, height: h, subdivisions: 2 }, scene);
    wg.position = new Vector3(x, 0.06, z);
    const wm = new StandardMaterial(`waterMat_${i}`, scene);
    wm.diffuseColor  = new Color3(0.26, 0.58, 0.82);
    wm.specularColor = new Color3(0.5, 0.65, 0.9);
    wm.specularPower = 120;
    wm.alpha = 0.80;
    wg.material = wm;
  });

  return ground;
}
