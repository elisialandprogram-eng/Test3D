import { useState } from "react";
import type { HoverInfo } from "../scenes/WorldMap";

interface Props {
  hoverInfo: HoverInfo | null;
}

export function DebugOverlay({ hoverInfo }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setVisible(v => !v)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 200,
          background: visible ? "#3B82F6" : "rgba(0,0,0,0.55)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 6,
          padding: "5px 12px",
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "monospace",
          backdropFilter: "blur(6px)",
        }}
      >
        {visible ? "◉ Coords ON" : "◎ Coords"}
      </button>

      {/* Info panel */}
      {visible && (
        <div
          style={{
            position: "fixed",
            bottom: 50,
            right: 16,
            zIndex: 200,
            background: "rgba(0,0,0,0.72)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "10px 14px",
            fontFamily: "monospace",
            fontSize: 12,
            color: "#e2e8f0",
            lineHeight: 1.7,
            minWidth: 200,
            backdropFilter: "blur(8px)",
          }}
        >
          {hoverInfo ? (
            <>
              <Row label="X" value={hoverInfo.x} />
              <Row label="Y" value={hoverInfo.y} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", margin: "6px 0" }} />
              <Row label="Zone" value={hoverInfo.zoneId} color="#93C5FD" />
              <Row label="Land" value={hoverInfo.landId} color="#86EFAC" />
            </>
          ) : (
            <span style={{ color: "#64748b" }}>Hover over map…</span>
          )}
        </div>
      )}
    </>
  );
}

function Row({ label, value, color = "#f8fafc" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <span style={{ color: "#94a3b8" }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
