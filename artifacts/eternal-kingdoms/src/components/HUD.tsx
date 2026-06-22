import { useRef, useEffect, useCallback } from "react";
import { Crown, Map, Compass, Castle, Shield, Swords, Mountain, Layers, ZoomIn, ZoomOut } from "lucide-react";
import type { WorldStateUpdate } from "../scenes/BabylonWorld";
import type { ViewMode } from "../engine/CameraEngine";
import { WORLD_SIZE, WORLD_CENTER } from "../engine/CoordinateEngine";

interface HUDProps {
  state: WorldStateUpdate;
  onViewModeChange?: (mode: ViewMode) => void;
}

const MINIMAP_SIZE = 160;

export function HUD({ state, onViewModeChange }: HUDProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null);

  const coord = state.coord ?? { x: WORLD_CENTER.x, y: WORLD_CENTER.y };
  const zone = state.zone ?? "D4";
  const viewMode = state.viewMode ?? "FIELD";
  const selected = state.selected ?? null;
  const camTarget = state.cameraTarget ?? { x: WORLD_CENTER.x, z: WORLD_CENTER.y };
  const camRadius = state.cameraRadius ?? 300;

  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // World background (grass)
    ctx.fillStyle = "#2e6b18";
    ctx.fillRect(0, 0, W, H);

    // Zone grid lines
    ctx.strokeStyle = "rgba(201,162,39,0.18)";
    ctx.lineWidth = 0.5;
    const ZONES = 8;
    for (let i = 1; i < ZONES; i++) {
      const gx = (i / ZONES) * W;
      const gy = (i / ZONES) * H;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // Zone labels
    ctx.font = "bold 7px Cinzel, serif";
    ctx.fillStyle = "rgba(255,220,80,0.35)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let r = 0; r < ZONES; r++) {
      for (let c = 0; c < ZONES; c++) {
        const lx = ((c + 0.5) / ZONES) * W;
        const ly = ((r + 0.5) / ZONES) * H;
        const letter = String.fromCharCode(65 + c);
        ctx.fillText(`${letter}${r + 1}`, lx, ly);
      }
    }

    const toMM = (worldX: number, worldY: number) => ({
      mx: (worldX / WORLD_SIZE) * W,
      my: (worldY / WORLD_SIZE) * H,
    });

    // Congress center dot
    const { mx: ccx, my: ccy } = toMM(WORLD_CENTER.x, WORLD_CENTER.y);
    ctx.beginPath();
    ctx.arc(ccx, ccy, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#aa44ff";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Shrines (approximate from SHRINE_POSITIONS)
    const shrineDots = [
      { x: 768, y: 768, tier: "A" },
      { x: 2304, y: 768, tier: "A" },
      { x: 1536, y: 2560, tier: "A" },
      { x: 400, y: 1536, tier: "B" },
      { x: 2672, y: 1536, tier: "B" },
      { x: 1100, y: 400, tier: "B" },
      { x: 1972, y: 400, tier: "B" },
      { x: 900, y: 2400, tier: "B" },
      { x: 2100, y: 2400, tier: "B" },
    ];
    for (const s of shrineDots) {
      const { mx, my } = toMM(s.x, s.y);
      ctx.beginPath();
      ctx.arc(mx, my, s.tier === "A" ? 3 : 2, 0, Math.PI * 2);
      ctx.fillStyle = s.tier === "A" ? "#cc66ff" : s.tier === "B" ? "#44aaff" : "#ffcc44";
      ctx.fill();
    }

    // Kingdom dots (seeded positions — approximate visual)
    const seed = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 100; i++) {
      const kx = 200 + seed(i * 2.3) * (WORLD_SIZE - 400);
      const ky = 200 + seed(i * 7.7) * (WORLD_SIZE - 400);
      const { mx, my } = toMM(kx, ky);
      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#d4a030";
      ctx.fill();
    }

    // Camera viewport rectangle
    const viewSize = (camRadius / WORLD_SIZE) * W * 0.7;
    const { mx: camX, my: camY } = toMM(camTarget.x, camTarget.z);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      Math.max(0, camX - viewSize / 2),
      Math.max(0, camY - viewSize / 2),
      Math.min(W, viewSize),
      Math.min(H, viewSize)
    );

    // Camera center dot
    ctx.beginPath();
    ctx.arc(camX, camY, 3, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();

    // Mouse coord dot
    const { mx: mx2, my: my2 } = toMM(coord.x, coord.y);
    ctx.beginPath();
    ctx.arc(mx2, my2, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4444";
    ctx.fill();
  }, [coord, camTarget, camRadius]);

  const VIEW_MODE_LABELS: Record<ViewMode, string> = {
    FIELD: "FIELD VIEW",
    WORLD: "WORLD VIEW",
    KINGDOM: "KINGDOM VIEW",
  };

  return (
    <>
      {/* ── Top Left: Logo + Coordinates + Zone ── */}
      <div className="absolute top-4 left-4 flex flex-col gap-2">
        {/* Logo */}
        <div className="mmo-panel px-4 py-2 flex items-center gap-2">
          <Crown size={16} className="text-amber-400" />
          <span className="mmo-title text-sm tracking-[0.2em]">ETERNAL KINGDOMS</span>
          <Crown size={16} className="text-amber-400" />
        </div>

        {/* Coordinates */}
        <div className="mmo-panel px-3 py-2">
          <div className="flex items-center gap-3">
            <Map size={13} className="text-amber-500/70" />
            <div className="flex gap-4">
              <div className="coord-display-container py-1">
                <span className="coord-text text-xs">
                  X: <span className="text-white font-bold">{coord.x.toFixed(0)}</span>
                </span>
              </div>
              <div className="coord-display-container py-1">
                <span className="coord-text text-xs">
                  Y: <span className="text-white font-bold">{coord.y.toFixed(0)}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 pl-5">
            <span className="mmo-text text-[0.65rem] opacity-60">Zone</span>
            <span className="mmo-value-gold text-xs font-bold">{zone}</span>
            <span className="mx-1 text-amber-900">|</span>
            <span className="mmo-text text-[0.65rem] opacity-60">View</span>
            <span className="mmo-value text-xs">{viewMode}</span>
          </div>
        </div>
      </div>

      {/* ── Top Right: Zoom + View Switch ── */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        {/* View Mode Buttons */}
        <div className="mmo-panel p-2 flex gap-2">
          {(["FIELD", "WORLD", "KINGDOM"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              className={`mmo-btn text-[0.65rem] px-3 py-1.5 flex items-center gap-1.5 ${
                viewMode === mode ? "border-amber-400 bg-amber-900/30" : ""
              }`}
              onClick={() => onViewModeChange?.(mode)}
            >
              {mode === "FIELD" && <Layers size={10} />}
              {mode === "WORLD" && <Mountain size={10} />}
              {mode === "KINGDOM" && <Castle size={10} />}
              {mode}
            </button>
          ))}
        </div>

        {/* Zoom info */}
        <div className="mmo-panel px-3 py-2 flex items-center gap-3">
          <ZoomIn size={12} className="text-amber-500/60" />
          <div className="flex flex-col items-center">
            <span className="mmo-text text-[0.6rem] uppercase opacity-60">Zoom</span>
            <span className="mmo-value text-xs">{Math.round(camRadius)}</span>
          </div>
          <ZoomOut size={12} className="text-amber-500/60" />
        </div>
      </div>

      {/* ── Bottom Left: Selection Panel ── */}
      <div className="mmo-panel absolute bottom-4 left-4 w-72" data-testid="panel-selected">
        <div className="mmo-panel-header flex items-center justify-center gap-2">
          <span className="mmo-title text-xs tracking-wider">
            {selected ? selected.entityType?.toUpperCase() + " DETAILS" : "SELECTION PANEL"}
          </span>
        </div>

        {selected ? (
          <div className="p-4 space-y-3">
            {selected.name && (
              <div className="text-center">
                <div className="mmo-title text-base mb-1" style={{ color: "#e8c547" }}>{selected.name}</div>
                <div className="h-px w-20 mx-auto" style={{ background: "linear-gradient(to right, transparent, #c9a227, transparent)" }} />
              </div>
            )}

            <div className="space-y-2 text-sm">
              {selected.entityType === "kingdom" && (
                <>
                  <Row label="Level" value={`Lv. ${selected.level}`} gold />
                  <Row label="Coord" value={`${selected.coord?.x}, ${selected.coord?.y}`} />
                  <Row label="Status" value="Independent" />
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button className="mmo-btn text-center text-[0.65rem] py-2 flex items-center justify-center gap-1">
                      <Swords size={10} /> MARCH
                    </button>
                    <button className="mmo-btn text-center text-[0.65rem] py-2 flex items-center justify-center gap-1">
                      <Shield size={10} /> SCOUT
                    </button>
                  </div>
                </>
              )}
              {selected.entityType === "shrine" && (
                <>
                  <Row label="Tier" value={`Shrine ${selected.tier}`} gold />
                  <Row label="Coord" value={`${selected.coord?.x}, ${selected.coord?.y}`} />
                  <Row label="Status" value="Unclaimed" />
                </>
              )}
              {selected.entityType === "resource" && (
                <>
                  <Row label="Type" value={selected.resourceType ?? "Unknown"} gold />
                  <Row label="Status" value="Available" />
                </>
              )}
              {selected.entityType === "monster" && (
                <>
                  <Row label="Level" value={`Lv. ${selected.level}`} gold />
                  <Row label="Status" value="Hostile" />
                </>
              )}
              {selected.entityType === "congress" && (
                <>
                  <Row label="Name" value="Ancient Congress" gold />
                  <Row label="Coord" value={`${selected.coord?.x}, ${selected.coord?.y}`} />
                  <Row label="Status" value="World Center" />
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-5 text-center space-y-3">
            <Compass size={28} className="mx-auto text-amber-500/25 animate-pulse" />
            <div className="mmo-value-gold text-xs">AWAITING ORDERS</div>
            <div className="mmo-text text-[0.65rem] opacity-60 leading-relaxed">
              Click any kingdom, shrine, resource, or monster on the world map to inspect it.
            </div>
            <div className="flex items-center justify-center gap-2 text-[0.6rem] mmo-text opacity-50 mt-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              Map Active · {viewMode === "WORLD" ? "World View" : viewMode === "FIELD" ? "Field View" : "Kingdom View"}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Right: Minimap ── */}
      <div className="mmo-panel absolute bottom-4 right-4 p-3 flex flex-col items-center">
        <div className="mmo-title text-[0.6rem] tracking-[0.2em] mb-2 flex items-center gap-2 w-full justify-center opacity-90 pb-2 border-b border-amber-900/30">
          <span className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500/30" />
          WORLD MAP
          <span className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500/30" />
        </div>

        <div className="minimap-container">
          <canvas
            ref={minimapRef}
            width={MINIMAP_SIZE}
            height={MINIMAP_SIZE}
            className="minimap-canvas block"
          />
        </div>

        <div className="w-full flex justify-between items-center mt-2 px-1">
          <div className="mmo-text text-[0.55rem] opacity-50 uppercase tracking-widest">
            {VIEW_MODE_LABELS[viewMode]}
          </div>
          <div className="coord-display-container py-0.5">
            <span className="coord-text text-[0.6rem]">
              {coord.x.toFixed(0)},{coord.y.toFixed(0)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, gold }: { label: string; value: string | number; gold?: boolean }) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
      <span className="mmo-text text-[0.7rem] uppercase tracking-wide opacity-70">{label}</span>
      <span className={gold ? "mmo-value-gold text-xs font-bold" : "mmo-value text-xs"}>{value}</span>
    </div>
  );
}
