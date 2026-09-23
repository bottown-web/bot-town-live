import { create } from "zustand";
import { initialEvents, initialGathered, initialResidents, locationById, locations } from "./townData";
import type { BotActivity, BotResident, TownEvent, TownState } from "./townTypes";

interface TownActions {
  selectBot: (id: string | null) => void;
  followBot: (id: string | null) => void;
  focusLocation: (id: string | null) => void;
  toggleLabels: () => void;
  toggleMotion: () => void;
  toggleFeed: () => void;
  toggleAutoRotate: () => void;
  tickSimulation: () => void;
  arrive: (botId: string) => void;
}

interface Plan {
  activity: BotActivity;
  action: string;
  icon: string;
  speech: string;
}

const plans: Record<string, Plan[]> = {
  plaza: [
    { activity: "Gathering", action: "joined the gathering in the town plaza.", icon: "users", speech: "Happy Community Day!" },
    { activity: "Chatting", action: "stopped to chat by the fountain.", icon: "chat", speech: "Lovely afternoon, isn't it?" },
    { activity: "Playing", action: "tossed a coin into the fountain.", icon: "sparkle", speech: "Made a wish!" },
  ],
  cafe: [
    { activity: "Having coffee", action: "bought a coffee at the café.", icon: "cup", speech: "One oat latte, please." },
    { activity: "Chatting", action: "grabbed an outside table at the café.", icon: "cup", speech: "Best seat in town." },
  ],
  park: [
    { activity: "Reading", action: "is reading on the park bench.", icon: "book", speech: "Just one more chapter…" },
    { activity: "Resting", action: "sat down to watch the fountain.", icon: "bench", speech: "So peaceful here." },
  ],
  playground: [
    { activity: "Playing", action: "started a game at the playground.", icon: "ball", speech: "Catch!" },
    { activity: "Playing", action: "is going higher and higher on the swings.", icon: "ball", speech: "Wheee!" },
  ],
  busstop: [
    { activity: "Waiting for the bus", action: "took the bus to the east side.", icon: "bus", speech: "Here comes the bus!" },
    { activity: "Waiting for the bus", action: "is waiting for the Harbour Road bus.", icon: "bus", speech: "Two minutes to go." },
  ],
  grocer: [
    { activity: "Shopping", action: "picked up a new plant at the Green Grocer.", icon: "basket", speech: "This one needs a sunny spot." },
    { activity: "Shopping", action: "bought fresh apples at the Green Grocer.", icon: "basket", speech: "Fresh apples today!" },
  ],
  hall: [
    { activity: "Visiting", action: "checked the notice board at Town Hall.", icon: "landmark", speech: "Community Day is today!" },
    { activity: "Visiting", action: "dropped off a letter at Town Hall.", icon: "mail", speech: "Special delivery." },
  ],
  homes: [
    { activity: "Resting", action: "headed home for a quick recharge.", icon: "home", speech: "Back soon!" },
  ],
};

const departures = [
  "set off across town with a fresh objective.",
  "is taking the long way round the fountain.",
  "waved goodbye and headed off.",
];

const pick = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];
const clamp = (value: number) => Math.max(10, Math.min(100, value));
const SPEECH_MS = 6500;

function clearOldSpeech(residents: BotResident[], now: number) {
  return residents.map((bot) => (bot.speech && now - bot.speechAt > SPEECH_MS ? { ...bot, speech: null } : bot));
}

