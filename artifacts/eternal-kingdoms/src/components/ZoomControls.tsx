import type { CSSProperties } from "react";

interface ZoomControlsProps {
  onZoomIn:    () => void;
  onZoomOut:   () => void;
  onWorldView: () => void;
  onAreaView:  () => void;
}

const BTN: CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 40, height: 40,
  background: "rgba(10,14,20,0.82)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 7,
  color: "#e2e8f0",
  fontSize: 18,
  cursor: "pointer",
  backdropFilter: "blur(8px)",
  userSelect: "none",
  flexShrink: 0,
};

const WIDE_BTN: CSSProperties = {
  ...BTN,
  width: "auto",
  padding: "0 12px",
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.03em",
  whiteSpace: "nowrap",
};

export function ZoomControls({ onZoomIn, onZoomOut, onWorldView, onAreaView }: ZoomControlsProps) {
  return (
    <div style={{
      position: "fixed",
      right: 16,
      bottom: 56,
      display: "flex",
      flexDirection: "column",
      gap: 7,
      zIndex: 100,
    }}>
      <button style={WIDE_BTN} onClick={onWorldView} title="See full world">
        🌍 <span>World View</span>
      </button>
      <button style={WIDE_BTN} onClick={onAreaView} title="Zoom to current area">
        📍 <span>My Area</span>
      </button>
      <div style={{ height: 2 }} />
      <button style={BTN} onClick={onZoomIn}  title="Zoom in">＋</button>
      <button style={BTN} onClick={onZoomOut} title="Zoom out">－</button>
    </div>
  );
}
