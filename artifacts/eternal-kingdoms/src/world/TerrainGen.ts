export type TerrainType =
  | "grassland"
  | "forest"
  | "rocky"
  | "desert"
  | "swamp"
  | "snow"
  | "water";

export const TERRAIN_COLOR: Record<TerrainType, [number, number, number]> = {
  grassland: [108, 185,  68],
  forest:    [ 42, 100,  28],
  rocky:     [138, 138, 132],
  desert:    [210, 175, 108],
  swamp:     [ 72,  92,  42],
  snow:      [228, 235, 240],
  water:     [ 48,  98, 195],
};

function hash(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix,        fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix,     iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix,     iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 5): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * smoothNoise(x * freq, y * freq);
    amp  *= 0.5;
    freq *= 2;
  }
  return v;
}

export function getTerrainType(wx: number, wy: number): TerrainType {
  // Normalise using a fixed scale so noise is consistent at any coordinate,
  // including chunks generated outside the 0–2047 world bounds.
  const nx = wx / 2048;
  const ny = wy / 2048;

  const continent = fbm(nx * 3,       ny * 3,       4);
  if (continent < 0.30) return "water";

  const elevation = fbm(nx * 5 + 200, ny * 5 + 200, 5);
  const moisture  = fbm(nx * 4 + 100, ny * 4 + 100, 4);
  const temp      = ny; // 0 = south (warm), 1 = north (cold)

  if (temp > 0.80) return "snow";
  if (temp > 0.68 && elevation > 0.48) return "snow";
  if (elevation > 0.60) return "rocky";
  if (temp < 0.22 && moisture < 0.36) return "desert";
  if (moisture > 0.62 && elevation < 0.44) return "swamp";
  if (moisture > 0.50) return "forest";
  return "grassland";
}

export function getTerrainColorWithNoise(wx: number, wy: number): [number, number, number] {
  const type = getTerrainType(wx, wy);
  const [r, g, b] = TERRAIN_COLOR[type];
  const n = (hash(wx * 3.7, wy * 3.7) - 0.5) * 20;
  return [
    Math.max(0, Math.min(255, r + n)),
    Math.max(0, Math.min(255, g + n * 0.85)),
    Math.max(0, Math.min(255, b + n * 0.7)),
  ];
}
