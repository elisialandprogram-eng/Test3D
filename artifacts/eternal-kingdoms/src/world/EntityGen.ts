import { GRID_COLS, GRID_ROWS } from "../engine/IsoEngine";
import { TerrainType } from "./TerrainGen";

export type ResourceType = "WOOD" | "STONE" | "FOOD" | "GOLD" | "CRYSTAL";

export interface Kingdom {
  id: number;
  col: number;
  row: number;
  name: string;
  level: number;
  colorIdx: number;
}

export interface ResourceNode {
  id: number;
  col: number;
  row: number;
  type: ResourceType;
  level: number;
}

export interface MonsterCamp {
  id: number;
  col: number;
  row: number;
  level: number;
}

export interface WorldEntities {
  kingdoms: Kingdom[];
  resources: ResourceNode[];
  monsters: MonsterCamp[];
  entityMap: Map<string, "kingdom" | "resource" | "monster">;
  entityIndex: Map<string, Kingdom | ResourceNode | MonsterCamp>;
}

const KINGDOM_NAMES = [
  "Ironhold","Silverfall","Thorngate","Ashenvale","Brightmoor","Stormwatch",
  "Goldspire","Frostkeep","Embercrest","Shadowfen","Dawnridge","Copperwall",
  "Ravenhold","Oakhaven","Starfall","Grimwick","Brightholm","Thistlemere",
  "Aldgate","Stonemark","Verdancourt","Ironveil","Greyspire","Leafwall",
  "Brightcross","Darkmoor","Silverthorn","Ashridge","Goldmere","Frostwall",
  "Highwatch","Ironwood","Sunvale","Blackstone","Greymount","Willowhaven",
  "Coppergate","Thornwall","Starkeep","Dawnmark","Emberfall","Shadowcrest",
  "Ironcliff","Brightfen","Stormridge","Goldwall","Frostmere","Duskwatch",
  "Ravenmark","Oakgate","Crystalholm","Windfall","Ironmere","Silvervale",
  "Thornwood","Ashgate","Brightridge","Starwall","Grimfen","Coppercrest",
  "Dawnwood","Embermoor","Shadowmark","Irondawn","Greyveil","Leafgate",
  "Brightwall","Darkridge","Silvergate","Ashwood","Goldcrest","Frostridge",
  "Highgate","Ironfen","Sunmark","Blackmere","Greywall","Willowcrest",
  "Copperwood","Thornmere","Starmore","Dawncrest","Embergate","Shadowwall",
  "Ironmark","Brightgate","Stormmoor","Goldridge","Frostgate","Duskfall",
  "Ravenveil","Oakridge","Crystalgate","Windmore","Ironsun","Silverblade",
  "Thornbrook","Ashcroft","Duskhollow","Starfang","Grimvale","Copperfen",
  "Ironbastion","Silverspire","Thornhaven","Ashmere","Brightcliff","Stormfen",
  "Goldhaven","Frostcrest","Emberveil","Shadowridge","Dawnwall","Coppermark",
  "Ravencroft","Oakwall","Crystalmere","Windgate","Ironvale","Silvercrest",
  "Thornmark","Ashwall","Brightfen","Starveil","Grimgate","Coppercliff",
  "Dawncroft","Embercroft","Shadowgate","Irongate","Greycroft","Leafcrest",
  "Brightveil","Darkwall","Silvermere","Ashcrest","Goldgate","Frostcroft",
  "Highmark","Ironglen","Sunwall","Blackfen","Greycrest","Willowgate",
  "Coppercroft","Thorngate","Starcroft","Dawnglen","Embervale","Shadowcroft",
  "Ironspire","Brightmark","Stormcrest","Goldcroft","Frostmark","Duskridge",
  "Ravenglen","Oakmark","Crystalcroft","Windridge","Ironcleft","Silverwood",
];

