import { useRef, ChangeEvent } from "react";
import type { PlacedAsset, LayerName } from "./types";
import { LAYERS } from "./types";
import type { useMapEditor } from "./useMapEditor";

type EditorState = ReturnType<typeof useMapEditor>;

interface Props {
  state: EditorState;
  onClose: () => void;
}

export function AdminMapEditor({ state, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    library,
    placedAssets,
    selectedAsset,
    selectedPlacedId,
    activeAssetId,
    activeLayer,
    setActiveAssetId,
    setActiveLayer,
    setSelectedPlacedId,
    uploadAsset,
    removeFromLibrary,
    updatePlaced,
    deletePlaced,
    clearAllPlaced,
    saveMap,
    loadMap,
  } = state;

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(f => {
      if (f.type === "image/png" || f.type === "image/webp") uploadAsset(f);
    });
    e.target.value = "";
  }

  function handleLoadFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const json = ev.target?.result as string;
      loadMap(json);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const loadFileRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 280,
      background: "rgba(15,20,30,0.95)",
      borderLeft: "1px solid rgba(255,255,255,0.1)",
      display: "flex", flexDirection: "column",
      zIndex: 300, fontFamily: "system-ui, sans-serif",
      color: "#e2e8f0", fontSize: 13,
      backdropFilter: "blur(12px)",
    }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#F59E0B" }}>⚙ Admin Map Editor</span>
        <button onClick={onClose} style={btnStyle("rgba(255,255,255,0.08)")}>✕</button>
      </div>

      <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>

        {/* ── Layer selector ──────────────────────────────────────── */}
        <Section title="Active Layer">
          <select
            value={activeLayer}
            onChange={e => setActiveLayer(e.target.value as LayerName)}
            style={selectStyle}
          >
            {LAYERS.map(l => (
              <option key={l} value={l}>{l.replace("_", " ")}</option>
            ))}
          </select>
        </Section>

        {/* ── Asset Library ───────────────────────────────────────── */}
        <Section title="Asset Library">
          <input
            ref={fileInputRef}
            type="file" accept="image/png,image/webp"
            multiple style={{ display: "none" }}
            onChange={handleFiles}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={btnStyle("#3B82F6", { width: "100%", marginBottom: 8 })}
          >
            ＋ Upload PNG / WEBP
          </button>

          {library.length === 0 ? (
            <div style={{ color: "#475569", textAlign: "center", padding: "12px 0", fontSize: 12 }}>
              No assets uploaded yet
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {library.map(a => (
                <div
                  key={a.id}
                  onClick={() => setActiveAssetId(activeAssetId === a.id ? null : a.id)}
                  style={{
                    border: `2px solid ${activeAssetId === a.id ? "#F59E0B" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 6, padding: 4, cursor: "pointer", position: "relative",
                    background: activeAssetId === a.id ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.03)",
                  }}
                >
                  <img
                    src={a.dataUrl}
                    alt={a.name}
                    style={{ width: "100%", height: 60, objectFit: "contain", display: "block", borderRadius: 3 }}
                  />
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeFromLibrary(a.id); }}
                    style={{
                      position: "absolute", top: 2, right: 2,
                      background: "rgba(239,68,68,0.85)", border: "none",
                      color: "#fff", borderRadius: 3, fontSize: 9, padding: "1px 4px", cursor: "pointer",
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {activeAssetId && (
            <div style={{
              marginTop: 8, padding: "6px 10px", background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.3)", borderRadius: 6, fontSize: 11, color: "#FCD34D",
            }}>
              ✦ Asset selected — click terrain to place
            </div>
          )}
        </Section>

        {/* ── Placed assets list ──────────────────────────────────── */}
        <Section title={`Placed Assets (${placedAssets.length})`}>
          {placedAssets.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: "8px 0" }}>
              No assets placed yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 160, overflowY: "auto" }}>
              {placedAssets.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlacedId(selectedPlacedId === p.id ? null : p.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "4px 8px", borderRadius: 5, cursor: "pointer",
                    background: selectedPlacedId === p.id ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedPlacedId === p.id ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    {state.library.find(a => a.id === p.assetId)?.name ?? p.assetId} @ ({p.x},{p.y})
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deletePlaced(p.id); }}
                    style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 12, padding: "0 2px" }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          {placedAssets.length > 0 && (
            <button
              onClick={() => { if (confirm("Clear all placed assets?")) clearAllPlaced(); }}
              style={btnStyle("rgba(239,68,68,0.25)", { width: "100%", marginTop: 6, color: "#FCA5A5" })}
            >
              Clear All
            </button>
          )}
        </Section>

        {/* ── Properties ──────────────────────────────────────────── */}
        {selectedAsset && (
          <Section title="Properties">
            <PropRow label="Asset">{state.library.find(a => a.id === selectedAsset.assetId)?.name ?? "—"}</PropRow>
            <PropRow label="X">
              <NumInput
                value={selectedAsset.x}
                onChange={v => updatePlaced(selectedAsset.id, { x: v })}
                min={0} max={2047}
              />
            </PropRow>
            <PropRow label="Y">
              <NumInput
                value={selectedAsset.y}
                onChange={v => updatePlaced(selectedAsset.id, { y: v })}
                min={0} max={2047}
              />
            </PropRow>
            <PropRow label="Rotation">
              <NumInput
                value={selectedAsset.rotation}
                onChange={v => updatePlaced(selectedAsset.id, { rotation: v })}
                min={0} max={360} step={5}
              />
            </PropRow>
            <PropRow label="Scale">
              <NumInput
                value={selectedAsset.scale}
                onChange={v => updatePlaced(selectedAsset.id, { scale: Math.max(0.1, v) })}
                min={0.1} max={10} step={0.1}
              />
            </PropRow>
            <PropRow label="Layer">
              <select
                value={selectedAsset.layer}
                onChange={e => updatePlaced(selectedAsset.id, { layer: e.target.value as LayerName })}
                style={{ ...selectStyle, padding: "2px 4px", fontSize: 11 }}
              >
                {LAYERS.map(l => <option key={l} value={l}>{l.replace("_", " ")}</option>)}
              </select>
            </PropRow>
            <button
              onClick={() => deletePlaced(selectedAsset.id)}
              style={btnStyle("rgba(239,68,68,0.3)", { width: "100%", marginTop: 6, color: "#FCA5A5" })}
            >
              Delete Asset
            </button>
          </Section>
        )}
      </div>

      {/* ── Footer: Save / Load ─────────────────────────────────── */}
      <div style={{
        padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: 6,
      }}>
        <button onClick={saveMap} style={btnStyle("#10B981", { flex: 1 })}>💾 Save JSON</button>
        <button onClick={() => loadFileRef.current?.click()} style={btnStyle("#6366F1", { flex: 1 })}>📂 Load JSON</button>
        <input ref={loadFileRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleLoadFile} />
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{
        padding: "8px 14px 4px",
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        color: "#64748b", letterSpacing: "0.08em",
      }}>
        {title}
      </div>
      <div style={{ padding: "0 14px 12px" }}>{children}</div>
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
      <span style={{ color: "#64748b", fontSize: 11, minWidth: 60 }}>{label}</span>
      <span style={{ fontSize: 11, color: "#e2e8f0" }}>{children}</span>
    </div>
  );
}

function NumInput({
  value, onChange, min, max, step = 1,
}: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <input
      type="number" value={value} min={min} max={max} step={step}
      onChange={e => onChange(Number(e.target.value))}
      style={{
        width: 70, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 4, color: "#e2e8f0", padding: "2px 6px", fontSize: 11,
        outline: "none",
      }}
    />
  );
}

function btnStyle(bg: string, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", borderRadius: 6,
    padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600,
    ...extra,
  };
}

const selectStyle: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5,
  color: "#e2e8f0", padding: "5px 8px", fontSize: 12, outline: "none",
};
