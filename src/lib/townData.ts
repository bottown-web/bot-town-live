import type { BotActivity, BotResident, GroundPoint, TownEvent, TownLocation } from "./townTypes";

/* ------------------------------------------------------------------ */
/* Palette — warm, sunny, storybook seaside town                       */
/* ------------------------------------------------------------------ */

export const TOWN_COLORS = {
  skyTop: "#9cc9ea",
  skyMid: "#f6cfb2",
  skyHorizon: "#fbe3c8",
  haze: "#f3dcc6",
  sea: "#4fa6cf",
  seaShallow: "#7fd0dc",
  grass: "#86c262",
  grassDark: "#6fae4f",
  rock: "#a99d8e",
  rockDark: "#8c8174",
  road: "#6e737b",
  roadLine: "#f4f1ea",
  sidewalk: "#d9cfc0",
  cobble: "#ead7bc",
  cobbleLine: "#d9c2a2",
  stone: "#ece5da",
  cream: "#f1dfc4",
  peach: "#eab68f",
  brick: "#c7774f",
  brickDark: "#a85f3e",
  slate: "#5c6479",
  slateDark: "#4a5164",
  trim: "#fbf7f0",
  wood: "#8a5a3b",
  woodLight: "#b27c52",
  iron: "#2d3036",
  lantern: "#ffd786",
  window: "#ffe2a3",
  glass: "#8fb9cf",
  awningRed: "#e24a3d",
  awningGreen: "#3f8d5a",
  leaf: ["#5fa846", "#74b951", "#4f963f", "#83c35a"],
  trunk: "#7a5238",
  hedge: "#559c45",
  mulch: "#c79a6b",
  water: "#6cc4e6",
  white: "#ffffff",
  ink: "#1f2328",
};

/* ------------------------------------------------------------------ */
/* Layout                                                             */
/* ------------------------------------------------------------------ */

/** Ring road around the town centre — a rounded rectangle. */
export const ROAD = { cx: 0, cz: 1, hx: 21.5, hz: 17.5, radius: 7, halfWidth: 1.8, sidewalk: 1.1 };
export const PLAZA_RADIUS = 8;
export const WALK_RING = 6.3;

/** Signed distance from a ground point to a rounded rectangle centred on (cx, cz). */
export function roundedRectSDF(x: number, z: number, cx: number, cz: number, hx: number, hz: number, r: number) {
  const qx = Math.abs(x - cx) - (hx - r);
  const qz = Math.abs(z - cz) - (hz - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qz), 0) - r;
}

/** Distance from a point to the ring road's centreline (0 = on the centreline). */
export function distanceToRoad(x: number, z: number) {
  return Math.abs(roundedRectSDF(x, z, ROAD.cx, ROAD.cz, ROAD.hx, ROAD.hz, ROAD.radius));
}

/** Perimeter length of the ring road centreline. */
export const ROAD_LENGTH = (() => {
  const a = ROAD.hx - ROAD.radius;
  const b = ROAD.hz - ROAD.radius;
  return 4 * a + 4 * b + 2 * Math.PI * ROAD.radius;
})();

/**
 * Point on the ring road centreline at distance `s` (wraps), plus its unit tangent.
 * Starts on the south (camera-side) edge heading east.
 */
