export const WORLD_SIZE = 3072;
export const LAND_SIZE = 12;
export const LAND_GRID = 256;
export const ZONE_GRID = 8;
export const ZONE_SIZE = WORLD_SIZE / ZONE_GRID; // 384
export const WORLD_CENTER = { x: 1536, y: 1536 };

export interface WorldCoord {
  x: number;
  y: number;
}

export function coordToWorld(x: number, y: number, height = 0) {
  return { x, y: height, z: y };
}

export function worldToCoord(bx: number, bz: number): WorldCoord {
  return {
    x: Math.round(Math.max(0, Math.min(WORLD_SIZE - 1, bx))),
    y: Math.round(Math.max(0, Math.min(WORLD_SIZE - 1, bz))),
  };
}

export function getLandId(x: number, y: number): number {
  const landX = Math.floor(x / LAND_SIZE);
  const landY = Math.floor(y / LAND_SIZE);
  return landY * LAND_GRID + landX + 1;
}

export function getZone(x: number, y: number): { name: string; col: number; row: number } {
  const col = Math.min(ZONE_GRID - 1, Math.floor(x / ZONE_SIZE));
  const row = Math.min(ZONE_GRID - 1, Math.floor(y / ZONE_SIZE));
  const letter = String.fromCharCode(65 + col);
  return { name: `${letter}${row + 1}`, col, row };
}

export function getZoneBounds(col: number, row: number) {
  return {
    minX: col * ZONE_SIZE,
    maxX: (col + 1) * ZONE_SIZE,
    minY: row * ZONE_SIZE,
    maxY: (row + 1) * ZONE_SIZE,
    centerX: col * ZONE_SIZE + ZONE_SIZE / 2,
    centerY: row * ZONE_SIZE + ZONE_SIZE / 2,
  };
}

export function randomCoord(margin = 300): WorldCoord {
  return {
    x: margin + Math.random() * (WORLD_SIZE - margin * 2),
    y: margin + Math.random() * (WORLD_SIZE - margin * 2),
  };
}

export function coordDistance(a: WorldCoord, b: WorldCoord): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function clampCoord(v: number, margin = 0): number {
  return Math.max(margin, Math.min(WORLD_SIZE - margin, v));
}
