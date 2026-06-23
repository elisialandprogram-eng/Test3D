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
    if (c < 2 || r < 2 || c >= GRID_COLS - 2 || r >= GRID_ROWS - 2) return false;
    if (TERRAIN_BLOCKED.has(terrain[r][c])) return false;
    return !occupied.has(key(c, r));
  }

  let sid = 1;

  // --- Kingdoms (100 total) ---
  const MIN_KINGDOM_DIST = 5;
  let kidAttempts = 0;
  while (kingdoms.length < 100 && kidAttempts < 20000) {
    kidAttempts++;
    const col = 2 + Math.floor(rnd(sid++) * (GRID_COLS - 4));
    const row = 2 + Math.floor(rnd(sid++) * (GRID_ROWS - 4));
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
      level: 1 + Math.floor(rnd(sid++) * 20),
      colorIdx: Math.floor(rnd(sid++) * 8),
    });
  }

  // --- Resource nodes ---
  const RESOURCE_DIST: Record<ResourceType, number> = { WOOD: 3, STONE: 3, FOOD: 3, GOLD: 4, CRYSTAL: 5 };
  const RESOURCE_COUNTS: [ResourceType, number][] = [
    ["WOOD", 100], ["STONE", 80], ["FOOD", 75], ["GOLD", 55], ["CRYSTAL", 35],
  ];

  for (const [type, count] of RESOURCE_COUNTS) {
    let attempts = 0;
    let placed = 0;
    const minDist = RESOURCE_DIST[type];
    while (placed < count && attempts < count * 60) {
      attempts++;
      const col = 1 + Math.floor(rnd(sid++) * (GRID_COLS - 2));
      const row = 1 + Math.floor(rnd(sid++) * (GRID_ROWS - 2));
      if (!isFree(col, row)) continue;
      const tooClose = resources
        .filter(r => r.type === type)
        .some(r => Math.abs(r.col - col) < minDist && Math.abs(r.row - row) < minDist);
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

  // --- Monster camps ---
  let mattempts = 0;
  while (monsters.length < 120 && mattempts < 15000) {
    mattempts++;
    const col = 2 + Math.floor(rnd(sid++) * (GRID_COLS - 4));
    const row = 2 + Math.floor(rnd(sid++) * (GRID_ROWS - 4));
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
  for (const k of kingdoms) { entityMap.set(key(k.col, k.row), "kingdom"); entityIndex.set(key(k.col, k.row), k); }
  for (const r of resources) { entityMap.set(key(r.col, r.row), "resource"); entityIndex.set(key(r.col, r.row), r); }
  for (const m of monsters) { entityMap.set(key(m.col, m.row), "monster"); entityIndex.set(key(m.col, m.row), m); }

  return { kingdoms, resources, monsters, entityMap, entityIndex };
}