function seededRnd(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

const TERRAIN_BLOCKED: Set<TerrainType> = new Set(["WATERFRONT", "MOUNTAIN"]);

export function generateEntities(terrain: TerrainType[][]): WorldEntities {
  const occupied = new Set<string>();
  const kingdoms: Kingdom[] = [];
  const resources: ResourceNode[] = [];
  const monsters: MonsterCamp[] = [];

  function key(col: number, row: number) { return `${col},${row}`; }
  function rnd(seed: number) { return seededRnd(seed); }
  function isFree(c: number, r: number) {
    if (c < 3 || r < 3 || c >= GRID_COLS - 3 || r >= GRID_ROWS - 3) return false;
    if (TERRAIN_BLOCKED.has(terrain[r][c])) return false;
    return !occupied.has(key(c, r));
  }

  let sid = 1;

  // --- Kingdoms (400 total for 256×256 map) ---
  const MIN_KINGDOM_DIST = 7;
  let kidAttempts = 0;
  while (kingdoms.length < 400 && kidAttempts < 80000) {
    kidAttempts++;
    const col = 4 + Math.floor(rnd(sid++) * (GRID_COLS - 8));
    const row = 4 + Math.floor(rnd(sid++) * (GRID_ROWS - 8));
    if (!isFree(col, row)) continue;
    const tooClose = kingdoms.some(k =>
      Math.abs(k.col - col) < MIN_KINGDOM_DIST && Math.abs(k.row - row) < MIN_KINGDOM_DIST
    );
    if (tooClose) continue;
    occupied.add(key(col, row));
    kingdoms.push({
      id: kingdoms.length,
      col, row,
      name: KINGDOM_NAMES[kingdoms.length % KINGDOM_NAMES.length],
      level: 1 + Math.floor(rnd(sid++) * 25),
      colorIdx: Math.floor(rnd(sid++) * 8),
    });
  }

  // --- Resource nodes (~1500 total) ---
  const RESOURCE_DIST: Record<ResourceType, number> = {
    WOOD: 2, STONE: 3, FOOD: 2, GOLD: 4, CRYSTAL: 5,
  };
  const RESOURCE_COUNTS: [ResourceType, number][] = [
    ["WOOD", 420], ["STONE", 340], ["FOOD", 310], ["GOLD", 250], ["CRYSTAL", 180],
  ];

  for (const [type, count] of RESOURCE_COUNTS) {
    let attempts = 0;
    let placed = 0;
    const minDist = RESOURCE_DIST[type];
    while (placed < count && attempts < count * 40) {
      attempts++;
      const col = 2 + Math.floor(rnd(sid++) * (GRID_COLS - 4));
      const row = 2 + Math.floor(rnd(sid++) * (GRID_ROWS - 4));
      if (!isFree(col, row)) continue;
      const sameType = resources.filter(r => r.type === type);
      const tooClose = sameType.some(r =>
        Math.abs(r.col - col) < minDist && Math.abs(r.row - row) < minDist
      );
      if (tooClose) continue;
      occupied.add(key(col, row));
      resources.push({
        id: resources.length,
        col, row, type,
        level: 1 + Math.floor(rnd(sid++) * 8),
      });
      placed++;
    }
  }

  // --- Monster camps (~500 total) ---
  let mattempts = 0;
  while (monsters.length < 500 && mattempts < 60000) {
    mattempts++;
    const col = 3 + Math.floor(rnd(sid++) * (GRID_COLS - 6));
    const row = 3 + Math.floor(rnd(sid++) * (GRID_ROWS - 6));
    if (!isFree(col, row)) continue;
    const tooClose = monsters.some(m =>
      Math.abs(m.col - col) < 3 && Math.abs(m.row - row) < 3
    );
    if (tooClose) continue;
    occupied.add(key(col, row));
    monsters.push({
      id: monsters.length,
      col, row,
      level: 1 + Math.floor(rnd(sid++) * 10),
    });
  }

  // Build lookup maps
  const entityMap = new Map<string, "kingdom" | "resource" | "monster">();
  const entityIndex = new Map<string, Kingdom | ResourceNode | MonsterCamp>();
  for (const k of kingdoms) {
    const k2 = key(k.col, k.row);
    entityMap.set(k2, "kingdom");
    entityIndex.set(k2, k);
  }
  for (const r of resources) {
    const k2 = key(r.col, r.row);
    entityMap.set(k2, "resource");
    entityIndex.set(k2, r);
  }
  for (const m of monsters) {
    const k2 = key(m.col, m.row);
    entityMap.set(k2, "monster");
    entityIndex.set(k2, m);
  }

  return { kingdoms, resources, monsters, entityMap, entityIndex };
}
