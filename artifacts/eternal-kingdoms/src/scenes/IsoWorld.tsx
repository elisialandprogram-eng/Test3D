import { useRef, useEffect, useCallback } from "react";
import {
  TILE_W, TILE_H,
  GRID_COLS, GRID_ROWS,
  MAX_ZOOM, INITIAL_ZOOM,
  tileToScreen, screenToTile,
  renderOrder, getInitialCamera, clampCamera, computeMinZoom,
} from "../engine/IsoEngine";
import { generateTerrain, TerrainType } from "../world/TerrainGen";

// ─── Terrain flat colours ─────────────────────────────────────────────────────
const TILE_COLOR: Record<TerrainType, string> = {
  PLAIN:  "#78C840",
  FOREST: "#70BB34",
};

// ─── Entities scattered across the map ───────────────────────────────────────
type EntityKind = "building" | "resource";
interface MapEntity {
  col: number;
  row: number;
  kind: EntityKind;
  id: number; // sprite file number
}

// Buildings clustered near map centre; resources scattered wider
const ENTITIES: MapEntity[] = [
  // ── Buildings (settlement ~col 120-140, row 118-138) ──
  { col: 122, row: 120, kind: "building", id: 5  },
  { col: 126, row: 122, kind: "building", id: 10 },
  { col: 130, row: 120, kind: "building", id: 2  },
  { col: 134, row: 123, kind: "building", id: 7  },
  { col: 120, row: 126, kind: "building", id: 9  },
  { col: 125, row: 128, kind: "building", id: 4  },
  { col: 132, row: 128, kind: "building", id: 6  },
  { col: 138, row: 126, kind: "building", id: 3  },
  { col: 128, row: 134, kind: "building", id: 11 },
  { col: 136, row: 132, kind: "building", id: 13 },
  // ── Resources (broader scatter) ──
  { col: 110, row: 112, kind: "resource", id: 3  },
  { col: 116, row: 108, kind: "resource", id: 5  },
  { col: 142, row: 110, kind: "resource", id: 1  },
  { col: 148, row: 115, kind: "resource", id: 6  },
  { col: 108, row: 130, kind: "resource", id: 2  },
  { col: 112, row: 138, kind: "resource", id: 4  },
  { col: 145, row: 133, kind: "resource", id: 7  },
  { col: 150, row: 140, kind: "resource", id: 9  },
  { col: 120, row: 144, kind: "resource", id: 11 },
  { col: 134, row: 146, kind: "resource", id: 8  },
  { col: 138, row: 115, kind: "resource", id: 10 },
  { col: 105, row: 122, kind: "resource", id: 13 },
];

// Build a lookup map for O(1) per-tile access during render
type EntityMap = Map<string, MapEntity>;
function buildEntityMap(): EntityMap {
  const m = new Map<string, MapEntity>();
  for (const e of ENTITIES) m.set(`${e.col},${e.row}`, e);
  return m;
}

// ─── Tile drawing ─────────────────────────────────────────────────────────────
function drawTile(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
  terrain: TerrainType,
) {
  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  const e = 0.6;

  ctx.beginPath();
  ctx.moveTo(sx + w / 2,     sy - e);
  ctx.lineTo(sx + w + e,     sy + h / 2);
  ctx.lineTo(sx + w / 2,     sy + h + e);
  ctx.lineTo(sx - e,         sy + h / 2);
  ctx.closePath();
  ctx.fillStyle = TILE_COLOR[terrain];
  ctx.fill();
}

