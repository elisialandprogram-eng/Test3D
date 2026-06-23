import { useRef, useEffect, useCallback } from "react";
import {
  TILE_W, TILE_H, FACE_H,
  GRID_COLS, GRID_ROWS,
  MAX_ZOOM, INITIAL_ZOOM,
  tileToScreen, screenToTile,
  renderOrder, getInitialCamera, clampCamera, computeMinZoom,
} from "../engine/IsoEngine";
import { generateTerrain, TerrainType } from "../world/TerrainGen";
import {
  generateEntities, WorldEntities,
  Kingdom, ResourceNode, MonsterCamp,
} from "../world/EntityGen";

// ─── Terrain colour palette ──────────────────────────────────────────────────
const TC: Record<TerrainType, { top: string; tl: string; left: string; right: string }> = {
  PLAIN:       { top: "#78C040", tl: "#96DA56", left: "#58A020", right: "#408018" },
  FOREST:      { top: "#386820", tl: "#4A8028", left: "#2A5010", right: "#1E3E08" },
  HILL:        { top: "#90AA40", tl: "#A8C454", left: "#708828", right: "#587018" },
  MOUNTAIN:    { top: "#9C8A78", tl: "#B4A494", left: "#7A6858", right: "#604E3C" },
  AGRICULTURAL:{ top: "#B4CC44", tl: "#CCE45E", left: "#90AA28", right: "#789018" },
  WATERFRONT:  { top: "#4890D8", tl: "#64AAEE", left: "#2870A8", right: "#165888" },
};

// Banner colours for kingdoms (8 options)
const BANNER_COLORS = [
  "#C8302A","#2050C8","#20A030","#C89020","#882098","#20A0B0","#C84080","#606060",
];

const RESOURCE_COLORS: Record<string, string> = {
  WOOD: "#4A8820", STONE: "#8A8878", FOOD: "#D0B820",
  GOLD: "#F0C030", CRYSTAL: "#8040D0",
};

// ─── Tile drawing ────────────────────────────────────────────────────────────
function drawTile(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
  terrain: TerrainType,
) {
  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  const f = FACE_H * zoom;
  const c = TC[terrain];

  const tx = sx + w / 2, ty = sy;
  const rx = sx + w,      ry = sy + h / 2;
  const bx = sx + w / 2,  by = sy + h;
  const lx = sx,           ly = sy + h / 2;

  // Left face
  ctx.beginPath();
  ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + f);
  ctx.lineTo(bx, by + f); ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fillStyle = c.left;
  ctx.fill();

  // Right face
  ctx.beginPath();
  ctx.moveTo(rx, ry); ctx.lineTo(rx, ry + f);
  ctx.lineTo(bx, by + f); ctx.lineTo(bx, by);
  ctx.closePath();
  ctx.fillStyle = c.right;
  ctx.fill();

  // Top face with gradient
  ctx.beginPath();
  ctx.moveTo(tx, ty); ctx.lineTo(rx, ry);
  ctx.lineTo(bx, by); ctx.lineTo(lx, ly);
  ctx.closePath();
  const grad = ctx.createLinearGradient(tx, ty, bx, by);
  grad.addColorStop(0, c.tl);
  grad.addColorStop(1, c.top);
  ctx.fillStyle = grad;
  ctx.fill();

  // Border (very subtle, only at close zoom)
  if (zoom >= 0.28) {
    ctx.beginPath();
    ctx.moveTo(tx, ty); ctx.lineTo(rx, ry);
    ctx.lineTo(bx, by); ctx.lineTo(lx, ly);
    ctx.closePath();
    ctx.strokeStyle = "rgba(0,0,0,0.09)";
    ctx.lineWidth = 0.4;
    ctx.stroke();
  }
}

