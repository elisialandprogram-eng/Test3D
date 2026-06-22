import { useState, useCallback, useRef } from "react";
import { BabylonWorld, WorldStateUpdate } from "./scenes/BabylonWorld";
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
  const viewModeCallbackRef = useRef<((mode: ViewMode) => void) | null>(null);

  const handleStateChange = useCallback(
    (updater: (prev: WorldStateUpdate) => WorldStateUpdate) => {
      setWorldState(updater);
    },
    []
  );

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    viewModeCallbackRef.current?.(mode);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <BabylonWorld onStateChange={handleStateChange} />
      <HUD state={worldState} onViewModeChange={handleViewModeChange} />
    </div>
  );
}
