import { useState, useCallback } from "react";
import { IsoWorld } from "./scenes/IsoWorld";
import { GameHUD } from "./components/GameHUD";

export default function App() {
  const [hoverCoord, setHoverCoord] = useState<{ col: number; row: number } | null>(null);

  const handleHover = useCallback((col: number, row: number) => {
    setHoverCoord({ col, row });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#2A4A10" }}>
      <IsoWorld onHover={handleHover} />
      <GameHUD hoverCoord={hoverCoord} />
    </div>
  );
}