// ─── Terrain detail textures ─────────────────────────────────────────────────
function drawTerrainDetail(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainType,
  sx: number, sy: number, zoom: number,
  col: number, row: number,
) {
  if (zoom < 0.32) return;
  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  const cx = sx + w / 2;
  const cy = sy + h / 2;

  ctx.save();
  // Clip to tile diamond
  ctx.beginPath();
  ctx.moveTo(cx, sy); ctx.lineTo(sx + w, cy);
  ctx.lineTo(cx, sy + h); ctx.lineTo(sx, cy);
  ctx.closePath();
  ctx.clip();

  const seed = col * 137 + row * 31;

  if (terrain === "FOREST") {
    const offsets = [
      [-0.22, -0.18], [0.18, -0.08], [-0.05, 0.20],
    ];
    for (const [dx, dy] of offsets) {
      const tx = cx + dx * w;
      const ty = cy + dy * h;
      const r = zoom * 10;
      // Trunk
      ctx.fillStyle = "#7A5030";
      ctx.fillRect(tx - zoom * 1.5, ty, zoom * 3, zoom * 6);
      // Canopy
      ctx.beginPath();
      ctx.arc(tx, ty - r * 0.4, r, 0, Math.PI * 2);
      ctx.fillStyle = "#2A5E14";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx, ty - r * 0.9, r * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = "#3A7020";
      ctx.fill();
    }
  }

  if (terrain === "MOUNTAIN") {
    // Rock/peak shapes
    const peaks = [
      [cx - 0.12 * w, cy + 0.05 * h, 0.18 * w, 0.30 * h],
      [cx + 0.14 * w, cy + 0.10 * h, 0.13 * w, 0.22 * h],
    ];
    for (const [px, py, pw, ph] of peaks) {
      ctx.beginPath();
      ctx.moveTo(px, py + ph);
      ctx.lineTo(px - pw / 2, py + ph);
      ctx.lineTo(px, py);
      ctx.lineTo(px + pw / 2, py + ph);
      ctx.closePath();
      ctx.fillStyle = "#7A6858";
      ctx.fill();
      // Snow cap
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - pw * 0.22, py + ph * 0.28);
      ctx.lineTo(px + pw * 0.22, py + ph * 0.28);
      ctx.closePath();
      ctx.fillStyle = "#E8E0D8";
      ctx.fill();
    }
  }

  if (terrain === "AGRICULTURAL" && zoom >= 0.4) {
    ctx.strokeStyle = "rgba(130,100,20,0.35)";
    ctx.lineWidth = zoom * 1.2;
    for (let i = -3; i <= 3; i++) {
      const lx = cx + i * zoom * 9;
      ctx.beginPath();
      ctx.moveTo(lx - h * 0.6, cy - h * 0.4);
      ctx.lineTo(lx + h * 0.6, cy + h * 0.4);
      ctx.stroke();
    }
  }

  if (terrain === "WATERFRONT" && zoom >= 0.36) {
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = zoom * 1.4;
    for (let i = 0; i < 3; i++) {
      const wy = cy + (i - 1) * zoom * 8;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.25, wy);
      for (let x = -0.25; x <= 0.25; x += 0.05) {
        ctx.lineTo(cx + x * w, wy + Math.sin(x * Math.PI * 4 + (seed % 6)) * zoom * 3.5);
      }
      ctx.stroke();
    }
  }

  if (terrain === "PLAIN" && zoom >= 0.55) {
    ctx.fillStyle = "rgba(50,120,20,0.28)";
    const dots = [(seed % 7) / 7, ((seed * 3 + 11) % 7) / 7, ((seed * 5 + 23) % 7) / 7];
    for (const d of dots) {
      const px = cx + (d - 0.5) * w * 0.5;
      const py = cy + ((seed * d * 7) % 0.6 - 0.3) * h * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, zoom * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (terrain === "HILL" && zoom >= 0.4) {
    ctx.strokeStyle = "rgba(80,100,20,0.22)";
    ctx.lineWidth = zoom * 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.1, w * 0.28, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + h * 0.1, w * 0.18, Math.PI * 0.3, Math.PI * 0.7);
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Entity drawing ──────────────────────────────────────────────────────────
function drawShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, zoom: number, rx: number, ry: number) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * zoom, ry * zoom, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
}

