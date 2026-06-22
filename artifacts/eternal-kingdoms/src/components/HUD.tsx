import { useRef, useEffect } from "react";
import { Compass, Castle, Map, Shield, Swords, Crown } from "lucide-react";

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

  const xCoord = Math.round(coords.x);
  const yCoord = Math.round(coords.z);

  return (
    <>
      {/* ── Top Left: Player panel ── */}
      <div className="mmo-panel absolute top-4 left-4 w-72" data-testid="panel-player">
        <div className="mmo-panel-header flex items-center justify-center gap-2">
          <Crown size={14} className="text-amber-400" />
          <span className="mmo-title text-sm tracking-wider">DRAGONLORD AETHARION</span>
          <Crown size={14} className="text-amber-400" />
        </div>
        
        <div className="p-4 space-y-3">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/40 border border-amber-900/40 p-2 rounded-sm text-center">
              <div className="mmo-text text-[0.65rem] uppercase tracking-wider opacity-70 mb-1 flex items-center justify-center gap-1">
                <Castle size={10} /> Kingdom
              </div>
              <div className="mmo-value-gold text-sm truncate">Ironveil Keep</div>
            </div>
            
            <div className="bg-black/40 border border-amber-900/40 p-2 rounded-sm text-center">
              <div className="mmo-text text-[0.65rem] uppercase tracking-wider opacity-70 mb-1 flex items-center justify-center gap-1">
                <Swords size={10} /> Power
              </div>
              <div className="mmo-value text-sm text-emerald-300">1,284,600</div>
            </div>
            
            <div className="bg-black/40 border border-amber-900/40 p-2 rounded-sm text-center col-span-2">
              <div className="mmo-text text-[0.65rem] uppercase tracking-wider opacity-70 mb-1 flex items-center justify-center gap-1">
                <Shield size={10} /> Alliance
              </div>
              <div className="mmo-value text-sm text-sky-300">[NOVA]</div>
            </div>
          </div>

          {/* Coordinate Display */}
          <div className="pt-2 flex justify-center">
            <div className="coord-display-container" data-testid="coord-display">
              <Map size={14} className="text-amber-500/80" />
              <span className="coord-text">
                C:2 &nbsp;&nbsp;X:{xCoord} &nbsp;&nbsp;Y:{yCoord}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Left: Selected Kingdom ── */}
      <div
        className="mmo-panel absolute bottom-4 left-4 w-72 selected-pulse"
        data-testid="panel-selected"
      >
        <div className="mmo-panel-header flex items-center justify-center gap-2">
          <span className="mmo-title text-sm">
            {selected ? "KINGDOM DETAILS" : "SELECTION"}
          </span>
        </div>
        
        {selected ? (
          <div className="p-4 space-y-3">
            <div className="text-center mb-4">
              <div className="mmo-title text-lg mb-1">{selected.name}</div>
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto"></div>
            </div>
            
            <div className="bg-black/30 border border-amber-900/30 p-3 rounded-sm space-y-2">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="mmo-text text-xs uppercase tracking-wide opacity-80">Type</span>
                <span className="mmo-value text-sm">{selected.type}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="mmo-text text-xs uppercase tracking-wide opacity-80">Level</span>
                <span className="mmo-value-gold text-sm flex items-center gap-1">
                  <span className="text-xs opacity-70">Lv.</span>{selected.level}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button className="mmo-btn text-center py-2">SCOUT</button>
              <button className="mmo-btn text-center py-2">MARCH</button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-4">
            <Compass size={32} className="mx-auto text-amber-500/30 animate-pulse" />
            <div>
              <div className="mmo-value-gold text-sm mb-1">AWAITING ORDERS</div>
              <div className="mmo-text text-xs opacity-70 leading-relaxed">
                Select a kingdom on the map to view detailed intelligence and tactical options.
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-black/40 px-3 py-1.5 border border-amber-900/30 rounded-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="mmo-text text-[0.65rem] uppercase tracking-wider opacity-80">Map Active</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Right: Minimap ── */}
      <div className="mmo-panel absolute bottom-4 right-4 p-3 flex flex-col items-center" data-testid="panel-minimap">
        <div className="mmo-title text-xs mb-2 tracking-[0.2em] flex items-center gap-2 w-full justify-center opacity-90 border-b border-amber-900/30 pb-2">
          <span className="w-8 h-px bg-gradient-to-r from-transparent to-amber-500/50"></span>
          WORLD MAP
          <span className="w-8 h-px bg-gradient-to-l from-transparent to-amber-500/50"></span>
        </div>
        
        <div className="minimap-container">
          <canvas
            ref={minimapRef}
            width={148}
            height={148}
            className="minimap-canvas block"
            data-testid="minimap-canvas"
          />
        </div>
        
        <div className="w-full flex justify-between items-center mt-3 px-1">
          <div className="mmo-text text-[0.6rem] opacity-60 uppercase tracking-widest flex flex-col items-center">
            <span>ETERNAL</span>
            <span>KINGDOMS</span>
          </div>
          <div className="bg-black/50 border border-amber-900/50 px-2 py-1">
            <span className="mmo-text text-[0.65rem] opacity-90 font-mono tracking-wider">
              {xCoord},{yCoord}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
