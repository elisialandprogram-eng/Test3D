export const TILE_W = 64;
export const TILE_H = 32;
export const FACE_H = 12;
export const GRID_COLS = 256;
export const GRID_ROWS = 256;

export const MAX_ZOOM = 2.5;
export const INITIAL_ZOOM = 0.65;

// Bounding box of the entire isometric map in iso-space
export const MAP_ISO_MIN_X = -(GRID_ROWS - 1) * (TILE_W / 2);          // left-most point
export const MAP_ISO_MAX_X = (GRID_COLS - 1) * (TILE_W / 2) + TILE_W;  // right-most point
export const MAP_ISO_MIN_Y = 0;
export const MAP_ISO_MAX_Y = (GRID_COLS + GRID_ROWS - 2) * (TILE_H / 2) + TILE_H + FACE_H;

/**
 * Compute the minimum zoom such that the viewport never shows more than
 * 50% of the map in either dimension (~25% of map area at once).
 * Formula: min_zoom = max(2*cw / map_iso_w, 2*ch / map_iso_h)
 */
export function computeMinZoom(cw: number, ch: number): number {
  const mapIsoW = MAP_ISO_MAX_X - MAP_ISO_MIN_X;
  const mapIsoH = MAP_ISO_MAX_Y - MAP_ISO_MIN_Y;
  const byWidth  = (2 * cw) / mapIsoW;
  const byHeight = (2 * ch) / mapIsoH;
  return Math.max(byWidth, byHeight, 0.15);
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

/** Clamp camera so the map bounding box never leaves the screen. */
export function clampCamera(camX: number, camY: number, zoom: number, cw: number, ch: number) {
  const mapW = (MAP_ISO_MAX_X - MAP_ISO_MIN_X) * zoom;
  const mapH = (MAP_ISO_MAX_Y - MAP_ISO_MIN_Y) * zoom;

  let cx: number, cy: number;

  if (mapW >= cw) {
    // Map wider than viewport: clamp edges
    const maxCamX = -MAP_ISO_MIN_X * zoom;       // left edge of map at screen left
    const minCamX = cw - MAP_ISO_MAX_X * zoom;   // right edge of map at screen right
    cx = Math.max(minCamX, Math.min(maxCamX, camX));
  } else {
    // Map narrower than viewport: center it
    cx = (cw - mapW) / 2 - MAP_ISO_MIN_X * zoom;
  }

  if (mapH >= ch) {
    const maxCamY = -MAP_ISO_MIN_Y * zoom;
    const minCamY = ch - MAP_ISO_MAX_Y * zoom;
    cy = Math.max(minCamY, Math.min(maxCamY, camY));
  } else {
    cy = (ch - mapH) / 2 - MAP_ISO_MIN_Y * zoom;
  }

  return { x: cx, y: cy };
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
