export type TerrainType = "PLAIN" | "FOREST" | "HILL" | "MOUNTAIN" | "AGRICULTURAL" | "WATERFRONT";

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
      const n = noise(col, row);
      const n2 = noise2(col, row);
      const distEdge = Math.min(col, row, cols - 1 - col, rows - 1 - row) / (Math.min(cols, rows) * 0.18);
      const edgeBias = Math.max(0, 1 - distEdge);

      let t: TerrainType;
      const elevated = n + edgeBias * 0.3;

      if (elevated > 0.80) t = "MOUNTAIN";
      else if (elevated > 0.67) t = "HILL";
      else if (n < 0.28 && n2 < 0.45) t = "WATERFRONT";
      else if (n < 0.44 && n2 > 0.56) t = "FOREST";
      else if (n2 > 0.74 && n > 0.42 && n < 0.68) t = "AGRICULTURAL";
      else t = "PLAIN";

      terrain[row][col] = t;
    }
  }

  // Smooth isolated WATERFRONT tiles
  for (let row = 1; row < rows - 1; row++) {
    for (let col = 1; col < cols - 1; col++) {
      if (terrain[row][col] === "WATERFRONT") {
        const nb = [
          terrain[row - 1][col], terrain[row + 1][col],
          terrain[row][col - 1], terrain[row][col + 1],
        ];
        if (nb.filter(x => x === "WATERFRONT").length === 0) {
          terrain[row][col] = "PLAIN";
        }
      }
    }
  }

  return terrain;
}

export type { TerrainType as default };
