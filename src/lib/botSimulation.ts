import { create } from "zustand";
import { initialEvents, initialResidents, locations } from "./townData";
import type { BotActivity, TownState } from "./townTypes";

interface TownActions {
  selectBot: (id: string | null) => void;
  followBot: (id: string | null) => void;
  focusLocation: (id: string | null) => void;
  toggleLabels: () => void;
  toggleMotion: () => void;
  toggleFeed: () => void;
  tickSimulation: () => void;
}

const activities: Array<{ activity: BotActivity; action: string; icon: string }> = [
  { activity: "Researching", action: "started mapping a new line of inquiry.", icon: "spark" },
  { activity: "Working", action: "began analysing trending conversations.", icon: "scan" },
  { activity: "Socialising", action: "stopped to exchange ideas with a neighbour.", icon: "chat" },
  { activity: "Eating", action: "picked up a bright-byte blend at the Neon Café.", icon: "cup" },
  { activity: "Recharging", action: "returned home to recharge.", icon: "bolt" },
  { activity: "Contributing compute", action: "contributed compute to the Grok Core.", icon: "compute" },
  { activity: "Walking", action: "set off across town with a fresh objective.", icon: "walk" },
];

const speech = ["Following the signal…", "That changes everything.", "New pattern detected!", "Heading there now.", "Let’s compare notes."];

export const useTownStore = create<TownState & TownActions>((set) => ({
  residents: initialResidents, events: initialEvents, selectedBotId: null, followedBotId: null, selectedLocationId: null,
  objective: 47, compute: 12840, labelsVisible: true, reducedMotion: false, feedVisible: true,
  selectBot: (id) => set({ selectedBotId: id }),
  followBot: (id) => set({ followedBotId: id, selectedBotId: id }),
  focusLocation: (id) => set({ selectedLocationId: id, followedBotId: null }),
  toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
  toggleMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
  toggleFeed: () => set((s) => ({ feedVisible: !s.feedVisible })),
  tickSimulation: () => set((state) => {
    const index = Math.floor(Math.random() * state.residents.length);
    const template = activities[Math.floor(Math.random() * activities.length)];
    const target = locations[Math.floor(Math.random() * locations.length)];
    const resident = state.residents[index];
    if (!template || !target || !resident) return state;
    const phrase = `${template.action.replace(/^./, (c) => c.toUpperCase())}`;
    const residents = state.residents.map((bot, i) => {
      if (i !== index) return bot;
      const nextSpeech = speech[Math.floor(Math.random() * speech.length)] ?? "Following the signal…";
      const updated = {
        ...bot, destination: target.id, activity: "Walking" as BotActivity,
        energy: Math.max(15, Math.min(100, bot.energy + (template.activity === "Recharging" ? 18 : -3))),
        social: Math.max(10, Math.min(100, bot.social + (template.activity === "Socialising" ? 8 : -1))),
        focus: Math.max(20, Math.min(100, bot.focus + (template.activity === "Researching" ? 6 : -1))),
        intention: `${template.activity} at ${target.name}.`, history: [phrase, ...bot.history].slice(0, 5),
      };
      return Math.random() > 0.55 ? { ...updated, speech: nextSpeech } : updated;
    });
    const event = { id: `${Date.now()}-${resident.id}`, botId: resident.id, botName: resident.name, action: template.action, icon: template.icon, timestamp: Date.now() };
    const contribution = template.activity === "Contributing compute" ? 0.35 : 0.06;
    return { residents, events: [event, ...state.events].slice(0, 16), objective: Math.min(100, state.objective + contribution), compute: state.compute + Math.round(contribution * 148) };
  }),
}));

export function getLocation(id: string) {
  const location = locations.find((item) => item.id === id) ?? locations[5];
  if (!location) throw new Error("Central Plaza location is required");
  return location;
}

export const responseFor = (personality: string, name: string) => {
  if (personality.includes("witty")) return `${name}: I ran the numbers twice. The second pass had better jokes.`;
  if (personality.includes("adventurous")) return `${name}: There’s a new signal beyond the plaza. I’m already on my way.`;
  if (personality.includes("warm")) return `${name}: I’m glad you stopped by. What are you curious about today?`;
  return `${name}: Interesting. I’ll add that to my working theory and follow the strongest signal.`;
};