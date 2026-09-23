import { Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTownStore } from "../lib/botSimulation";
import { distanceToRoad, islandRadius, locations, PLAZA_RADIUS, ROAD, seededRandom, TOWN_COLORS } from "../lib/townData";
import type { LocationKind } from "../lib/townTypes";
import { botObjectRefs } from "./BotResident3D";

/** The map is drawn in world units: SVG x = world x, SVG y = world z (north / the town hall is up). */
const VIEW = "-27.5 -21.5 55 44";
const VIEW_EXPANDED = "-29 -28 58 58";

const BUILDING_STYLE: Partial<Record<LocationKind, { fill: string; roof: string; round?: boolean }>> = {
  hall: { fill: TOWN_COLORS.cream, roof: TOWN_COLORS.slate },
  homes: { fill: TOWN_COLORS.peach, roof: TOWN_COLORS.brick },
  cafe: { fill: TOWN_COLORS.cream, roof: TOWN_COLORS.awningRed },
  grocer: { fill: TOWN_COLORS.cream, roof: TOWN_COLORS.awningGreen },
  busstop: { fill: "#dfe8f2", roof: TOWN_COLORS.slate },
  playground: { fill: "#e9cfa3", roof: "#d9b27d" },
  park: { fill: "#9fd07c", roof: "#7cbc5c" },
};

