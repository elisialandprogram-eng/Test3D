import { Crown, Swords, Trees, Gem, Wheat, Mountain, Skull } from "lucide-react";
import type { IsoSelection } from "../scenes/IsoWorld";
import type { Kingdom, ResourceNode, MonsterCamp } from "../world/EntityGen";

interface GameHUDProps {
  selection: IsoSelection | null;
  hoverCoord: { col: number; row: number } | null;
}

const BANNER_COLORS = [
  "#C8302A","#2050C8","#20A030","#C89020","#882098","#20A0B0","#C84080","#606060",
];

const RESOURCE_ICONS: Record<string, typeof Crown> = {
  WOOD: Trees,
  STONE: Mountain,
  FOOD: Wheat,
  GOLD: Gem,
  CRYSTAL: Gem,
};

const RESOURCE_LABELS: Record<string, string> = {
  WOOD: "Timberland", STONE: "Quarry", FOOD: "Farmland",
  GOLD: "Gold Mine", CRYSTAL: "Crystal Vein",
};

export function GameHUD({ selection, hoverCoord }: GameHUDProps) {
  return (
    <>
      {/* Top-left title */}
      <div style={{
        position: "absolute", top: 16, left: 20,
        fontFamily: "'Cinzel', serif",
        color: "#F0E8C8",
        textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.6)",
        pointerEvents: "none",
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>⚔ ETERNAL KINGDOMS</div>
        <div style={{ fontSize: 11, color: "#B8A870", letterSpacing: 3, marginTop: 2 }}>REALM MAP — GENESIS CONTINENT</div>
      </div>

      {/* Bottom-left coords */}
      <div style={{
        position: "absolute", bottom: 16, left: 20,
        background: "rgba(10,16,6,0.75)",
        border: "1px solid rgba(180,160,80,0.3)",
        borderRadius: 6,
        padding: "6px 12px",
        color: "#B8A870",
        fontFamily: "monospace",
        fontSize: 12,
        pointerEvents: "none",
      }}>
        {hoverCoord
          ? `Tile ${String.fromCharCode(65 + Math.floor(hoverCoord.col / 10))}${Math.floor(hoverCoord.row / 10) + 1}  (${hoverCoord.col}, ${hoverCoord.row})`
          : "Hover map to inspect"
        }
      </div>

      {/* Top-right legend */}
      <div style={{
        position: "absolute", top: 16, right: 16,
        background: "rgba(10,16,6,0.75)",
        border: "1px solid rgba(180,160,80,0.25)",
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 5,
        fontSize: 11,
        fontFamily: "sans-serif",
        color: "#C8B888",
        pointerEvents: "none",
        minWidth: 120,
      }}>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "#A08840", marginBottom: 3, fontFamily: "'Cinzel', serif" }}>TERRAIN</div>
        {[
          { color: "#78C040", label: "Plain" },
          { color: "#3A6818", label: "Forest" },
          { color: "#90AA40", label: "Hill" },
          { color: "#9C8A78", label: "Mountain" },
          { color: "#B4CC44", label: "Agricultural" },
          { color: "#4890D8", label: "Waterfront" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, background: color, borderRadius: 2, border: "1px solid rgba(255,255,255,0.15)" }} />
            <span>{label}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid rgba(180,160,80,0.2)", margin: "4px 0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Crown size={11} color="#F0C030" /><span>Kingdom</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Trees size={11} color="#4A8820" /><span>Resource</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Skull size={11} color="#A82020" /><span>Monster Camp</span>
        </div>
      </div>

      {/* Selection info panel */}
      {selection && (
        <SelectionPanel selection={selection} />
      )}

      {/* Controls hint */}
      <div style={{
        position: "absolute", bottom: 16, right: 16,
        background: "rgba(10,16,6,0.75)",
        border: "1px solid rgba(180,160,80,0.2)",
        borderRadius: 6,
        padding: "6px 12px",
        color: "#705820",
        fontSize: 11,
        fontFamily: "sans-serif",
        pointerEvents: "none",
        lineHeight: 1.7,
      }}>
        Drag to pan &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Click to select
      </div>
    </>
  );
}