export function roadPoint(s: number): { x: number; z: number; tx: number; tz: number } {
  const r = ROAD.radius;
  const a = ROAD.hx - r;
  const b = ROAD.hz - r;
  const { cx, cz } = ROAD;
  const arc = (Math.PI * r) / 2;
  let d = ((s % ROAD_LENGTH) + ROAD_LENGTH) % ROAD_LENGTH;
  const corner = (ccx: number, ccz: number, from: number) => {
    const t = from - (d / r);
    return { x: ccx + Math.cos(t) * r, z: ccz + Math.sin(t) * r, tx: Math.sin(t), tz: -Math.cos(t) };
  };
  // South edge, heading +x
  if (d < 2 * a) return { x: cx - a + d, z: cz + ROAD.hz, tx: 1, tz: 0 };
  d -= 2 * a;
  if (d < arc) return corner(cx + a, cz + b, Math.PI / 2);
  d -= arc;
  // East edge, heading -z
  if (d < 2 * b) return { x: cx + ROAD.hx, z: cz + b - d, tx: 0, tz: -1 };
  d -= 2 * b;
  if (d < arc) return corner(cx + a, cz - b, 0);
  d -= arc;
  // North edge, heading -x
  if (d < 2 * a) return { x: cx + a - d, z: cz - ROAD.hz, tx: -1, tz: 0 };
  d -= 2 * a;
  if (d < arc) return corner(cx - a, cz - b, -Math.PI / 2);
  d -= arc;
  // West edge, heading +z
  if (d < 2 * b) return { x: cx - ROAD.hx, z: cz - b + d, tx: 0, tz: 1 };
  d -= 2 * b;
  return corner(cx - a, cz + b, -Math.PI);
}

/** Radius of the island's coastline at a given angle (shape space: x = world x, y = -world z). */
export function islandRadius(angle: number) {
  return 31 + 1.7 * Math.sin(3 * angle + 0.6) + 1.1 * Math.sin(5 * angle + 2.1) + 0.5 * Math.sin(9 * angle);
}

/** Small deterministic RNG so the town looks the same on every load. */
export function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Places                                                             */
/* ------------------------------------------------------------------ */

const row = (count: number, spacing: number, z = 0): GroundPoint[] =>
  Array.from({ length: count }, (_, i) => [(i - (count - 1) / 2) * spacing, z] as GroundPoint);

export const locations: TownLocation[] = [
  {
    id: "plaza", name: "Town Plaza", kind: "plaza", position: [0, 0, 0], size: [16, 1, 16],
    ringAngle: 90, approach: [], anchor: [0, 0], facing: 0, slots: [],
  },
  {
    id: "hall", name: "Town Hall", kind: "hall", position: [0, 0, -11.25], size: [10, 6.8, 4.5],
    ringAngle: -90, approach: [], anchor: [0, -6.1], facing: 0, slots: row(4, 1.25),
  },
  {
    id: "homes", name: "Maple Row Homes", kind: "homes", position: [-10.5, 0, -10.6], size: [6.4, 6.6, 5],
    ringAngle: -141, approach: [[-8.4, -6.5]], anchor: [-10.5, -7.3], facing: 0, slots: row(3, 1.2),
  },
  {
    id: "cafe", name: "Corner Café", kind: "cafe", position: [-14.5, 0, 0.5], size: [7, 4.4, 6],
    ringAngle: 152, approach: [[-9, 4.3]], anchor: [-14.4, 5], facing: 0,
    slots: [[-1.3, -0.2], [0, 0.3], [1.3, -0.1], [-0.6, 1.3], [0.8, 1.4]],
  },
  {
    id: "grocer", name: "Green Grocer", kind: "grocer", position: [-7.4, 0, 9.8], size: [6.5, 4.2, 5],
    ringAngle: 100, approach: [[-0.7, 9.6], [-2.6, 14.1]], anchor: [-7.2, 14.3], facing: 0, slots: row(3, 1.3),
  },
  {
    id: "park", name: "Fountain Garden", kind: "park", position: [4.5, 0, 10.5], size: [6, 1, 3],
    ringAngle: 68, approach: [[3.4, 8.6]], anchor: [4.5, 10.35], facing: 0,
    slots: [[-2.3, 0], [-1.1, 0], [1.1, 0], [2.3, 0]],
  },
  {
    id: "busstop", name: "Harbour Road Bus Stop", kind: "busstop", position: [13, 0, 15], size: [4.4, 2.6, 1.6],
    ringAngle: 45, approach: [[8.2, 9.6], [11.4, 13.4]], anchor: [13, 15.05], facing: 0, slots: row(3, 1.2),
  },
  {
    id: "playground", name: "Playground", kind: "playground", position: [12.8, 0, -3], size: [9, 1, 8],
    ringAngle: -14, approach: [[8.6, -2.2]], anchor: [12.6, -2.6], facing: 0,
    slots: [[-1.4, 2], [0.6, 2.4], [0.8, -0.2], [-0.4, -0.8], [3.4, -0.8], [-3.2, 1.2]],
  },
];

