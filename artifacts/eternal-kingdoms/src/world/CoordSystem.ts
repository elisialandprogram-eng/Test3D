import { WORLD_SIZE, ZONE_SIZE, LAND_SIZE, TILE_SCALE, SCENE_SIZE } from "./WorldConfig";

export function getZoneId(x: number, y: number): number {
  return (WORLD_SIZE / ZONE_SIZE) * Math.floor(y / ZONE_SIZE) + Math.floor(x / ZONE_SIZE);
}

export function getLandId(x: number, y: number): number {
  return (WORLD_SIZE / LAND_SIZE) * Math.floor(y / LAND_SIZE) + Math.floor(x / LAND_SIZE) + 1;
}

export function worldToScene(wx: number, wy: number): { sx: number; sz: number } {
  return { sx: wx * TILE_SCALE, sz: wy * TILE_SCALE };
}

export function sceneToWorld(sx: number, sz: number): { x: number; y: number } {
  return {
    x: Math.floor(Math.max(0, Math.min(WORLD_SIZE - 1, sx / TILE_SCALE))),
    y: Math.floor(Math.max(0, Math.min(WORLD_SIZE - 1, sz / TILE_SCALE))),
  };
}

export function clampWorld(v: number): number {
  return Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(v)));
}

export function clampScene(v: number): number {
  return Math.max(0, Math.min(SCENE_SIZE, v));
}
