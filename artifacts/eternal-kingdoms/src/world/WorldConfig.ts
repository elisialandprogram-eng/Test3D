export const WORLD_SIZE        = 2048;
export const ZONE_SIZE         = 32;
export const LAND_SIZE         = 128;
export const ZONES_PER_AXIS    = WORLD_SIZE / ZONE_SIZE;   // 64
export const LANDS_PER_AXIS    = WORLD_SIZE / LAND_SIZE;   // 16

// Rendering
export const TILE_SCALE        = 4;                         // Babylon units per world coord
export const SCENE_SIZE        = WORLD_SIZE * TILE_SCALE;   // 8192

// Chunk streaming
export const CHUNK_WORLD_SIZE  = 64;                        // world coords per chunk
export const CHUNK_SCENE_SIZE  = CHUNK_WORLD_SIZE * TILE_SCALE; // 256 Babylon units
export const CHUNKS_PER_AXIS   = WORLD_SIZE / CHUNK_WORLD_SIZE; // 32
export const CHUNK_TEX_SIZE    = 128;                       // texture pixels per chunk
export const STREAM_RADIUS     = 7;
export const UNLOAD_RADIUS     = 10;

// Camera
export const CAM_ALPHA         = -Math.PI / 4;
export const CAM_BETA          = 1.05;
export const CAM_RADIUS_INIT   = 1400;
export const CAM_RADIUS_MIN    = 200;
export const CAM_RADIUS_MAX    = 4500;