export function locationById(id: string) {
  return locations.find((item) => item.id === id) ?? locations[0]!;
}

/** Where a particular resident stands at a location. */
export function slotFor(location: TownLocation, botId: string): GroundPoint {
  const h = hashString(botId);
  if (location.kind === "plaza") {
    const angle = ((h % 360) * Math.PI) / 180;
    const radius = WALK_RING - 0.5 + ((h >>> 9) % 10) / 10;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  }
  if (location.slots.length === 0) return location.anchor;
  const slot = location.slots[h % location.slots.length] ?? [0, 0];
  return [location.anchor[0] + slot[0], location.anchor[1] + slot[1]];
}

export function ringPoint(angleDeg: number): GroundPoint {
  const a = (angleDeg * Math.PI) / 180;
  return [Math.cos(a) * WALK_RING, Math.sin(a) * WALK_RING];
}

/** Waypoints from one place to another, walking round the fountain in the middle. */
export function routeBetween(fromId: string, toId: string, botId: string, start: GroundPoint): GroundPoint[] {
  const from = locationById(fromId);
  const to = locationById(toId);
  const points: GroundPoint[] = [];
  const startAngle = from.kind === "plaza" ? (Math.atan2(start[1], start[0]) * 180) / Math.PI : from.ringAngle;
  const end = slotFor(to, botId);
  const endAngle = to.kind === "plaza" ? (Math.atan2(end[1], end[0]) * 180) / Math.PI : to.ringAngle;

  // Leave the current place back towards the plaza.
  if (from.kind !== "plaza") {
    points.push(...[...from.approach].reverse());
    points.push(ringPoint(startAngle));
  } else {
    points.push(ringPoint(startAngle));
  }

  // Walk round the ring the short way.
  let delta = endAngle - startAngle;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  const steps = Math.max(1, Math.ceil(Math.abs(delta) / 24));
  for (let i = 1; i <= steps; i++) points.push(ringPoint(startAngle + (delta * i) / steps));

  if (to.kind !== "plaza") points.push(...to.approach);
  points.push(end);
  return points;
}

/* ------------------------------------------------------------------ */
/* Residents                                                          */
/* ------------------------------------------------------------------ */

export const BOT_COLORS = {
  yellow: "#ffcd38",
  blue: "#3f7ff2",
  teal: "#33cdc3",
  pink: "#ff86b6",
  red: "#f24b4b",
  amber: "#ffbf2e",
  purple: "#9a62f0",
  orange: "#ff8a33",
  green: "#5cc95d",
  sky: "#58b6f4",
  coral: "#ff6f61",
  lilac: "#c08cf5",
};

