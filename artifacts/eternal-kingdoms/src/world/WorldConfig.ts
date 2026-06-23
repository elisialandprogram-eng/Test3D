export const WORLD_SIZE        = 2048;
export const ZONE_SIZE         = 32;
export const LAND_SIZE         = 128;
export const ZONES_PER_AXIS    = WORLD_SIZE / ZONE_SIZE;   // 64
export const LANDS_PER_AXIS    = WORLD_SIZE / LAND_SIZE;   // 16

// Rendering
export const TILE_SCALE        = 4;                         // Babylon units per world coord
export const SCENE_SIZE        = WORLD_SIZE * TILE_SCALE;   // 8192

// Chunk streaming — generate chunks at ANY position (including outside world bounds)
// so terrain always fills the viewport and edges are never visible.
export const CHUNK_WORLD_SIZE  = 64;
export const CHUNK_SCENE_SIZE  = CHUNK_WORLD_SIZE * TILE_SCALE; // 256 Babylon units
export const CHUNKS_PER_AXIS   = WORLD_SIZE / CHUNK_WORLD_SIZE; // 32
export const CHUNK_TEX_SIZE    = 128;
export const STREAM_RADIUS     = 10;   // chunks loaded around camera
export const UNLOAD_RADIUS     = 14;

// Camera — close, top-down, tight zoom range so world edge is never visible
export const CAM_ALPHA         = -Math.PI / 4;
export const CAM_BETA          = 0.72;   // ~41° from top (Rise of Kingdoms-style)
export const CAM_RADIUS_INIT   = 480;    // start close — terrain fills screen
export const CAM_RADIUS_MIN    = 120;    // very close zoomed-in
export const CAM_RADIUS_MAX    = 850;    // max zoom-out — still surrounded by terrain
