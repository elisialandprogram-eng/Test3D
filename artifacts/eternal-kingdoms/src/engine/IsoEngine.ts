export const TILE_W = 64;
export const TILE_H = 32;
export const FACE_H = 12;
export const GRID_COLS = 256;
export const GRID_ROWS = 256;

export const MAX_ZOOM = 2.5;
export const INITIAL_ZOOM = 0.65;

// Bounding box of the entire isometric map in iso-space (used for rendering border)
export const MAP_ISO_MIN_X = -(GRID_ROWS - 1) * (TILE_W / 2);
export const MAP_ISO_MAX_X = (GRID_COLS - 1) * (TILE_W / 2) + TILE_W;
export const MAP_ISO_MIN_Y = 0;
export const MAP_ISO_MAX_Y = (GRID_COLS + GRID_ROWS - 2) * (TILE_H / 2) + TILE_H + FACE_H;

// Diamond edge constant: K = (COLS-1 + ROWS-1) * (TW/2)
// The 4 diamond edges each satisfy: 2*isoY ± isoX ∈ [0, 2*K_DIAMOND]
const K_DIAMOND = (GRID_COLS + GRID_ROWS - 2) * (TILE_W / 2); // 16320 for 256×256

/**
 * Minimum zoom so the viewport:
 *  1. Always fits inside the diamond (no void ever visible)
 *  2. Sees at most 50% of each map span (~25% total map area)
 */
export function computeMinZoom(cw: number, ch: number): number {
  // Constraint 1 (no void): K_DIAMOND * zoom >= cw/2 + ch
  const noVoid = (cw / 2 + ch) / K_DIAMOND;
  // Constraint 2 (25% coverage): viewport <= 50% of each map span
  const mapIsoW = MAP_ISO_MAX_X - MAP_ISO_MIN_X;
  const mapIsoH = MAP_ISO_MAX_Y - MAP_ISO_MIN_Y;
  const coverage = Math.max((2 * cw) / mapIsoW, (2 * ch) / mapIsoH);
  return Math.max(noVoid, coverage, 0.1);
}

export interface ScreenPos { x: number; y: number }

export function tileToIso(col: number, row: number): ScreenPos {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2),
  };
}

export function tileToScreen(
  col: number, row: number,
  camX: number, camY: number, zoom: number
): ScreenPos {
  const iso = tileToIso(col, row);
  return { x: iso.x * zoom + camX, y: iso.y * zoom + camY };
}

export function screenToTile(
  sx: number, sy: number,
  camX: number, camY: number, zoom: number
): { col: number; row: number } {
  const isoX = (sx - camX) / zoom;
  const isoY = (sy - camY) / zoom;
  const col = Math.round((isoX / (TILE_W / 2) + isoY / (TILE_H / 2)) / 2);
  const row = Math.round((isoY / (TILE_H / 2) - isoX / (TILE_W / 2)) / 2);
  return { col, row };
}

/**
 * Diamond-aware camera clamp — guarantees the dark background is NEVER visible.
 *
 * For an iso point (isoX, isoY) to be inside the diamond, 4 conditions must hold:
 *   2·isoY − isoX ≥ 0          (top-right edge)
 *   2·isoY + isoX ≥ 0          (top-left edge)
 *   2·isoY + isoX ≤ 2·K        (bottom-right edge)
 *   2·isoY − isoX ≤ 2·K        (bottom-left edge)
 *
 * Translating each condition for every viewport corner (0,0),(cw,0),(0,ch),(cw,ch)
 * into constraints on (camX, camY) yields two independent intervals in the
 * rotated axes P = camX − 2·camY and Q = camX + 2·camY.  Clamping P and Q
 * independently is both necessary AND sufficient.
 */
export function clampCamera(camX: number, camY: number, zoom: number, cw: number, ch: number) {
  const K = K_DIAMOND * zoom;

  // Independent bounds in rotated space
  const P_min = cw;
  const P_max = 2 * K - 2 * ch;
  const Q_min = cw + 2 * ch - 2 * K;
  const Q_max = 0;

  // Safety: if zoom is below the mathematical minimum, center the camera
  if (P_max < P_min || Q_max < Q_min) {
    const P = (P_min + P_max) / 2;
    const Q = (Q_min + Q_max) / 2;
    return { x: (P + Q) / 2, y: (Q - P) / 4 };
  }

  const P = Math.max(P_min, Math.min(P_max, camX - 2 * camY));
  const Q = Math.max(Q_min, Math.min(Q_max, camX + 2 * camY));

  return { x: (P + Q) / 2, y: (Q - P) / 4 };
}

export function getInitialCamera(cw: number, ch: number, zoom: number) {
  // Center on map center (col=128, row=128)
  const centerCol = Math.floor(GRID_COLS / 2);
  const centerRow = Math.floor(GRID_ROWS / 2);
  const iso = tileToIso(centerCol, centerRow);
  const rawCamX = cw / 2 - iso.x * zoom;
  const rawCamY = ch / 2 - iso.y * zoom;
  return clampCamera(rawCamX, rawCamY, zoom, cw, ch);
}

/** Compute visible tile col/row range from camera + viewport — O(1). */
function getVisibleTileRange(camX: number, camY: number, zoom: number, cw: number, ch: number) {
  const PAD = 3;
  // Convert screen corners to iso coords
  const corners = [
    { sx: 0,  sy: 0  },
    { sx: cw, sy: 0  },
    { sx: 0,  sy: ch },
    { sx: cw, sy: ch },
  ].map(({ sx, sy }) => {
    const isoX = (sx - camX) / zoom;
    const isoY = (sy - camY) / zoom;
    return {
      col: (isoX / (TILE_W / 2) + isoY / (TILE_H / 2)) / 2,
      row: (isoY / (TILE_H / 2) - isoX / (TILE_W / 2)) / 2,
    };
  });

  const colMin = Math.max(0, Math.floor(Math.min(...corners.map(c => c.col))) - PAD);
  const colMax = Math.min(GRID_COLS - 1, Math.ceil(Math.max(...corners.map(c => c.col))) + PAD);
  const rowMin = Math.max(0, Math.floor(Math.min(...corners.map(c => c.row))) - PAD);
  const rowMax = Math.min(GRID_ROWS - 1, Math.ceil(Math.max(...corners.map(c => c.row))) + PAD);

  return { colMin, colMax, rowMin, rowMax };
}

/** Yield visible tiles in correct isometric painter order (back-to-front). */
export function* renderOrder(
  camX: number, camY: number, zoom: number,
  cw: number, ch: number
): Generator<[number, number]> {
  const { colMin, colMax, rowMin, rowMax } = getVisibleTileRange(camX, camY, zoom, cw, ch);
  const dMin = colMin + rowMin;
  const dMax = colMax + rowMax;

  for (let d = dMin; d <= dMax; d++) {
    const cStart = Math.max(colMin, d - rowMax);
    const cEnd   = Math.min(colMax, d - rowMin);
    for (let col = cStart; col <= cEnd; col++) {
      const row = d - col;
      if (row >= rowMin && row <= rowMax) {
        yield [col, row];
      }
    }
  }
}