const residentSeeds: Array<{
  name: string; color: string; job: string; personality: string; start: string; activity: BotActivity; cyclist?: boolean; intention: string;
  /** Already on the move when the page loads: [destination, activity on arrival, feed text, icon]. */
  goingTo?: [string, BotActivity, string, string];
}> = [
  { name: "Nova", color: BOT_COLORS.yellow, job: "Mayor's assistant", personality: "warm and observant", start: "plaza", activity: "Chatting", intention: "Make sure everyone makes it to Community Day." },
  { name: "Byte", color: BOT_COLORS.blue, job: "Explorer", personality: "bold and adventurous", start: "plaza", activity: "Walking", intention: "Find the best view of the harbour.", goingTo: ["playground", "Playing", "started a game at the playground.", "ball"] },
  { name: "Orbit", color: BOT_COLORS.teal, job: "Courier", personality: "curious and optimistic", start: "park", activity: "Walking", cyclist: true, intention: "Deliver the morning post before lunch.", goingTo: ["busstop", "Waiting for the bus", "dropped the post bag at the bus stop.", "mail"] },
  { name: "Luna", color: BOT_COLORS.pink, job: "Artist", personality: "curious and optimistic", start: "playground", activity: "Playing", intention: "Sketch every tree on the island." },
  { name: "Vector", color: BOT_COLORS.red, job: "Gardener", personality: "methodical and generous", start: "park", activity: "Shopping", intention: "Plant something new in the plaza beds." },
  { name: "Kernel", color: BOT_COLORS.amber, job: "Librarian", personality: "precise and quietly witty", start: "park", activity: "Reading", intention: "Finish the chapter before the bus comes." },
  { name: "Pixel", color: BOT_COLORS.purple, job: "Photographer", personality: "bold and adventurous", start: "homes", activity: "Resting", intention: "Catch the golden hour on the east side." },
  { name: "Relay", color: BOT_COLORS.teal, job: "Bus driver", personality: "warm and observant", start: "busstop", activity: "Waiting for the bus", intention: "Keep the Harbour Road route on time." },
  { name: "Echo", color: BOT_COLORS.orange, job: "Barista", personality: "warm and observant", start: "cafe", activity: "Having coffee", intention: "Perfect a new honey-oat latte." },
  { name: "Comet", color: BOT_COLORS.sky, job: "Postbot", personality: "curious and optimistic", start: "hall", activity: "Visiting", intention: "Post the Community Day notice." },
  { name: "Pebble", color: BOT_COLORS.green, job: "Shopkeeper", personality: "methodical and generous", start: "grocer", activity: "Shopping", intention: "Stack the apples into a perfect pyramid." },
  { name: "Mochi", color: BOT_COLORS.pink, job: "Baker", personality: "warm and observant", start: "cafe", activity: "Chatting", intention: "Share today's cinnamon buns." },
  { name: "Ziggy", color: BOT_COLORS.lilac, job: "Musician", personality: "bold and adventurous", start: "plaza", activity: "Gathering", intention: "Play a tune by the fountain." },
  { name: "Sprout", color: BOT_COLORS.coral, job: "Student", personality: "curious and optimistic", start: "playground", activity: "Playing", intention: "Beat the swing height record." },
  { name: "Pip", color: BOT_COLORS.yellow, job: "Town crier", personality: "precise and quietly witty", start: "plaza", activity: "Chatting", intention: "Announce the bus times, loudly." },
];

export const initialResidents: BotResident[] = residentSeeds.map((seed, i) => {
  const id = seed.name.toLowerCase();
  const location = locationById(seed.start);
  const [x, z] = slotFor(location, id);
  const going = seed.goingTo;
  return {
    id, name: seed.name, job: seed.job, personality: seed.personality, accent: seed.color, cyclist: Boolean(seed.cyclist),
    currentLocation: location.id, destination: going ? going[0] : location.id, activity: going ? "Walking" : seed.activity,
    pendingActivity: going ? going[1] : seed.activity, pendingAction: going ? going[2] : "", pendingIcon: going ? going[3] : "walk",
    energy: 64 + ((i * 7) % 31), social: 52 + ((i * 9) % 43), focus: 61 + ((i * 11) % 34),
    intention: seed.intention,
    history: [`Started the day at ${location.name}.`, "Said good morning to the neighbours."],
    position: [x, 0, z], speech: null, speechAt: 0,
  };
});

/** Residents who were already at the plaza for Community Day when the page loads. */
export const initialGathered = ["nova", "byte", "orbit", "luna", "vector", "kernel", "relay", "echo", "ziggy", "pip", "comet"];

const eventSeeds: Array<[string, string, string, string, number]> = [
  ["byte", "Byte", "set off across town with a fresh objective.", "walk", 2],
  ["relay", "Relay", "started a game at the playground.", "ball", 6],
  ["vector", "Vector", "bought a coffee at the café.", "cup", 8],
  ["kernel", "Kernel", "is reading on the park bench.", "book", 12],
  ["pixel", "Pixel", "took the bus to the east side.", "bus", 14],
  ["echo", "Echo", "opened the café for the afternoon.", "cup", 19],
];

export const initialEvents: TownEvent[] = eventSeeds.map(([botId, botName, action, icon, minutesAgo], i) => ({
  id: `seed-${i}`, botId, botName, action, icon, timestamp: Date.now() - minutesAgo * 60000,
}));