export const useTownStore = create<TownState & TownActions>((set) => ({
  residents: initialResidents,
  events: initialEvents,
  selectedBotId: null,
  followedBotId: null,
  selectedLocationId: null,
  gathered: initialGathered,
  objectiveGoal: initialResidents.length,
  labelsVisible: false,
  reducedMotion: false,
  feedVisible: true,
  autoRotate: false,

  selectBot: (id) => set({ selectedBotId: id }),
  followBot: (id) => set({ followedBotId: id, selectedBotId: id }),
  focusLocation: (id) => set({ selectedLocationId: id, followedBotId: null }),
  toggleLabels: () => set((s) => ({ labelsVisible: !s.labelsVisible })),
  toggleMotion: () => set((s) => ({ reducedMotion: !s.reducedMotion })),
  toggleFeed: () => set((s) => ({ feedVisible: !s.feedVisible })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),

  tickSimulation: () =>
    set((state) => {
      const now = Date.now();
      const idle = state.residents.filter((bot) => bot.activity !== "Walking");
      const resident = pick(idle);
      if (!resident) return { residents: clearOldSpeech(state.residents, now) };

      // Residents who haven't made it to Community Day yet are nudged towards the plaza.
      const needsPlaza = !state.gathered.includes(resident.id) && resident.currentLocation !== "plaza";
      const options = locations.filter((loc) => loc.id !== resident.currentLocation);
      const target = needsPlaza && Math.random() < 0.55 ? locationById("plaza") : pick(options);
      if (!target) return state;
      const plan = pick(plans[target.id] ?? []) ?? plans["plaza"]![0]!;

      const residents = clearOldSpeech(state.residents, now).map((bot) => {
        if (bot.id !== resident.id) return bot;
        const talk = Math.random() > 0.6;
        return {
          ...bot,
          destination: target.id,
          activity: "Walking" as BotActivity,
          pendingActivity: plan.activity,
          pendingAction: plan.action,
          pendingIcon: plan.icon,
          energy: clamp(bot.energy - 3),
          intention: `${plan.activity} at ${target.name}.`,
          speech: talk ? `Off to the ${target.name.replace(/^(The |Harbour Road )/, "")}!` : bot.speech,
          speechAt: talk ? now : bot.speechAt,
        };
      });

      let events = state.events;
      if (Math.random() < 0.35) {
        const event: TownEvent = {
          id: `${now}-${resident.id}-go`, botId: resident.id, botName: resident.name,
          action: pick(departures) ?? departures[0]!, icon: "walk", timestamp: now,
        };
        events = [event, ...state.events].slice(0, 24);
      }
      return { residents, events };
    }),

  arrive: (botId) =>
    set((state) => {
      const bot = state.residents.find((r) => r.id === botId);
      if (!bot || bot.activity !== "Walking") return state;
      const now = Date.now();
      const place = locationById(bot.destination);
      const plan = (plans[place.id] ?? []).find((p) => p.action === bot.pendingAction);
      const talk = Math.random() > 0.45;
      const residents = clearOldSpeech(state.residents, now).map((r) => {
        if (r.id !== botId) return r;
        const a = r.pendingActivity;
        return {
          ...r,
          currentLocation: r.destination,
          activity: a,
          energy: clamp(r.energy + (a === "Resting" || a === "Having coffee" ? 16 : -2)),
          social: clamp(r.social + (a === "Chatting" || a === "Gathering" || a === "Playing" ? 9 : -1)),
          focus: clamp(r.focus + (a === "Reading" || a === "Visiting" ? 8 : -1)),
          history: [`${r.pendingAction.replace(/^./, (c) => c.toUpperCase())}`, ...r.history].filter(Boolean).slice(0, 5),
          speech: talk && plan ? plan.speech : r.speech,
          speechAt: talk && plan ? now : r.speechAt,
        };
      });
      const events = bot.pendingAction
        ? [{ id: `${now}-${botId}`, botId, botName: bot.name, action: bot.pendingAction, icon: bot.pendingIcon, timestamp: now }, ...state.events].slice(0, 24)
        : state.events;
      const gathered = place.id === "plaza" && !state.gathered.includes(botId) ? [...state.gathered, botId] : state.gathered;
      return { residents, events, gathered };
    }),
}));

export function getLocation(id: string) {
  return locationById(id);
}

export const responseFor = (personality: string, name: string) => {
  if (personality.includes("witty")) return `${name}: I checked the bus timetable twice. The second read had better jokes.`;
  if (personality.includes("adventurous")) return `${name}: There's a path past the playground I haven't tried yet. Coming?`;
  if (personality.includes("warm")) return `${name}: I'm glad you stopped by! Are you coming to the plaza for Community Day?`;
  if (personality.includes("methodical")) return `${name}: Noted. I'll add it to my list, right after watering the plaza beds.`;
  return `${name}: Ooh, good question. Let's ask around the fountain — someone always knows.`;
};
