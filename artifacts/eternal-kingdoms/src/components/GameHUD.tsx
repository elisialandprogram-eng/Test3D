interface GameHUDProps {
  hoverCoord: { col: number; row: number } | null;
}

export function GameHUD({ hoverCoord }: GameHUDProps) {
  return (
    <>
      <div style={{
        position: "absolute", top: 16, left: 20,
        fontFamily: "'Cinzel', serif",
        color: "#F0E8C8",
        textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)",
        pointerEvents: "none",
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>⚔ ETERNAL KINGDOMS</div>
        <div style={{ fontSize: 11, color: "#B8A870", letterSpacing: 3, marginTop: 2 }}>REALM MAP — GENESIS CONTINENT</div>
      </div>

      <div style={{
        position: "absolute", bottom: 16, left: 20,
        background: "rgba(10,16,6,0.75)",
        border: "1px solid rgba(180,160,80,0.3)",
        borderRadius: 6,
        padding: "6px 12px",
        color: "#B8A870",
        fontFamily: "monospace",
        fontSize: 12,
        pointerEvents: "none",
      }}>
        {hoverCoord
          ? `Tile ${String.fromCharCode(65 + Math.floor(hoverCoord.col / 10))}${Math.floor(hoverCoord.row / 10) + 1}  (${hoverCoord.col}, ${hoverCoord.row})`
          : "Hover map to inspect"
        }
      </div>

      <div style={{
        position: "absolute", bottom: 16, right: 16,
        background: "rgba(10,16,6,0.75)",
        border: "1px solid rgba(180,160,80,0.2)",
        borderRadius: 6,
        padding: "6px 12px",
        color: "#705820",
        fontSize: 11,
        fontFamily: "sans-serif",
        pointerEvents: "none",
        lineHeight: 1.7,
      }}>
        Drag to pan &nbsp;·&nbsp; Scroll to zoom
      </div>
    </>
  );
}