// ─── Tree drawing ─────────────────────────────────────────────────────────────
function drawTrees(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
  col: number, row: number,
  terrain: TerrainType,
) {
  if (zoom < 0.20) return;

  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  const cx = sx + w / 2;
  const cy = sy + h / 2;
  const seed = col * 137 + row * 31;

  if (terrain === "FOREST") {
    const count = 2 + (seed % 3);
    for (let i = 0; i < count; i++) {
      const s = (seed * (i * 73 + 47)) & 0xffff;
      const dx = ((s % 200) / 200 - 0.5) * w * 0.65;
      const dy = (((s >> 4) % 200) / 200 - 0.5) * h * 0.55;
      const tx = cx + dx;
      const ty = cy + dy;
      const r1 = w * (0.50 + ((s >> 2) % 8) * 0.015);
      const trunkW = w * 0.045;
      const trunkH = r1 * 0.55;

      ctx.fillStyle = "#5C3A18";
      ctx.fillRect(tx - trunkW, ty, trunkW * 2, trunkH);

      ctx.beginPath();
      ctx.arc(tx, ty - r1 * 0.05, r1 * 0.90, 0, Math.PI * 2);
      ctx.fillStyle = "#1E4008";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx, ty - r1 * 0.45, r1, 0, Math.PI * 2);
      ctx.fillStyle = "#2A5C10";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx + r1 * 0.18, ty - r1 * 0.90, r1 * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = "#367818";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx - r1 * 0.10, ty - r1 * 1.30, r1 * 0.50, 0, Math.PI * 2);
      ctx.fillStyle = "#469C1E";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx, ty - r1 * 1.60, r1 * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = "#5CB828";
      ctx.fill();
    }
  }

  if (terrain === "PLAIN") {
    if ((seed % 7) === 0) {
      const tx = cx + ((seed % 40) - 20) * w * 0.015;
      const ty = cy + ((seed % 28) - 14) * h * 0.015;
      const r = w * 0.18;

      ctx.fillStyle = "#5C3A18";
      ctx.fillRect(tx - w * 0.03, ty, w * 0.06, r * 0.55);

      ctx.beginPath();
      ctx.arc(tx, ty - r * 0.3, r, 0, Math.PI * 2);
      ctx.fillStyle = "#2A5C10";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tx, ty - r * 1.0, r * 0.68, 0, Math.PI * 2);
      ctx.fillStyle = "#3E8418";
      ctx.fill();
    }
  }
}

// ─── Sprite drawing ───────────────────────────────────────────────────────────
function drawSprite(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
  entity: MapEntity,
  images: Map<string, HTMLImageElement>,
) {
  const key = `${entity.kind}/${entity.id}`;
  const img = images.get(key);
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const w = TILE_W * zoom;
  const h = TILE_H * zoom;

  // Scale factor: buildings cover ~3 tiles wide, resources ~2 tiles wide
  const scale = entity.kind === "building" ? w * 3.0 : w * 2.0;
  const aspectH = (img.naturalHeight / img.naturalWidth) * scale;

  // Anchor: bottom-centre of sprite sits at the centre of the tile's top diamond point
  const anchorX = sx + w / 2;
  const anchorY = sy + h / 2; // tile vertical centre

  ctx.drawImage(img, anchorX - scale / 2, anchorY - aspectH * 0.85, scale, aspectH);
}

