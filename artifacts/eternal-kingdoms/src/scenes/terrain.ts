import {
  Scene, MeshBuilder, StandardMaterial, DynamicTexture,
  Color3, Vector3, Mesh,
} from "@babylonjs/core";

// ── Noise ────────────────────────────────────────────────────────────────────
function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function sn(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return hash(ix,iy)+(hash(ix+1,iy)-hash(ix,iy))*ux+(hash(ix,iy+1)-hash(ix,iy))*uy
        +(hash(ix,iy)-hash(ix+1,iy)-hash(ix,iy+1)+hash(ix+1,iy+1))*ux*uy;
}
function fbm(x: number, y: number, oct = 6) {
  let v = 0, a = 0.5, f = 1, m = 0;
  for (let i = 0; i < oct; i++) { v += sn(x*f,y*f)*a; m+=a; a*=0.5; f*=2.1; }
  return v / m;
}
function ss(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1,(x-e0)/(e1-e0))); return t*t*(3-2*t);
}
function lerp3(a: number[], b: number[], t: number): [number,number,number] {
  return [
    Math.round(a[0]+(b[0]-a[0])*t),
    Math.round(a[1]+(b[1]-a[1])*t),
    Math.round(a[2]+(b[2]-a[2])*t),
  ];
}
function clamp255(v: number) { return Math.max(0, Math.min(255, Math.round(v))); }

// ── Biome colour palettes ────────────────────────────────────────────────────
const B = {
  plainsA:  [118, 200, 65],
  plainsB:  [92, 170, 48],
  plainsC:  [140, 218, 80],
  agriA:    [210, 182, 88],
  agriB:    [228, 205, 108],
  agriDark: [172, 146, 60],
  forestA:  [30, 78, 15],
  forestB:  [45, 100, 22],
  forestC:  [58, 125, 30],
  mtnBase:  [105, 92, 75],
  mtnMid:   [148, 148, 152],
  mtnSnow:  [235, 238, 248],
  beach:    [208, 188, 148],
  shore:    [180, 158, 115],
  water:    [62, 138, 205],
  waterD:   [48, 110, 175],
  riverBed: [52, 125, 195],
};

const TEX = 2048;

