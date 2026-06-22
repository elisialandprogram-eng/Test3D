// World coordinate system
// Game space:  3072 × 3072  (0,0) → (3071,3071)
// Game center: (1536, 1536) = Ancient Temple
// Babylon space: 500 × 500, centred at origin
// Ancient Temple sits at Babylon (0, 0)

export const WORLD_COORD = 3072;
export const WORLD_UNITS = 500;
export const SCALE = WORLD_UNITS / WORLD_COORD; // ≈ 0.163

/** Convert game (x,z) to Babylon 3-D (x, z). */
export function w2b(gx: number, gz: number): [number, number] {
  return [(gx - 1536) * SCALE, (gz - 1536) * SCALE];
}

/** Half-extent of the playable area in Babylon units. */
export const HALF = WORLD_UNITS / 2; // 250

/** Camera pan limits — keep world edge out of frame */
export const PAN_LIMIT = 185;
