export type BotActivity = "Idle" | "Walking" | "Working" | "Researching" | "Socialising" | "Eating" | "Recharging" | "Contributing compute";

export interface TownLocation {
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  kind: "lab" | "hq" | "cafe" | "trading" | "apartments" | "plaza" | "compute" | "core";
}

export interface BotResident {
  id: string;
  name: string;
  job: string;
  personality: string;
  accent: string;
  currentLocation: string;
  destination: string;
  activity: BotActivity;
  energy: number;
  social: number;
  focus: number;
  intention: string;
  history: string[];
  position: [number, number, number];
  speech?: string;
}

export interface TownEvent {
  id: string;
  botId: string;
  botName: string;
  action: string;
  timestamp: number;
  icon: string;
}

export interface TownState {
  residents: BotResident[];
  events: TownEvent[];
  selectedBotId: string | null;
  followedBotId: string | null;
  selectedLocationId: string | null;
  objective: number;
  compute: number;
  labelsVisible: boolean;
  reducedMotion: boolean;
  feedVisible: boolean;
}