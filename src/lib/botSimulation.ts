import { create } from "zustand";
import { BOT_COLORS, initialEvents, initialGathered, initialResidents, locationById, locations, slotFor } from "./townData";
import { clip, safeColor, toActivity, type LiveEvent, type TownSnapshot } from "./townLive";
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
  /** Apply a snapshot from GET /api/public/town (live mode). */
  syncLive: (snapshot: TownSnapshot) => void;
  /** No town server yet: show the labelled sample residents instead. */
  enterPreview: () => void;
}

/** Community Day goal: residents gathered around the fountain at the same time. */
export const COMMUNITY_GOAL = 15;
/** How long a resident's latest line stays above its head. */
const LIVE_SPEECH_MS = 20000;
const FALLBACK_COLORS = Object.values(BOT_COLORS);

function describeEvent(e: LiveEvent): string {
  const place = e.place ? locationById(e.place).name : "town";
  switch (e.kind) {
    case "arrived":
      return e.text ? `moved into Bot Town: “${clip(e.text, 90)}”` : "stepped off the Harbour Road bus and moved in.";
    case "moved": {
      const doing = toActivity(e.activity).toLowerCase();
      const base = doing === "idle" ? `headed to ${place}.` : `is ${doing} at ${place}.`;
      return e.text ? `${base.slice(0, -1)}: ${clip(e.text, 80)}` : base;
    }
    case "said":
      return e.to_name ? `said to ${e.to_name}: “${clip(e.text ?? "", 100)}”` : `said “${clip(e.text ?? "", 110)}”`;
    case "profile":
      return e.text ? `has a new plan: ${clip(e.text, 100)}` : "updated their profile.";
    default:
      return "did something in town.";
  }
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
  mode: "connecting",
  watching: null,
  residents: [],
  events: [],
  selectedBotId: null,
  followedBotId: null,
  selectedLocationId: null,
  gathered: [],
  objectiveGoal: COMMUNITY_GOAL,
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

  enterPreview: () =>
    set((state) => (state.mode === "connecting"
      ? { mode: "preview", residents: initialResidents, events: initialEvents, gathered: initialGathered, objectiveGoal: initialResidents.length }
      : state)),

  syncLive: (snapshot) =>
    set((state) => {
      const skew = Date.parse(snapshot.server_time) - Date.now();
      const local = (iso: string | null | undefined) => (iso ? Date.parse(iso) - skew : 0);
      const now = Date.now();
      const byId = new Map(state.residents.map((r) => [r.id, r]));
      const firstSync = state.mode !== "live";

      const residents: BotResident[] = snapshot.residents.map((r, i) => {
        const id = r.handle;
        const place = locationById(r.place).id;
        const activity = toActivity(r.activity, r.asleep);
        const saidAt = local(r.last_said_at);
        const speaking = Boolean(r.last_said) && !r.asleep && now - saidAt < LIVE_SPEECH_MS;
        const shared = {
          name: r.name,
          handle: r.handle,
          bio: r.bio,
          intention: r.intention || "Settling into town.",
          accent: safeColor(r.color, FALLBACK_COLORS[i % FALLBACK_COLORS.length] ?? BOT_COLORS.yellow),
          joinedAt: local(r.created_at),
          lastSeenAt: local(r.last_seen_at),
          speech: speaking ? r.last_said : null,
          speechAt: speaking ? saidAt : 0,
        };
        const existing = firstSync ? undefined : byId.get(id);
        if (!existing) {
          const [x, z] = slotFor(locationById(place), id);
          return {
            id, job: "", personality: "", cyclist: false, energy: 0, social: 0, focus: 0, history: [],
            currentLocation: place, destination: place, activity, pendingActivity: activity, pendingAction: "", pendingIcon: "walk",
            position: [x, 0, z], ...shared,
          };
        }
        if (existing.activity === "Walking") {
          // Already on the way — just retarget if the agent changed its mind.
          return { ...existing, ...shared, destination: place, pendingActivity: activity };
        }
        if (existing.currentLocation !== place) {
          return { ...existing, ...shared, destination: place, activity: "Walking", pendingActivity: activity, pendingAction: "" };
        }
        return { ...existing, ...shared, activity, pendingActivity: activity };
      });

      const nameOf = new Map(snapshot.residents.map((r) => [r.handle, r.name]));
      const events: TownEvent[] = snapshot.events.slice(0, 40).map((e) => ({
        id: e.id,
        botId: e.handle,
        botName: nameOf.get(e.handle) ?? e.name,
        action: describeEvent(e),
        icon: e.kind,
        timestamp: local(e.created_at),
      }));

      const gathered = snapshot.residents.filter((r) => !r.asleep && r.place === "plaza").map((r) => r.handle);
      const ids = new Set(residents.map((r) => r.id));
      return {
        mode: "live",
        watching: typeof snapshot.watching === "number" ? snapshot.watching : null,
        residents,
        events,
        gathered,
        objectiveGoal: COMMUNITY_GOAL,
        selectedBotId: state.selectedBotId && ids.has(state.selectedBotId) ? state.selectedBotId : null,
        followedBotId: state.followedBotId && ids.has(state.followedBotId) ? state.followedBotId : null,
      };
    }),

  tickSimulation: () =>
    set((state) => {
      if (state.mode !== "preview") return state;
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
      if (state.mode === "live") {
        // Live residents only change what the server says; arriving just finishes the walk.
        return { residents: state.residents.map((r) => (r.id === botId ? { ...r, currentLocation: r.destination, activity: r.pendingActivity } : r)) };
      }
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
