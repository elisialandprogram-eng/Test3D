export const WORLD_SIZE        = 2048;
export const ZONE_SIZE         = 32;
export const LAND_SIZE         = 128;
export const ZONES_PER_AXIS    = WORLD_SIZE / ZONE_SIZE;   // 64
export const LANDS_PER_AXIS    = WORLD_SIZE / LAND_SIZE;   // 16

// Rendering
export const TILE_SCALE        = 4;
export const SCENE_SIZE        = WORLD_SIZE * TILE_SCALE;  // 8192 Babylon units

// Chunk streaming — unbounded: generates chunks at any position
export const CHUNK_WORLD_SIZE  = 64;
export const CHUNK_SCENE_SIZE  = CHUNK_WORLD_SIZE * TILE_SCALE; // 256
export const CHUNKS_PER_AXIS   = WORLD_SIZE / CHUNK_WORLD_SIZE; // 32
export const CHUNK_TEX_SIZE    = 128;
export const STREAM_RADIUS     = 10;
export const UNLOAD_RADIUS     = 14;

// Overview map — low-res full-world texture shown at high zoom
export const OVERVIEW_TEX_SIZE  = 256;   // pixels (256×256 → every 8 world coords)
export const OVERVIEW_SHOW_AT   = 3000;  // show overview above this cam radius
export const OVERVIEW_HIDE_AT   = 2000;  // hide overview below this cam radius

// Camera
// alpha = -PI/2 aligns the camera axis with the world X axis so the
// world boundary appears as a RECTANGLE on screen (not a diamond).
export const CAM_ALPHA          = -Math.PI / 2;
export const CAM_BETA           = 0.82;   // ~47° from top — RoK-style isometric
export const CAM_RADIUS_INIT    = 650;    // starts zoomed in — terrain fills screen
export const CAM_RADIUS_MIN     = 80;     // very close (city-level)
export const CAM_RADIUS_MAX     = 9500;   // far enough to see entire world rectangle
export const CAM_WORLD_VIEW_R   = 8800;   // "World View" button target radius
export const CAM_AREA_VIEW_R    = 350;    // "My Area" button target radius
