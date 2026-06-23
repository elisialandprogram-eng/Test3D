import { useState, useRef, useCallback } from "react";
import { WorldMap, type HoverInfo, type WorldMapHandle } from "./scenes/WorldMap";
import { DebugOverlay } from "./components/DebugOverlay";
import { AdminMapEditor } from "./editor/AdminMapEditor";
import { useMapEditor } from "./editor/useMapEditor";
import type { PlacedAsset } from "./editor/types";

export default function App() {
  const [hoverInfo, setHoverInfo]   = useState<HoverInfo | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const worldMapRef = useRef<WorldMapHandle>(null);
  const editorState = useMapEditor();

  const handleTerrainClick = useCallback(
    async (wx: number, wy: number) => {
      if (!editorOpen || !editorState.activeAssetId) return;
      const placed = editorState.placeAtCoord(wx, wy);
      if (placed) {
        await worldMapRef.current?.placeAsset(placed, editorState.libraryMap);
      }
    },
    [editorOpen, editorState],
  );

  const handleAssetSelect = useCallback(
    (id: string | null) => editorState.setSelectedPlacedId(id),
    [editorState],
  );

  const handleUpdatePlaced = useCallback(
    (id: string, patch: Partial<PlacedAsset>) => {
      const updated = editorState.updatePlaced(id, patch);
      if (updated) worldMapRef.current?.updateAsset(updated);
    },
    [editorState],
  );

  const handleDelete = useCallback(
    (id: string) => {
      editorState.deletePlaced(id);
      worldMapRef.current?.removeAsset(id);
    },
    [editorState],
  );

  const handleClearAll = useCallback(() => {
    editorState.clearAllPlaced();
    worldMapRef.current?.clearAll();
  }, [editorState]);

  const handleLoadMap = useCallback(
    (json: string) => {
      const loaded = editorState.loadMap(json);
      worldMapRef.current?.loadAll(loaded, editorState.libraryMap);
    },
    [editorState],
  );

  const patchedState = {
    ...editorState,
    updatePlaced: handleUpdatePlaced,
    deletePlaced: handleDelete,
    clearAllPlaced: handleClearAll,
    loadMap: handleLoadMap,
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0f121a" }}>
      <WorldMap
        ref={worldMapRef}
        onHover={setHoverInfo}
        editorMode={editorOpen}
        selectedAssetId={editorState.selectedPlacedId}
        onTerrainClick={handleTerrainClick}
        onAssetSelect={handleAssetSelect}
      />

      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: editorOpen ? 280 : 0,
        height: 44, background: "rgba(0,0,0,0.6)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", padding: "0 16px", gap: 10,
        backdropFilter: "blur(10px)", zIndex: 100,
      }}>
        <span style={{ color: "#F59E0B", fontWeight: 800, fontSize: 15, letterSpacing: "0.04em" }}>
          ⚔ ETERNAL KINGDOMS
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>|</span>
        <span style={{ color: "#64748b", fontSize: 12 }}>World Map · 2048 × 2048</span>
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setEditorOpen(o => !o)}
            style={{
              background: editorOpen ? "#F59E0B" : "rgba(245,158,11,0.15)",
              color: editorOpen ? "#000" : "#F59E0B",
              border: "1px solid rgba(245,158,11,0.4)",
              borderRadius: 6, padding: "4px 14px",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >
            {editorOpen ? "✕ Close Editor" : "⚙ Map Editor"}
          </button>
        </div>
      </div>

      {editorOpen && (
        <AdminMapEditor state={patchedState} onClose={() => setEditorOpen(false)} />
      )}

      <DebugOverlay hoverInfo={hoverInfo} />
    </div>
  );
}
