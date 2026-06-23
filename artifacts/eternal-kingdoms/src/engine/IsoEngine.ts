export const TILE_W = 128;
export const TILE_H = 64;
export const FACE_H = 18;
export const GRID_COLS = 80;
export const GRID_ROWS = 80;

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

export function isTileVisible(
  sx: number, sy: number, zoom: number,
  cw: number, ch: number, extraH = 160
): boolean {
  const w = TILE_W * zoom;
  const h = (TILE_H + FACE_H) * zoom + extraH;
  return sx + w > -w && sx < cw + w && sy + h > -extraH && sy < ch + h;
}

export function* renderOrder(
  camX: number, camY: number, zoom: number,
  cw: number, ch: number
): Generator<[number, number]> {
  for (let d = 0; d <= GRID_COLS + GRID_ROWS - 2; d++) {
    const colMin = Math.max(0, d - GRID_ROWS + 1);
    const colMax = Math.min(GRID_COLS - 1, d);
    for (let col = colMin; col <= colMax; col++) {
      const row = d - col;
      const { x, y } = tileToScreen(col, row, camX, camY, zoom);
      if (isTileVisible(x, y, zoom, cw, ch)) {
        yield [col, row];
      }
    }
  }
}

export function getInitialCamera(cw: number, ch: number, zoom: number) {
  const centerCol = GRID_COLS / 2;
  const centerRow = GRID_ROWS / 2;
  const iso = tileToIso(centerCol, centerRow);
  return {
    camX: cw / 2 - iso.x * zoom,
    camY: ch / 2 - iso.y * zoom,
  };
}
