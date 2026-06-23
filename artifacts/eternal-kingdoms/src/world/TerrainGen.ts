export type TerrainType = "PLAIN" | "FOREST";

function noise(col: number, row: number): number {
  return (
    Math.sin(col * 0.07 + row * 0.05 + 0.5) * 0.30 +
    Math.sin(col * 0.13 + row * 0.11 + 2.3) * 0.25 +
    Math.sin(col * 0.04 + row * 0.19 + 4.1) * 0.22 +
    Math.sin(col * 0.23 + row * 0.06 + 6.7) * 0.13 +
    Math.sin(col * 0.33 + row * 0.27 + 1.5) * 0.10
  ) * 0.5 + 0.5;
}

function noise2(col: number, row: number): number {
  return (
    Math.sin(col * 0.11 + row * 0.08 + 3.7) * 0.40 +
    Math.sin(col * 0.07 + row * 0.15 + 1.2) * 0.35 +
    Math.sin(col * 0.19 + row * 0.04 + 5.4) * 0.25
  ) * 0.5 + 0.5;
}

export function generateTerrain(cols: number, rows: number): TerrainType[][] {
  const terrain: TerrainType[][] = [];
  for (let row = 0; row < rows; row++) {
    terrain[row] = [];
    for (let col = 0; col < cols; col++) {
      const n  = noise(col, row);
      const n2 = noise2(col, row);
      const isForest = (n < 0.40 && n2 < 0.60) || (n2 > 0.70 && n < 0.55);
      terrain[row][col] = isForest ? "FOREST" : "PLAIN";
    }
  }
  return terrain;
}

export type { TerrainType as default };
