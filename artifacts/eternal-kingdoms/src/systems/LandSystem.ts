import { WORLD_SIZE, LAND_SIZE, LAND_GRID, getLandId } from "../engine/CoordinateEngine";

export interface LandData {
  id: number;
  landX: number;
  landY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  ownerId?: string;
}

let _lands: LandData[] | null = null;

export function initLandSystem(): void {
  _lands = [];
  for (let landY = 0; landY < LAND_GRID; landY++) {
    for (let landX = 0; landX < LAND_GRID; landX++) {
      _lands.push({
        id: landY * LAND_GRID + landX + 1,
        landX,
        landY,
        minX: landX * LAND_SIZE,
        maxX: (landX + 1) * LAND_SIZE - 1,
        minY: landY * LAND_SIZE,
        maxY: (landY + 1) * LAND_SIZE - 1,
      });
    }
  }
}

export function getLand(x: number, y: number): LandData | null {
  if (!_lands) return null;
  const landX = Math.floor(x / LAND_SIZE);
  const landY = Math.floor(y / LAND_SIZE);
  const idx = landY * LAND_GRID + landX;
  return _lands[idx] ?? null;
}

export function getLands(): LandData[] {
  return _lands ?? [];
}

export function setLandOwner(landId: number, ownerId: string): void {
  if (!_lands) return;
  const land = _lands.find((l) => l.id === landId);
  if (land) land.ownerId = ownerId;
}

export const TOTAL_LANDS = LAND_GRID * LAND_GRID; // 65536