function drawKingdom(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
  k: Kingdom,
) {
  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  const cx = sx + w / 2;
  const cy = sy + h / 2; // tile surface center

  const sc = zoom; // scale factor
  const banner = BANNER_COLORS[k.colorIdx % 8];

  drawShadow(ctx, cx, cy, zoom, 22, 8);

  ctx.save();
  ctx.translate(cx, cy);

  // Foundation slab
  ctx.fillStyle = "#A08878";
  ctx.fillRect(-20 * sc, -6 * sc, 40 * sc, 8 * sc);

  // Left tower
  ctx.fillStyle = "#788898";
  ctx.fillRect(-20 * sc, -36 * sc, 11 * sc, 30 * sc);
  ctx.fillStyle = "#606878";
  ctx.fillRect(-20 * sc, -42 * sc, 11 * sc, 8 * sc);
  // Left merlon teeth
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#707888";
    ctx.fillRect((-20 + i * 4) * sc, -50 * sc, 2.5 * sc, 8 * sc);
  }

  // Right tower
  ctx.fillStyle = "#788898";
  ctx.fillRect(9 * sc, -36 * sc, 11 * sc, 30 * sc);
  ctx.fillStyle = "#606878";
  ctx.fillRect(9 * sc, -42 * sc, 11 * sc, 8 * sc);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#707888";
    ctx.fillRect((9 + i * 4) * sc, -50 * sc, 2.5 * sc, 8 * sc);
  }

  // Main keep
  ctx.fillStyle = "#90A0B0";
  ctx.fillRect(-10 * sc, -55 * sc, 20 * sc, 50 * sc);
  // Keep top / battlements
  ctx.fillStyle = "#7888A0";
  ctx.fillRect(-10 * sc, -63 * sc, 20 * sc, 10 * sc);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = "#8898B0";
    ctx.fillRect((-10 + i * 6) * sc, -71 * sc, 3.5 * sc, 9 * sc);
  }

  // Gate arch
  ctx.fillStyle = "#384050";
  ctx.beginPath();
  ctx.arc(0, -10 * sc, 5 * sc, Math.PI, 0);
  ctx.lineTo(5 * sc, -5 * sc);
  ctx.lineTo(-5 * sc, -5 * sc);
  ctx.closePath();
  ctx.fill();

  // Flag pole
  ctx.strokeStyle = "#C0C0A0";
  ctx.lineWidth = 1.5 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -63 * sc);
  ctx.lineTo(0, -82 * sc);
  ctx.stroke();

  // Flag
  ctx.fillStyle = banner;
  ctx.beginPath();
  ctx.moveTo(0, -82 * sc);
  ctx.lineTo(14 * sc, -77 * sc);
  ctx.lineTo(0, -72 * sc);
  ctx.closePath();
  ctx.fill();

  // Window slits on keep
  if (zoom >= 0.45) {
    ctx.fillStyle = "#384050";
    ctx.fillRect(-2 * sc, -45 * sc, 4 * sc, 6 * sc);
    ctx.fillRect(-2 * sc, -32 * sc, 4 * sc, 6 * sc);
  }

  // Kingdom name
  if (zoom >= 0.30) {
    const fontSize = Math.max(8, 11 * sc);
    ctx.font = `bold ${fontSize}px 'Cinzel', serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillText(k.name, 1 * sc, 6 * sc);
    ctx.fillStyle = "#F0E8C8";
    ctx.fillText(k.name, 0, 5 * sc);
  }

  // Level badge
  if (zoom >= 0.25) {
    const bx = 16 * sc, by = -58 * sc, br = 7 * sc;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = banner;
    ctx.fill();
    ctx.strokeStyle = "#F0E8C8";
    ctx.lineWidth = 1 * sc;
    ctx.stroke();
    const lfs = Math.max(6, 8 * sc);
    ctx.font = `bold ${lfs}px sans-serif`;
    ctx.fillStyle = "#FFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(k.level), bx, by);
  }

  ctx.restore();
}

function drawResource(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
  r: ResourceNode,
) {
  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  const cx = sx + w / 2;
  const cy = sy + h / 2;
  const sc = zoom;
  const col = RESOURCE_COLORS[r.type];

  drawShadow(ctx, cx, cy, zoom, 16, 6);

  ctx.save();
  ctx.translate(cx, cy);

  switch (r.type) {
    case "WOOD": {
      const spots = [[-10, -4], [4, -8], [-3, 6]];
      for (const [dx, dy] of spots) {
        // Trunk
        ctx.fillStyle = "#6A4020";
        ctx.fillRect((dx - 1.5) * sc, dy * sc, 3 * sc, 7 * sc);
        // Layers of canopy
        ctx.beginPath();
        ctx.moveTo(dx * sc, (dy - 16) * sc);
        ctx.lineTo((dx + 8) * sc, (dy - 4) * sc);
        ctx.lineTo((dx - 8) * sc, (dy - 4) * sc);
        ctx.closePath();
        ctx.fillStyle = "#2E6812";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(dx * sc, (dy - 22) * sc);
        ctx.lineTo((dx + 6) * sc, (dy - 13) * sc);
        ctx.lineTo((dx - 6) * sc, (dy - 13) * sc);
        ctx.closePath();
        ctx.fillStyle = "#3A8018";
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(dx * sc, (dy - 27) * sc);
        ctx.lineTo((dx + 4.5) * sc, (dy - 20) * sc);
        ctx.lineTo((dx - 4.5) * sc, (dy - 20) * sc);
        ctx.closePath();
        ctx.fillStyle = "#4A9820";
        ctx.fill();
      }
      break;
    }
    case "STONE": {
      const rocks = [[-8, 0, 10, 7], [6, 2, 8, 6], [-2, 5, 7, 5]];
      for (const [rx, ry, rw, rh] of rocks) {
        ctx.beginPath();
        ctx.ellipse(rx * sc, ry * sc, rw * sc / 2, rh * sc / 2, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#808878";
        ctx.fill();
        ctx.strokeStyle = "#606858";
        ctx.lineWidth = sc;
        ctx.stroke();
        // highlight
        ctx.beginPath();
        ctx.ellipse((rx - 2) * sc, (ry - 2) * sc, rw * sc / 4, rh * sc / 4, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fill();
      }
      break;
    }
    case "FOOD": {
      const stalks = [[-8, 0], [0, -4], [8, 0]];
      for (const [dx, dy] of stalks) {
        ctx.strokeStyle = "#A89020";
        ctx.lineWidth = 1.5 * sc;
        ctx.beginPath();
        ctx.moveTo(dx * sc, (dy + 8) * sc);
        ctx.lineTo(dx * sc, (dy - 14) * sc);
        ctx.stroke();
        // Wheat head
        ctx.fillStyle = "#D8B828";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.ellipse(
            (dx + (i % 2 === 0 ? 3 : -3)) * sc,
            (dy - 6 - i * 2.5) * sc,
            3 * sc, 2 * sc, i * 0.4, 0, Math.PI * 2
          );
          ctx.fill();
        }
      }
      break;
    }
    case "GOLD": {
      const coins = [[0, 0], [-6, 3], [6, 3], [-3, -5], [3, -5]];
      for (const [dx, dy] of coins) {
        ctx.beginPath();
        ctx.ellipse(dx * sc, dy * sc, 5 * sc, 3.5 * sc, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#E8C020";
        ctx.fill();
        ctx.strokeStyle = "#C09010";
        ctx.lineWidth = sc;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse((dx - 1) * sc, (dy - 1) * sc, 2 * sc, 1.5 * sc, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,180,0.4)";
        ctx.fill();
      }
      break;
    }
    case "CRYSTAL": {
      const gems = [[0, -10], [-7, 2], [7, 2]];
      for (const [dx, dy] of gems) {
        ctx.beginPath();
        ctx.moveTo(dx * sc, (dy - 10) * sc);
        ctx.lineTo((dx + 6) * sc, (dy - 2) * sc);
        ctx.lineTo((dx + 4) * sc, (dy + 5) * sc);
        ctx.lineTo((dx - 4) * sc, (dy + 5) * sc);
        ctx.lineTo((dx - 6) * sc, (dy - 2) * sc);
        ctx.closePath();
        ctx.fillStyle = "#7848D8";
        ctx.fill();
        ctx.strokeStyle = "#A080F8";
        ctx.lineWidth = sc;
        ctx.stroke();
        // inner shine
        ctx.beginPath();
        ctx.moveTo(dx * sc, (dy - 8) * sc);
        ctx.lineTo((dx + 3) * sc, (dy - 1) * sc);
        ctx.lineTo((dx - 3) * sc, (dy - 1) * sc);
        ctx.closePath();
        ctx.fillStyle = "rgba(200,180,255,0.35)";
        ctx.fill();
      }
      break;
    }
  }

  // Level indicator
  if (zoom >= 0.3) {
    const lfs = Math.max(7, 9 * sc);
    ctx.font = `bold ${lfs}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lbx = 14 * sc, lby = -16 * sc, lbr = 6 * sc;
    ctx.beginPath();
    ctx.arc(lbx, lby, lbr, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = sc;
    ctx.stroke();
    ctx.fillStyle = "#FFF";
    ctx.fillText(String(r.level), lbx, lby);
  }

  ctx.restore();
}

