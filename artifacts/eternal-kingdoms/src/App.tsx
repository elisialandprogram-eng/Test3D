import { BabylonWorld } from "./scenes/BabylonWorld";
import { HUD } from "./components/HUD";
import { useState, useCallback } from "react";

export interface WorldState {
  coords: { x: number; z: number };
  selected: { name: string; type: string; level: number } | null;
}

function App() {
  const [worldState, setWorldState] = useState<WorldState>({
    coords: { x: 0, z: 0 },
    selected: null,
  });

  const handleStateChange = useCallback((updater: (prev: WorldState) => WorldState) => {
    setWorldState(updater);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <BabylonWorld onStateChange={handleStateChange} />
      <HUD
        coords={worldState.coords}
        selected={worldState.selected}
      />
    </div>
  );
}

export default App;