export function createTerrain(scene: Scene): Mesh {
  const WORLD = 500;
  const ground = MeshBuilder.CreateGround("terrain",
    { width: WORLD, height: WORLD, subdivisions: 2 }, scene);
  ground.position.y = 0;

  const tex = new DynamicTexture("terrainTex", { width: TEX, height: TEX }, scene, false);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  const img = ctx.createImageData(TEX, TEX);
  const d = img.data;

  for (let py = 0; py < TEX; py++) {
    for (let px = 0; px < TEX; px++) {
      const nx = px / TEX, ny = py / TEX;

      // ── Noise layers ──────────────────────────────────────────────────────
      const elev    = fbm(nx * 2.8 + 0.3, ny * 2.8 + 0.7, 7);
      const moist   = fbm(nx * 3.5 + 5.1, ny * 3.5 + 2.8, 5);
      const temp    = fbm(nx * 2.1 + 1.4, ny * 2.1 + 8.2, 4);
      const detail  = fbm(nx * 9   + 0.5, ny * 9   + 1.5, 4);
      const micro   = fbm(nx * 22  + 3.3, ny * 22  + 2.1, 3);

      // ── River channels ────────────────────────────────────────────────────
      const r1 = fbm(nx * 4.2 + 0.7, ny * 4.2 + 1.6, 5);
      const r2 = fbm(nx * 3.6 + 4.5, ny * 3.6 + 0.8, 5);
      const r3 = fbm(nx * 3.0 + 2.3, ny * 3.0 + 5.7, 4);
      const rv = Math.max(
        ss(0.048, 0, Math.abs(r1 - 0.47)),
        ss(0.040, 0, Math.abs(r2 - 0.53)),
        ss(0.035, 0, Math.abs(r3 - 0.50)),
      );
      const isRiver = rv > 0.05 && elev < 0.70;

      // ── Dirt trails ───────────────────────────────────────────────────────
      const td1 = fbm(nx * 5 + 1.1, ny * 5 + 0.9, 5);
      const td2 = fbm(nx * 6 + 3.8, ny * 6 + 2.2, 4);
      const dirtFactor = Math.max(ss(0.042,0,Math.abs(td1-0.46)), ss(0.036,0,Math.abs(td2-0.53)));

      // ── Biome selection ───────────────────────────────────────────────────
      let color: [number,number,number];

      if (isRiver) {
        const rc = lerp3(B.waterD, B.water, rv);
        const shore = lerp3(B.shore, rc, Math.min(1, rv * 3));
        color = shore;
      } else if (elev > 0.72) {
        // Mountain
        const t = (elev - 0.72) / 0.28;
        if (t < 0.3) {
          color = lerp3(B.mtnBase, B.mtnMid, t / 0.3 + detail * 0.15);
        } else {
          color = lerp3(B.mtnMid, B.mtnSnow, (t - 0.3) / 0.7);
        }
      } else if (elev < 0.32 && moist > 0.50) {
        // Waterfront / beach
        color = lerp3(B.shore, B.beach, detail);
      } else if (moist > 0.60 && elev > 0.30) {
        // Forest
        const ft = moist - 0.60;
        color = lerp3(B.forestB, B.forestA, ft * 1.5 + detail * 0.2);
        color = lerp3(color, B.forestC, detail * 0.3);
      } else if (temp > 0.58 && moist < 0.50 && elev > 0.28 && elev < 0.66) {
        // Agricultural
        const stripe = Math.sin(nx * 80 + ny * 20) * 0.5 + 0.5;
        color = lerp3(B.agriA, B.agriB, detail * 0.5 + stripe * 0.4);
      } else {
        // Plains
        color = elev < 0.45
          ? lerp3(B.plainsB, B.plainsA, detail)
          : lerp3(B.plainsA, B.plainsC, detail * 0.6);
      }

      // ── Dirt trail overlay ────────────────────────────────────────────────
      if (dirtFactor > 0.02 && !isRiver && elev < 0.70) {
        const dc: [number,number,number] = [192, 162, 100];
        color = lerp3(color, dc, Math.min(1, dirtFactor * 3));
      }

      // ── Micro variation ───────────────────────────────────────────────────
      color = [
        clamp255(color[0] + (micro - 0.5) * 18),
        clamp255(color[1] + (micro - 0.5) * 22),
        clamp255(color[2] + (micro - 0.5) * 10),
      ];

      const idx = (py * TEX + px) * 4;
      d[idx] = color[0]; d[idx+1] = color[1]; d[idx+2] = color[2]; d[idx+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  tex.update();

  const mat = new StandardMaterial("terrainMat", scene);
  mat.diffuseTexture  = tex;
  mat.specularColor   = new Color3(0,0,0);
  mat.ambientColor    = new Color3(0.85, 0.85, 0.85);
  ground.material     = mat;
  ground.receiveShadows = false;

  // ── Lakes ─────────────────────────────────────────────────────────────────
  const lakes = [
    { x: -88, z:  52, w: 38, h: 26 },
    { x:  92, z: -68, w: 32, h: 22 },
    { x:-108, z: -72, w: 28, h: 20 },
    { x:  62, z: 112, w: 30, h: 20 },
    { x: -42, z: 130, w: 22, h: 18 },
    { x: 130, z:  42, w: 26, h: 18 },
    { x: -60, z: -90, w: 20, h: 14 },
    { x: 105, z:  90, w: 22, h: 16 },
  ];
  lakes.forEach(({ x, z, w, h }, i) => {
    const wg = MeshBuilder.CreateGround(`lake_${i}`, { width: w, height: h, subdivisions: 2 }, scene);
    wg.position = new Vector3(x, 0.08, z);
    const wm = new StandardMaterial(`lakeMat_${i}`, scene);
    wm.diffuseColor  = new Color3(0.22, 0.55, 0.82);
    wm.specularColor = new Color3(0.55, 0.70, 0.95);
    wm.specularPower = 150;
    wm.alpha = 0.82;
    wg.material = wm;
  });

  return ground;
}