function drawMonsterCamp(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, zoom: number,
  m: MonsterCamp,
) {
  const w = TILE_W * zoom;
  const h = TILE_H * zoom;
  const cx = sx + w / 2;
  const cy = sy + h / 2;
  const sc = zoom;

  const lvlColors = [
    "#2AAA30","#40B840","#90CC20","#D0C020","#E08820",
    "#E06020","#D03818","#A81818","#800080","#400040",
  ];
  const flagCol = lvlColors[Math.min(m.level - 1, 9)];

  drawShadow(ctx, cx, cy, zoom, 16, 6);
  ctx.save();
  ctx.translate(cx, cy);

  // Ground ring
  ctx.beginPath();
  ctx.ellipse(0, 5 * sc, 18 * sc, 7 * sc, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(60,40,10,0.35)";
  ctx.fill();

  // Tent body
  ctx.beginPath();
  ctx.moveTo(0, -36 * sc);
  ctx.lineTo(-20 * sc, 4 * sc);
  ctx.lineTo(20 * sc, 4 * sc);
  ctx.closePath();
  ctx.fillStyle = "#9A7848";
  ctx.fill();
  ctx.strokeStyle = "#705828";
  ctx.lineWidth = 1.2 * sc;
  ctx.stroke();

  // Tent flap
  ctx.beginPath();
  ctx.moveTo(-6 * sc, 4 * sc);
  ctx.lineTo(0, -16 * sc);
  ctx.lineTo(6 * sc, 4 * sc);
  ctx.closePath();
  ctx.fillStyle = "#705828";
  ctx.fill();

  // Tent stripe
  ctx.strokeStyle = "rgba(200,160,80,0.4)";
  ctx.lineWidth = sc;
  ctx.beginPath();
  ctx.moveTo(-18 * sc, 2 * sc);
  ctx.lineTo(-4 * sc, -30 * sc);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18 * sc, 2 * sc);
  ctx.lineTo(4 * sc, -30 * sc);
  ctx.stroke();

  // Flag pole
  ctx.strokeStyle = "#C0A870";
  ctx.lineWidth = 1.5 * sc;
  ctx.beginPath();
  ctx.moveTo(0, -36 * sc);
  ctx.lineTo(0, -52 * sc);
  ctx.stroke();

  // Flag
  ctx.fillStyle = flagCol;
  ctx.beginPath();
  ctx.moveTo(0, -52 * sc);
  ctx.lineTo(12 * sc, -47 * sc);
  ctx.lineTo(0, -42 * sc);
  ctx.closePath();
  ctx.fill();

  // Level badge
  if (zoom >= 0.25) {
    const lfs = Math.max(6, 8 * sc);
    ctx.font = `bold ${lfs}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const br = 8 * sc;
    ctx.beginPath();
    ctx.arc(0, 14 * sc, br, 0, Math.PI * 2);
    ctx.fillStyle = flagCol;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = sc;
    ctx.stroke();
    ctx.fillStyle = "#FFF";
    ctx.fillText(`Lv${m.level}`, 0, 14 * sc);
  }

  ctx.restore();
}

// ─── Selection highlight ─────────────────────────────────────────────────────
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

// ─── Component state ─────────────────────────────────────────────────────────
export interface IsoSelection {
  type: "kingdom" | "resource" | "monster";
  entity: Kingdom | ResourceNode | MonsterCamp;
}

interface IsoWorldProps {
  onSelect?: (sel: IsoSelection | null) => void;
  onHover?: (col: number, row: number) => void;
}

export function IsoWorld({ onSelect, onHover }: IsoWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera state (mutable refs — no re-render needed)
  const camRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(INITIAL_ZOOM);
  const viewportRef = useRef({ w: 1, h: 1 });
  const dragRef = useRef<{ startX: number; startY: number; camX: number; camY: number } | null>(null);
  const isDragging = useRef(false);

  // World data refs
  const terrainRef = useRef<ReturnType<typeof generateTerrain> | null>(null);
  const entitiesRef = useRef<WorldEntities | null>(null);
  const selectedTileRef = useRef<{ col: number; row: number } | null>(null);
  const rafRef = useRef<number>(0);
  const needsRender = useRef(true);

  // ─── Main render ─────────────────────────────────────────────────────────
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
    const entities = entitiesRef.current;
    const zoom = zoomRef.current;
    const { x: camX, y: camY } = camRef.current;

    if (!terrain || !entities) { rafRef.current = requestAnimationFrame(render); return; }

    // Background
    ctx.fillStyle = "#1A2E0A";
    ctx.fillRect(0, 0, cw, ch);

    // Draw tiles + entities in isometric order
    for (const [col, row] of renderOrder(camX, camY, zoom, cw, ch)) {
      const t = terrain[row][col];
      const { x: sx, y: sy } = tileToScreen(col, row, camX, camY, zoom);

      drawTile(ctx, sx, sy, zoom, t);
      drawTerrainDetail(ctx, t, sx, sy, zoom, col, row);

      const k = `${col},${row}`;
      const etype = entities.entityMap.get(k);
      if (etype) {
        const entity = entities.entityIndex.get(k)!;
        if (etype === "kingdom") drawKingdom(ctx, sx, sy, zoom, entity as Kingdom);
        else if (etype === "resource") drawResource(ctx, sx, sy, zoom, entity as ResourceNode);
        else if (etype === "monster") drawMonsterCamp(ctx, sx, sy, zoom, entity as MonsterCamp);
      }

      // Selection highlight
      const sel = selectedTileRef.current;
      if (sel && sel.col === col && sel.row === row) {
        drawSelection(ctx, sx, sy, zoom);
      }
    }

    // Map border indicator at edges
    ctx.save();
    ctx.strokeStyle = "rgba(255,220,80,0.15)";
    ctx.lineWidth = 1.5;
    // draw boundary diamond
    const tl = tileToScreen(0, 0, camX, camY, zoom);
    const tr = tileToScreen(GRID_COLS - 1, 0, camX, camY, zoom);
    const br = tileToScreen(GRID_COLS - 1, GRID_ROWS - 1, camX, camY, zoom);
    const bl = tileToScreen(0, GRID_ROWS - 1, camX, camY, zoom);
    const tw = TILE_W * zoom, th = TILE_H * zoom;
    ctx.beginPath();
    ctx.moveTo(tl.x + tw / 2, tl.y);
    ctx.lineTo(tr.x + tw, tr.y + th / 2);
    ctx.lineTo(br.x + tw / 2, br.y + th);
    ctx.lineTo(bl.x, bl.y + th / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    rafRef.current = requestAnimationFrame(render);
  }, []);

  // ─── Init ────────────────────────────────────────────────────────────────
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
      // Enforce min zoom for new viewport size
      const minZoom = computeMinZoom(cw, ch);
      if (zoomRef.current < minZoom) zoomRef.current = minZoom;
      const init = getInitialCamera(cw, ch, zoomRef.current);
      camRef.current = { x: init.x, y: init.y };
      needsRender.current = true;
    }

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    // Generate world data
    terrainRef.current = generateTerrain(GRID_COLS, GRID_ROWS);
    entitiesRef.current = generateEntities(terrainRef.current);
    needsRender.current = true;

    rafRef.current = requestAnimationFrame(render);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  // ─── Input handlers ──────────────────────────────────────────────────────
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
      // hover
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
      // It was a click — hit-test
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { col, row } = screenToTile(mx, my, camRef.current.x, camRef.current.y, zoomRef.current);
        if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
          selectedTileRef.current = { col, row };
          needsRender.current = true;
          const k = `${col},${row}`;
          const etype = entitiesRef.current?.entityMap.get(k);
          if (etype) {
            const entity = entitiesRef.current!.entityIndex.get(k)!;
            onSelect?.({ type: etype, entity });
          } else {
            onSelect?.(null);
          }
        }
      }
    }
    dragRef.current = null;
    isDragging.current = false;
  }, [onSelect]);

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

    // Zoom toward mouse cursor, then clamp to map edges
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
