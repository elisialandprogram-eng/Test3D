import { useRef, useEffect } from "react";
import { Compass, Castle, Map } from "lucide-react";

interface HUDProps {
  coords: { x: number; z: number };
  selected: { name: string; type: string; level: number } | null;
}

export function HUD({ coords, selected }: HUDProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Terrain-matching minimap colours
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0.0, "#4a8c2a");
    grad.addColorStop(0.3, "#5aa030");
    grad.addColorStop(0.6, "#4a8c2a");
    grad.addColorStop(1.0, "#3a7020");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Dirt trail approximation
    ctx.strokeStyle = "rgba(180,140,82,0.35)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.55);
    ctx.bezierCurveTo(w * 0.2, h * 0.4, w * 0.5, h * 0.7, w * 0.95, h * 0.48);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.1);
    ctx.bezierCurveTo(w * 0.35, h * 0.35, w * 0.6, h * 0.25, w * 0.9, h * 0.6);
    ctx.stroke();

    // Forest patches
    const forestAreas = [
      { x: 0.15, y: 0.28, r: 0.10 },
      { x: 0.72, y: 0.22, r: 0.09 },
      { x: 0.25, y: 0.72, r: 0.08 },
      { x: 0.82, y: 0.65, r: 0.09 },
      { x: 0.55, y: 0.80, r: 0.07 },
    ];
    forestAreas.forEach(({ x, y, r }) => {
      const fg = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
      fg.addColorStop(0, "rgba(38,85,22,0.7)");
      fg.addColorStop(1, "rgba(38,85,22,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, w, h);
    });

    // Water patches
    const waterSpots = [
      { x: 0.18, y: 0.40, rw: 12, rh: 8 },
      { x: 0.68, y: 0.38, rw: 10, rh: 7 },
      { x: 0.38, y: 0.75, rw: 9, rh: 6 },
    ];
    waterSpots.forEach(({ x, y, rw, rh }) => {
      ctx.fillStyle = "rgba(70,140,200,0.65)";
      ctx.beginPath();
      ctx.ellipse(x * w, y * h, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Kingdoms
    const kingdoms = [
      { x: 0.50, y: 0.50, main: true },
      { x: 0.22, y: 0.30 }, { x: 0.74, y: 0.24 }, { x: 0.16, y: 0.64 },
      { x: 0.84, y: 0.70 }, { x: 0.40, y: 0.82 }, { x: 0.62, y: 0.18 },
      { x: 0.88, y: 0.44 }, { x: 0.28, y: 0.52 }, { x: 0.65, y: 0.62 },
      { x: 0.10, y: 0.48 }, { x: 0.78, y: 0.88 }, { x: 0.46, y: 0.14 },
    ];
    kingdoms.forEach(({ x, y, main }) => {
      ctx.beginPath();
      const size = main ? 4.5 : 3;
      ctx.arc(x * w, y * h, size, 0, Math.PI * 2);
      ctx.fillStyle = main ? "#f0c040" : "#d4a030";
      ctx.fill();
      ctx.strokeStyle = main ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)";
      ctx.lineWidth = main ? 1.5 : 1;
      ctx.stroke();
    });

    // Player cursor position
    const px = ((coords.x + 250) / 500) * w;
    const py = ((coords.z + 250) / 500) * h;
    const clampedX = Math.max(4, Math.min(w - 4, px));
    const clampedY = Math.max(4, Math.min(h - 4, py));
    ctx.beginPath();
    ctx.arc(clampedX, clampedY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Minimap border grid
    ctx.strokeStyle = "rgba(201,162,39,0.10)";
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= w; gx += w / 5) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy += h / 5) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }
  }, [coords]);

  return (
    <>
      {/* ── Top Left: Player panel ── */}
      <div className="mmo-panel absolute top-3 left-3 w-52" data-testid="panel-player">
        <div className="mmo-panel-header flex items-center gap-2">
          <Compass size={12} className="text-amber-400" />
          <span className="mmo-title text-xs">DRAGONLORD AETHARION</span>
        </div>
        <div className="px-3 py-2 space-y-1">
          <div className="flex justify-between items-center">
            <span className="mmo-text text-xs opacity-70">Kingdom</span>
            <span className="mmo-title text-xs" style={{ color: "#c9a227" }}>Ironveil Keep</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="mmo-text text-xs opacity-70">Power</span>
            <span className="mmo-text text-xs text-emerald-400">1,284,600</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="mmo-text text-xs opacity-70">Alliance</span>
            <span className="mmo-text text-xs text-sky-400">[NOVA]</span>
          </div>
          <div className="border-t border-amber-900/30 pt-1 mt-1 flex items-center gap-2">
            <Map size={10} className="text-amber-600" />
            <span className="coord-text" data-testid="coord-display">
              {coords.x >= 0 ? "E" : "W"}{Math.abs(Math.round(coords.x))} :{" "}
              {coords.z >= 0 ? "N" : "S"}{Math.abs(Math.round(coords.z))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Left: Selected Kingdom ── */}
      <div
        className="mmo-panel absolute bottom-3 left-3 w-56 selected-pulse"
        data-testid="panel-selected"
      >
        <div className="mmo-panel-header flex items-center gap-2">
          <Castle size={12} className="text-amber-400" />
          <span className="mmo-title text-xs">
            {selected ? "SELECTED" : "KINGDOM INFO"}
          </span>
        </div>
        {selected ? (
          <div className="px-3 py-2 space-y-1">
            <div className="mmo-title text-sm" style={{ color: "#e8c547" }}>{selected.name}</div>
            <div className="flex justify-between">
              <span className="mmo-text text-xs opacity-60">Type</span>
              <span className="mmo-text text-xs">{selected.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="mmo-text text-xs opacity-60">Level</span>
              <span className="mmo-text text-xs text-amber-400">Lv.{selected.level}</span>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1">
            <div className="mmo-text text-xs opacity-50 italic">Click a kingdom to inspect</div>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="mmo-text text-xs opacity-60">21 kingdoms on map</span>
            </div>
            <div className="mmo-text text-xs opacity-40">Drag to explore · Auto-scroll edges</div>
          </div>
        )}
      </div>

      {/* ── Bottom Right: Minimap ── */}
      <div className="mmo-panel absolute bottom-3 right-3 p-2" data-testid="panel-minimap">
        <div className="mmo-panel-header flex items-center justify-between gap-2 mb-2 -mx-2 -mt-2 px-2 pt-2">
          <span className="mmo-title" style={{ fontSize: "0.6rem" }}>WORLD MAP</span>
          <span className="mmo-text" style={{ fontSize: "0.55rem", opacity: 0.5 }}>ETERNAL KINGDOMS</span>
        </div>
        <canvas
          ref={minimapRef}
          width={148}
          height={148}
          className="minimap-canvas block"
          data-testid="minimap-canvas"
        />
        <div className="flex justify-between mt-1 px-1">
          <span className="mmo-text" style={{ fontSize: "0.5rem", opacity: 0.4 }}>W</span>
          <span className="mmo-text" style={{ fontSize: "0.5rem", opacity: 0.4 }}>C:2  X:{Math.round(coords.x)}  Y:{Math.round(coords.z)}</span>
          <span className="mmo-text" style={{ fontSize: "0.5rem", opacity: 0.4 }}>E</span>
        </div>
      </div>
    </>
  );
}