// ─── Selection highlight ──────────────────────────────────────────────────────
function drawSelection(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
) {
  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(sx + w / 2, sy);
  ctx.lineTo(sx + w, sy + h / 2);
  ctx.lineTo(sx + w / 2, sy + h);
  ctx.lineTo(sx, sy + h / 2);
  ctx.closePath();
  ctx.strokeStyle = "#FFE860";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#FFE860";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
interface IsoWorldProps {
  onHover?: (col: number, row: number) => void;
}

export function IsoWorld({ onHover }: IsoWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const camRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(INITIAL_ZOOM);
  const viewportRef = useRef({ w: 1, h: 1 });
  const dragRef = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null);
  const isDragging = useRef(false);

  const terrainRef = useRef<ReturnType<typeof generateTerrain> | null>(null);
  const selectedTileRef = useRef<{ col: number; row: number } | null>(null);
  const rafRef = useRef<number>(0);
  const needsRender = useRef(true);

  // Sprite image cache
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const entityMapRef = useRef<EntityMap>(buildEntityMap());

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!needsRender.current) { rafRef.current = requestAnimationFrame(render); return; }
    needsRender.current = false;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const terrain = terrainRef.current;
    const zoom = zoomRef.current;
    const { x: camX, y: camY } = camRef.current;
    const images = imagesRef.current;
    const entityMap = entityMapRef.current;

    if (!terrain) { rafRef.current = requestAnimationFrame(render); return; }

    ctx.fillStyle = "#2A4A10";
    ctx.fillRect(0, 0, cw, ch);

    // Collect into array — generator is exhausted after one pass
    const tiles = [...renderOrder(camX, camY, zoom, cw, ch)];

    // Pass 1: tiles
    for (const [col, row] of tiles) {
      const t = terrain[row][col];
      const { x: sx, y: sy } = tileToScreen(col, row, camX, camY, zoom);
      drawTile(ctx, sx, sy, zoom, t);
    }

    // Pass 2: trees
    for (const [col, row] of tiles) {
      const t = terrain[row][col];
      const entity = entityMap.get(`${col},${row}`);
      if (entity) continue; // skip trees on entity tiles — sprite will cover them
      const { x: sx, y: sy } = tileToScreen(col, row, camX, camY, zoom);
      drawTrees(ctx, sx, sy, zoom, col, row, t);
    }

    // Pass 3: entity sprites (sorted back-to-front via renderOrder already)
    for (const [col, row] of tiles) {
      const entity = entityMap.get(`${col},${row}`);
      if (!entity) continue;
      const { x: sx, y: sy } = tileToScreen(col, row, camX, camY, zoom);
      drawSprite(ctx, sx, sy, zoom, entity, images);
    }

    // Pass 4: selection
    const sel = selectedTileRef.current;
    if (sel) {
      const { x: sx, y: sy } = tileToScreen(sel.col, sel.row, camX, camY, zoom);
      drawSelection(ctx, sx, sy, zoom);
    }

    rafRef.current = requestAnimationFrame(render);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const cw = canvas.width;
      const ch = canvas.height;
      viewportRef.current = { w: cw, h: ch };
      const minZoom = computeMinZoom(cw, ch);
      if (zoomRef.current < minZoom) zoomRef.current = minZoom;
      const init = getInitialCamera(cw, ch, zoomRef.current);
      camRef.current = { x: init.x, y: init.y };
      needsRender.current = true;
    }

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    terrainRef.current = generateTerrain(GRID_COLS, GRID_ROWS);
    needsRender.current = true;

    // Preload all entity sprites
    const images = imagesRef.current;
    for (const entity of ENTITIES) {
      const key = `${entity.kind}/${entity.id}`;
      if (!images.has(key)) {
        const img = new Image();
        img.src = `/sprites/${entity.kind}s/${entity.id}.png`;
        img.onload = () => { needsRender.current = true; };
        images.set(key, img);
      }
    }

    rafRef.current = requestAnimationFrame(render);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDragging.current = false;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      camX: camRef.current.x, camY: camRef.current.y,
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { col, row } = screenToTile(mx, my, camRef.current.x, camRef.current.y, zoomRef.current);
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        onHover?.(col, row);
      }
      return;
    }
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!isDragging.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      isDragging.current = true;
    }
    if (!isDragging.current) return;
    const rawCam = {
      x: dragRef.current.camX + dx,
      y: dragRef.current.camY + dy,
    };
    const { w: cw, h: ch } = viewportRef.current;
    const clamped = clampCamera(rawCam.x, rawCam.y, zoomRef.current, cw, ch);
    camRef.current = { x: clamped.x, y: clamped.y };
    needsRender.current = true;
  }, [onHover]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current && dragRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { col, row } = screenToTile(mx, my, camRef.current.x, camRef.current.y, zoomRef.current);
        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
          selectedTileRef.current = { col, row };
          needsRender.current = true;
        }
      }
    }
    dragRef.current = null;
    isDragging.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { w: cw, h: ch } = viewportRef.current;
    const minZoom = computeMinZoom(cw, ch);
    const oldZoom = zoomRef.current;
    const delta = e.deltaY > 0 ? 0.88 : 1.13;
    const newZoom = Math.max(minZoom, Math.min(MAX_ZOOM, oldZoom * delta));
    zoomRef.current = newZoom;

    const rawCam = {
      x: mx - (mx - camRef.current.x) * (newZoom / oldZoom),
      y: my - (my - camRef.current.y) * (newZoom / oldZoom),
    };
    const clamped = clampCamera(rawCam.x, rawCam.y, newZoom, cw, ch);
    camRef.current = { x: clamped.x, y: clamped.y };
    needsRender.current = true;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%", cursor: "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
