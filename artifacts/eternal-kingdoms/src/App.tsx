import { useState, useCallback } from "react";
import { IsoWorld, IsoSelection } from "./scenes/IsoWorld";
import { GameHUD } from "./components/GameHUD";

export default function App() {
  const [selection, setSelection] = useState<IsoSelection | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ col: number; row: number } | null>(null);

  const handleSelect = useCallback((sel: IsoSelection | null) => {
    setSelection(sel);
  }, []);

  const handleHover = useCallback((col: number, row: number) => {
    setHoverCoord({ col, row });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#1A2E0A" }}>
      <IsoWorld onSelect={handleSelect} onHover={handleHover} />
      <GameHUD selection={selection} hoverCoord={hoverCoord} />
    </div>
  );
}