function SelectionPanel({ selection }: { selection: IsoSelection }) {
  const { type, entity } = selection;

  return (
    <div style={{
      position: "absolute",
      bottom: 60,
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(8,14,4,0.92)",
      border: "1px solid rgba(200,170,80,0.5)",
      borderRadius: 10,
      padding: "16px 24px",
      minWidth: 260,
      maxWidth: 360,
      fontFamily: "sans-serif",
      boxShadow: "0 4px 32px rgba(0,0,0,0.7)",
    }}>
      {type === "kingdom" && <KingdomPanel k={entity as Kingdom} />}
      {type === "resource" && <ResourcePanel r={entity as ResourceNode} />}
      {type === "monster" && <MonsterPanel m={entity as MonsterCamp} />}
    </div>
  );
}

function KingdomPanel({ k }: { k: Kingdom }) {
  const banner = BANNER_COLORS[k.colorIdx % 8];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Crown size={18} color={banner} />
        <div>
          <div style={{ color: "#F0E8C8", fontWeight: 700, fontSize: 15, fontFamily: "'Cinzel', serif" }}>{k.name}</div>
          <div style={{ color: "#A89058", fontSize: 11 }}>Kingdom</div>
        </div>
        <div style={{
          marginLeft: "auto", background: banner, borderRadius: 20,
          padding: "2px 10px", color: "#FFF", fontWeight: 700, fontSize: 12,
        }}>Lv {k.level}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          ["Location", `(${k.col}, ${k.row})`],
          ["Power", `${(k.level * 1847 + 3200).toLocaleString()}`],
          ["Alliance", "—"],
          ["Troops", `${(k.level * 420).toLocaleString()}`],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "6px 10px" }}>
            <div style={{ color: "#807050", fontSize: 10, marginBottom: 2 }}>{label}</div>
            <div style={{ color: "#D8C890", fontSize: 13, fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcePanel({ r }: { r: ResourceNode }) {
  const Icon = RESOURCE_ICONS[r.type] ?? Gem;
  const colors: Record<string, string> = {
    WOOD: "#4A8820", STONE: "#808878", FOOD: "#D0B820", GOLD: "#E8C020", CRYSTAL: "#8040D0",
  };
  const col = colors[r.type];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Icon size={18} color={col} />
        <div>
          <div style={{ color: "#F0E8C8", fontWeight: 700, fontSize: 15, fontFamily: "'Cinzel', serif" }}>{RESOURCE_LABELS[r.type]}</div>
          <div style={{ color: "#A89058", fontSize: 11 }}>Resource Node</div>
        </div>
        <div style={{
          marginLeft: "auto", background: col, borderRadius: 20,
          padding: "2px 10px", color: "#FFF", fontWeight: 700, fontSize: 12,
        }}>Lv {r.level}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          ["Type", r.type],
          ["Location", `(${r.col}, ${r.row})`],
          ["Output", `${r.level * 120}/hr`],
          ["Capacity", `${r.level * 3000}`],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "6px 10px" }}>
            <div style={{ color: "#807050", fontSize: 10, marginBottom: 2 }}>{label}</div>
            <div style={{ color: "#D8C890", fontSize: 13, fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonsterPanel({ m }: { m: MonsterCamp }) {
  const lvlColors = [
    "#2AAA30","#40B840","#90CC20","#D0C020","#E08820",
    "#E06020","#D03818","#A81818","#800080","#400040",
  ];
  const col = lvlColors[Math.min(m.level - 1, 9)];
  const labels = ["Goblin", "Orc", "Troll", "Ogre", "Wyvern", "Dragon", "Lich", "Demon", "Ancient", "Elder God"];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Skull size={18} color={col} />
        <div>
          <div style={{ color: "#F0E8C8", fontWeight: 700, fontSize: 15, fontFamily: "'Cinzel', serif" }}>{labels[Math.min(m.level - 1, 9)]} Camp</div>
          <div style={{ color: "#A89058", fontSize: 11 }}>Monster Camp</div>
        </div>
        <div style={{
          marginLeft: "auto", background: col, borderRadius: 20,
          padding: "2px 10px", color: "#FFF", fontWeight: 700, fontSize: 12,
        }}>Lv {m.level}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          ["Danger", "⚠".repeat(Math.min(m.level, 5))],
          ["Location", `(${m.col}, ${m.row})`],
          ["Rewards", `${m.level * 80} crystals`],
          ["Min. Power", `${m.level * 5000}`],
        ].map(([label, val]) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "6px 10px" }}>
            <div style={{ color: "#807050", fontSize: 10, marginBottom: 2 }}>{label}</div>
            <div style={{ color: "#D8C890", fontSize: 13, fontWeight: 600 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
