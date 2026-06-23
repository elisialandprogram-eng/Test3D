import { useState, useCallback, useRef } from "react";
import { BabylonWorld, WorldStateUpdate, CameraControls } from "./scenes/BabylonWorld";
import { HUD } from "./components/HUD";
import type { ViewMode } from "./engine/CameraEngine";
import { WORLD_CENTER } from "./engine/CoordinateEngine";

const INITIAL_STATE: WorldStateUpdate = {
  coord: { x: WORLD_CENTER.x, y: WORLD_CENTER.y },
  zone: "D4",
  viewMode: "FIELD",
  selected: null,
  cameraTarget: { x: WORLD_CENTER.x, z: WORLD_CENTER.y },
  cameraRadius: 250,
};

export default function App() {
  const [worldState, setWorldState] = useState<WorldStateUpdate>(INITIAL_STATE);
  const cameraRef = useRef<CameraControls | null>(null);

  const handleStateChange = useCallback(
    (updater: (prev: WorldStateUpdate) => WorldStateUpdate) => {
      setWorldState(updater);
    },
    []
  );

  const handleCameraReady = useCallback((controls: CameraControls) => {
    cameraRef.current = controls;
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    const cam = cameraRef.current;
    if (!cam) return;

    cam.setViewMode(mode);

    // If switching to KINGDOM view and a kingdom is selected, fly to it
    if (mode === "KINGDOM") {
      setWorldState((prev) => {
        const sel = prev.selected;
        if (sel?.entityType === "kingdom" && sel.coord) {
          cam.flyTo(sel.coord.x, sel.coord.y, 180);
        }
        return { ...prev, viewMode: mode };
      });
    }
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#000" }}>
      <BabylonWorld
        onStateChange={handleStateChange}
        onCameraReady={handleCameraReady}
      />
      <HUD state={worldState} onViewModeChange={handleViewModeChange} />
    </div>
  );
}
