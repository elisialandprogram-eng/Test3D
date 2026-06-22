import { useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Compass, Castle, Minus, Plus } from "lucide-react";

interface HUDProps {
  coords: { x: number; z: number };
  selected: { name: string; type: string; level: number } | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function HUD({ coords, selected, zoom, onZoomIn, onZoomOut }: HUDProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "#2d5a1a");
    grad.addColorStop(0.3, "#3a6e22");
    grad.addColorStop(0.6, "#4a7c2f");
    grad.addColorStop(0.8, "#2a5018");
    grad.addColorStop(1, "#1a3510");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const noise = (x: number, y: number) => Math.sin(x * 0.3) * Math.cos(y * 0.4) * 0.5 + 0.5;

    for (let i = 0; i < 6; i++) {
      const bx = (noise(i * 7.3, i * 2.1) * 0.7 + 0.15) * w;
      const by = (noise(i * 3.1, i * 5.7) * 0.7 + 0.15) * h;
      const br = 8 + noise(i * 1.9, i * 4.3) * 10;
      const waterGrad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      waterGrad.addColorStop(0, "rgba(40,80,160,0.7)");
      waterGrad.addColorStop(1, "rgba(20,50,120,0.4)");
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }

    const kingdoms: Array<{ x: number; y: number; main?: boolean }> = [
      { x: w * 0.5, y: h * 0.45, main: true },
      { x: w * 0.2, y: h * 0.3 },
      { x: w * 0.75, y: h * 0.25 },
      { x: w * 0.15, y: h * 0.65 },
      { x: w * 0.85, y: h * 0.7 },
      { x: w * 0.4, y: h * 0.8 },
      { x: w * 0.6, y: h * 0.2 },
      { x: w * 0.9, y: h * 0.45 },
      { x: w * 0.3, y: h * 0.5 },
      { x: w * 0.65, y: h * 0.6 },
    ];

    kingdoms.forEach(({ x, y, main }) => {
      ctx.beginPath();
      ctx.arc(x, y, main ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = main ? "#f0c040" : "#c8a028";
      ctx.fill();
      if (main) {
        ctx.strokeStyle = "rgba(240,192,64,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    const px = ((coords.x + 250) / 500) * w;
    const py = ((coords.z + 250) / 500) * h;
    ctx.beginPath();
    ctx.arc(Math.max(4, Math.min(w - 4, px)), Math.max(4, Math.min(h - 4, py)), 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = "rgba(201,162,39,0.12)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= w; gx += w / 5) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    for (let gy = 0; gy <= h; gy += h / 5) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }
  }, [coords]);

  return (
    <>
      {/* Top Left — Player Info */}
      <div
        className="mmo-panel absolute top-3 left-3 w-52"
        data-testid="panel-player"
      >
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
          <div className="border-t border-amber-900/30 pt-1 mt-1">
            <span className="coord-text" data-testid="coord-display">
              {coords.x >= 0 ? "E" : "W"}{Math.abs(Math.round(coords.x))} ·{" "}
              {coords.z >= 0 ? "N" : "S"}{Math.abs(Math.round(coords.z))}
            </span>
          </div>
        </div>
      </div>

      {/* Top Right — Zoom Controls */}
      <div className="mmo-panel absolute top-3 right-3 flex flex-col items-center gap-1 p-2" data-testid="panel-zoom">
        <span className="mmo-title" style={{ fontSize: "0.55rem", color: "#c9a227", letterSpacing: "0.1em" }}>ZOOM</span>
        <button
          className="mmo-btn w-8 h-8 flex items-center justify-center"
          onClick={onZoomIn}
          data-testid="btn-zoom-in"
        >
          <Plus size={12} />
        </button>
        <div className="mmo-text text-center" style={{ fontSize: "0.6rem", minWidth: 32 }}>
          {zoom}%
        </div>
        <button
          className="mmo-btn w-8 h-8 flex items-center justify-center"
          onClick={onZoomOut}
          data-testid="btn-zoom-out"
        >
          <Minus size={12} />
        </button>
        <div className="mt-1 flex flex-col gap-1">
          <button className="mmo-btn" style={{ fontSize: "0.5rem", padding: "2px 6px" }} data-testid="btn-fit-world">WORLD</button>
          <button className="mmo-btn" style={{ fontSize: "0.5rem", padding: "2px 6px" }} data-testid="btn-fit-kingdom">HOME</button>
        </div>
      </div>

      {/* Bottom Left — Selected Object Panel */}
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
            <div className="mmo-text text-xs opacity-40 text-xs">Drag to pan · Scroll to zoom</div>
          </div>
        )}
      </div>

      {/* Bottom Right — Minimap */}
      <div className="mmo-panel absolute bottom-3 right-3 p-2" data-testid="panel-minimap">
        <div className="mmo-panel-header flex items-center gap-2 mb-2 -mx-2 -mt-2 px-2 pt-2">
          <span className="mmo-title" style={{ fontSize: "0.6rem" }}>WORLD MAP</span>
        </div>
        <canvas
          ref={minimapRef}
          width={140}
          height={140}
          className="minimap-canvas block"
          data-testid="minimap-canvas"
        />
        <div className="flex justify-between mt-1">
          <span className="mmo-text" style={{ fontSize: "0.55rem", opacity: 0.5 }}>W</span>
          <span className="mmo-text" style={{ fontSize: "0.55rem", opacity: 0.5 }}>ETERNAL KINGDOMS</span>
          <span className="mmo-text" style={{ fontSize: "0.55rem", opacity: 0.5 }}>E</span>
        </div>
      </div>

      {/* Center — Loading hint (fades out) */}
    </>
  );
}
