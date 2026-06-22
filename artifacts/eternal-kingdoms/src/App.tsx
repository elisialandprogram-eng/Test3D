import { BabylonWorld } from "./scenes/BabylonWorld";
import { HUD } from "./components/HUD";
import { useState, useCallback } from "react";

export interface WorldState {
  coords: { x: number; z: number };
  selected: { name: string; type: string; level: number } | null;
  zoom: number;
}

function App() {
  const [worldState, setWorldState] = useState<WorldState>({
    coords: { x: 0, z: 0 },
    selected: null,
    zoom: 75,
  });

  const handleStateChange = useCallback((updater: (prev: WorldState) => WorldState) => {
    setWorldState(updater);
  }, []);

  const onZoomIn = useCallback(() => {
    window.dispatchEvent(new CustomEvent("ek-zoom", { detail: { delta: -10 } }));
  }, []);

  const onZoomOut = useCallback(() => {
    window.dispatchEvent(new CustomEvent("ek-zoom", { detail: { delta: 10 } }));
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <BabylonWorld onStateChange={handleStateChange} />
      <HUD
        coords={worldState.coords}
        selected={worldState.selected}
        zoom={worldState.zoom}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
    </div>
  );
}

export default App;
