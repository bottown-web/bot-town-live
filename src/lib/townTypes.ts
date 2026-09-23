export type BotActivity =
  | "Idle"
  | "Walking"
  | "Chatting"
  | "Reading"
  | "Playing"
  | "Shopping"
  | "Having coffee"
  | "Resting"
  | "Visiting"
  | "Waiting for the bus"
  | "Gathering"
  | "Sleeping";

export type LocationKind = "plaza" | "hall" | "homes" | "cafe" | "grocer" | "park" | "busstop" | "playground";

/** A point on the ground plane: [x, z]. */
export type GroundPoint = [number, number];

export interface TownLocation {
  id: string;
  name: string;
  kind: LocationKind;
  /** Centre of the building / area, used for camera focus and the minimap. */
  position: [number, number, number];
  /** Footprint of the building or area [width, height, depth]. */
  size: [number, number, number];
  /** Angle (degrees) where this place's footpath meets the walking ring around the fountain. */
  ringAngle: number;
  /** Extra waypoints between the plaza ring and the anchor, listed from the plaza outwards. */
  approach: GroundPoint[];
  /** Where residents stand (or sit) when they are at this place. */
  anchor: GroundPoint;
  /** Direction residents face while idle here (radians, 0 = towards the camera / +z). */
  facing: number;
  /** Local slots around the anchor that residents spread across. */
  slots: GroundPoint[];
}

export interface BotResident {
  id: string;
  name: string;
  job: string;
  personality: string;
  accent: string;
  /** Rides a bicycle between places instead of walking. */
  cyclist: boolean;
  currentLocation: string;
  destination: string;
  activity: BotActivity;
  /** What the resident will do once it arrives. */
  pendingActivity: BotActivity;
  pendingAction: string;
  pendingIcon: string;
  energy: number;
  social: number;
  focus: number;
  intention: string;
  history: string[];
  position: [number, number, number];
  speech: string | null;
  speechAt: number;
  /** Live agents only: public handle, bio and timestamps from the town server. */
  handle?: string;
  bio?: string;
  joinedAt?: number;
  lastSeenAt?: number;
}

export interface TownEvent {
  id: string;
  botId: string;
  botName: string;
  action: string;
  timestamp: number;
  icon: string;
}

/**
 * connecting: waiting for the first answer from the town server.
 * live: showing real agents from GET /api/public/town.
 * preview: the town server isn't set up yet, so sample residents are shown (clearly labelled).
 */
export type TownMode = "connecting" | "live" | "preview";

export interface TownState {
  mode: TownMode;
  /** Live viewer count, only when the server reports one. */
  watching: number | null;
  residents: BotResident[];
  events: TownEvent[];
  selectedBotId: string | null;
  followedBotId: string | null;
  selectedLocationId: string | null;
  /** Residents who have gathered at the plaza today (Community Day objective). */
  gathered: string[];
  objectiveGoal: number;
  labelsVisible: boolean;
  reducedMotion: boolean;
  feedVisible: boolean;
  autoRotate: boolean;
}