function coastlinePath() {
  const points: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const r = islandRadius(a);
    points.push(`${(r * Math.cos(a)).toFixed(2)},${(-r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

function mapTrees() {
  const random = seededRandom(4242);
  const trees: Array<{ x: number; z: number; r: number; shade: string }> = [];
  let guard = 0;
  while (trees.length < 90 && guard++ < 4000) {
    const a = random() * Math.PI * 2;
    const d = Math.sqrt(random()) * 28.5;
    const x = d * Math.cos(a);
    const z = -d * Math.sin(a);
    if (d > islandRadius(a) - 2.2) continue;
    if (Math.abs(distanceToRoad(x, z)) < ROAD.halfWidth + ROAD.sidewalk + 0.9) continue;
    if (Math.hypot(x, z) < PLAZA_RADIUS + 1.2) continue;
    const blocked = locations.some((loc) => loc.kind !== "plaza"
      && Math.abs(x - loc.position[0]) < loc.size[0] / 2 + 1.1
      && Math.abs(z - loc.position[2]) < loc.size[2] / 2 + 1.1);
    if (blocked) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.9)) continue;
    trees.push({ x, z, r: 0.8 + random() * 0.55, shade: TOWN_COLORS.leaf[Math.floor(random() * TOWN_COLORS.leaf.length)] ?? TOWN_COLORS.grassDark });
  }
  return trees;
}

export function TownMinimap() {
  const residents = useTownStore((s) => s.residents);
  const focus = useTownStore((s) => s.focusLocation);
  const select = useTownStore((s) => s.selectBot);
  const selected = useTownStore((s) => s.selectedBotId);
  const [expanded, setExpanded] = useState(false);
  const dots = useRef(new Map<string, SVGCircleElement>());
  const coast = useMemo(coastlinePath, []);
  const trees = useMemo(mapTrees, []);

  // Bot positions change every frame in the 3D scene — move the dots directly instead of re-rendering React.
  useEffect(() => {
    let frame = 0;
    let last = 0;
    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      if (t - last < 90) return;
      last = t;
      dots.current.forEach((dot, id) => {
        const object = botObjectRefs.get(id);
        if (!object) return;
        dot.setAttribute("cx", object.position.x.toFixed(2));
        dot.setAttribute("cy", object.position.z.toFixed(2));
      });
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const road = { x: ROAD.cx - ROAD.hx, y: ROAD.cz - ROAD.hz, w: ROAD.hx * 2, h: ROAD.hz * 2, r: ROAD.radius };

  return <section className={`hud-card minimap-card ${expanded ? "is-expanded" : ""}`} aria-label="Town map">
    <header className="minimap-header">
      <MapIcon size={20} strokeWidth={2} />
      <h2>Town Map</h2>
      <button className="minimap-expand" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Shrink map" : "Expand map"} aria-pressed={expanded}>
        {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>
    </header>
    <div className="minimap-frame">
      <svg viewBox={expanded ? VIEW_EXPANDED : VIEW} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrated map of Bot Town with live resident positions">
        <defs>
          <radialGradient id="map-sea" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#8ad7e6" />
            <stop offset="55%" stopColor="#5db4da" />
            <stop offset="100%" stopColor="#3f94c4" />
          </radialGradient>
        </defs>
        <rect x="-40" y="-40" width="80" height="80" fill="url(#map-sea)" />
        <path d={coast} fill="#b8ab98" transform="translate(0 0.9)" />
        <path d={coast} fill={TOWN_COLORS.grass} stroke="#f3e6c6" strokeWidth="0.7" />

        {trees.map((t, i) => <circle key={i} cx={t.x} cy={t.z} r={t.r} fill={t.shade} stroke="#4f8d3b" strokeWidth="0.18" />)}

        <rect x={road.x - ROAD.halfWidth - ROAD.sidewalk} y={road.y - ROAD.halfWidth - ROAD.sidewalk} width={road.w + (ROAD.halfWidth + ROAD.sidewalk) * 2} height={road.h + (ROAD.halfWidth + ROAD.sidewalk) * 2} rx={road.r + ROAD.halfWidth + ROAD.sidewalk} fill="none" stroke={TOWN_COLORS.sidewalk} strokeWidth="1.1" />
        <rect x={road.x} y={road.y} width={road.w} height={road.h} rx={road.r} fill="none" stroke="#7c828a" strokeWidth={ROAD.halfWidth * 2} />
        <rect x={road.x} y={road.y} width={road.w} height={road.h} rx={road.r} fill="none" stroke="#f4f1ea" strokeWidth="0.22" strokeDasharray="1.2 1.2" />

        {/* footpaths from the plaza */}
        <g stroke={TOWN_COLORS.cobble} strokeWidth="1.8" strokeLinecap="round" fill="none">
          <path d="M0 -6 L0 -9" />
          <path d="M-5 -4 L-9 -7" />
          <path d="M-6 3 L-11 4.5" />
          <path d="M5.5 3 L9 7 L12 13" />
          <path d="M6 -1.5 L9 -2.3" />
        </g>

        <circle cx="0" cy="0" r={PLAZA_RADIUS} fill={TOWN_COLORS.cobble} stroke={TOWN_COLORS.cobbleLine} strokeWidth="0.3" />
        <circle cx="0" cy="0" r={PLAZA_RADIUS - 2.2} fill="none" stroke={TOWN_COLORS.cobbleLine} strokeWidth="0.25" strokeDasharray="0.8 0.6" />
        <circle cx="0" cy="0" r="2.3" fill={TOWN_COLORS.stone} stroke="#cdbfa9" strokeWidth="0.3" />
        <circle cx="0" cy="0" r="1.6" fill={TOWN_COLORS.water} />
        <circle cx="0" cy="0" r="0.55" fill="#ffffff" />

        {locations.filter((loc) => loc.kind !== "plaza").map((loc) => {
          const style = BUILDING_STYLE[loc.kind];
          if (!style) return null;
          const [w, , d] = loc.size;
          const x = loc.position[0] - w / 2;
          const y = loc.position[2] - d / 2;
          return <g key={loc.id} className="map-place" role="button" tabIndex={0} aria-label={`Show ${loc.name}`}
            onClick={() => focus(loc.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focus(loc.id); } }}>
            <title>{loc.name}</title>
            <rect x={x} y={y + 0.5} width={w} height={d} rx="0.6" fill="rgba(60,50,40,0.22)" />
            <rect x={x} y={y} width={w} height={d} rx="0.6" fill={style.fill} stroke="#ffffff" strokeWidth="0.3" />
            {loc.kind === "playground" || loc.kind === "park"
              ? <rect x={x + 0.9} y={y + 0.9} width={w - 1.8} height={d - 1.8} rx="0.5" fill={style.roof} opacity="0.55" />
              : <rect x={x + 0.35} y={y + 0.35} width={w - 0.7} height={d * 0.55} rx="0.4" fill={style.roof} />}
            {loc.kind === "hall" && <circle cx={loc.position[0]} cy={y + d * 0.3} r="0.8" fill="#fbf7f0" />}
          </g>;
        })}

        {residents.map((bot) => <circle
          key={bot.id}
          ref={(el) => { if (el) dots.current.set(bot.id, el); else dots.current.delete(bot.id); }}
          className={`map-bot ${selected === bot.id ? "is-selected" : ""}`}
          cx={bot.position[0]} cy={bot.position[2]} r={selected === bot.id ? 1.55 : 1.15}
          fill={bot.accent} stroke="#ffffff" strokeWidth="0.45"
          onClick={() => select(bot.id)}
        ><title>{bot.name}</title></circle>)}
      </svg>
    </div>
  </section>;
}
