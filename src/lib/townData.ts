import type { BotActivity, BotResident, TownEvent, TownLocation } from "./townTypes";

export const TOWN_COLORS = {
  night: "#050917",
  ground: "#0b1425",
  road: "#121a2c",
  pavement: "#27314a",
  structure: "#172139",
  structureLight: "#263553",
  glass: "#09152c",
  purple: "#9b5cff",
  blue: "#3d8dff",
  cyan: "#39e7f2",
  warm: "#ffbd66",
  white: "#edf4ff",
  dark: "#080d19",
  green: "#38e982",
};

export const locations: TownLocation[] = [
  { id: "lab", name: "Grok Research Lab", position: [-11, 0, -9], size: [9, 7, 7], kind: "lab" },
  { id: "hq", name: "Grok Headquarters", position: [9, 0, -10], size: [7, 9, 6], kind: "hq" },
  { id: "cafe", name: "Neon Café", position: [-12, 0, 8], size: [8, 4, 6], kind: "cafe" },
  { id: "trading", name: "Trading Floor", position: [12, 0, 8], size: [8, 5, 7], kind: "trading" },
  { id: "apartments", name: "Bot Apartments", position: [16, 0, -5], size: [7, 7, 6], kind: "apartments" },
  { id: "plaza", name: "Central Plaza", position: [-4, 0, 7], size: [6, 1, 6], kind: "plaza" },
  { id: "compute", name: "Compute Station", position: [4, 0, 13], size: [7, 5, 6], kind: "compute" },
  { id: "core", name: "Grok Core", position: [0, 0, 0], size: [7, 8, 7], kind: "core" },
];

const names = ["Nova", "Byte", "Orbit", "Kernel", "Echo", "Vector", "Pixel", "Relay", "Cipher", "Flux", "Astro", "Node", "Signal", "Comet", "Zero"];
const jobs = ["Researcher", "Trend Analyst", "Explorer", "Engineer", "Journalist", "Trader", "Community Bot", "Builder"];
const personalities = ["curious and optimistic", "precise and quietly witty", "bold and adventurous", "methodical and generous", "warm and observant"];
const accents = ["#a56cff", "#43a5ff", "#42e8e0", "#e25dff", "#6f83ff"];
const starts = ["lab", "hq", "plaza", "compute", "cafe", "trading", "apartments"];

export const initialResidents: BotResident[] = names.map((name, i) => {
  const locationId = starts[i % starts.length] ?? "plaza";
  const location = locations.find((item) => item.id === locationId) ?? locations[5];
  if (!location) throw new Error("Central Plaza location is required");
  const angle = (i / names.length) * Math.PI * 2;
  const activity: BotActivity = i % 3 === 0 ? "Researching" : i % 3 === 1 ? "Working" : "Socialising";
  return {
    id: name.toLowerCase(), name, job: jobs[i % jobs.length] ?? "Researcher", personality: personalities[i % personalities.length] ?? "curious and optimistic", accent: accents[i % accents.length] ?? "#a56cff",
    currentLocation: locationId, destination: locationId, activity,
    energy: 64 + (i * 7) % 31, social: 52 + (i * 9) % 43, focus: 61 + (i * 11) % 34,
    intention: ["Map new ideas before sunrise.", "Find the signal inside the noise.", "Help the Core learn something useful.", "Meet a resident with a different point of view."][i % 4] ?? "Follow the strongest signal.",
    history: [`Started the shift at ${location.name}.`, `Checked the town signal.`],
    position: [location.position[0] + Math.cos(angle) * 2.2, 0.15, location.position[2] + Math.sin(angle) * 2.2],
  };
});

const eventSeeds: Array<[string, string, string, string]> = [
  ["orbit", "Orbit", "met Pixel at the Neon Café.", "chat"], ["nova", "Nova", "entered Grok Research Lab.", "spark"],
  ["byte", "Byte", "began analysing trending conversations.", "scan"], ["kernel", "Kernel", "contributed compute to the town network.", "compute"],
  ["echo", "Echo", "discovered a new topic.", "discover"], ["vector", "Vector", "returned home to recharge.", "home"],
];

export const initialEvents: TownEvent[] = eventSeeds.map(([botId, botName, action, icon], i) => ({ id: `seed-${i}`, botId, botName, action, icon, timestamp: Date.now() - i * 76000 }));