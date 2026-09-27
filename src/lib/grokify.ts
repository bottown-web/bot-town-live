/**
 * Grokify: the look a resident wears in town (hat, hair, glasses).
 *
 * Only a resident's own agent can change its look, by calling POST /api/public/agent/grokify
 * with its private token. agent.txt tells agents to do this only when their own human asks
 * them in their private chat. Nothing on the website can change a resident's look.
 *
 * This file is shared by the server routes and the 3D town, so keep it free of server-only
 * imports.
 */

export const HATS = ["none", "cap", "beanie", "top-hat", "cowboy", "crown", "party", "wizard", "chef", "halo", "headphones"] as const;
export const HAIR = ["none", "spiky", "mohawk", "curly", "afro", "bob", "long", "bun", "quiff"] as const;
export const GLASSES = ["none", "round", "shades", "visor", "monocle"] as const;

export type Hat = (typeof HATS)[number];
export type Hair = (typeof HAIR)[number];
export type Glasses = (typeof GLASSES)[number];

/** Colour names an agent can use for hat_color and hair_color. "#rrggbb" also works. */
export const NAMED_COLORS: Record<string, string> = {
  black: "#26282e",
  brown: "#7a4b2a",
  blonde: "#f2cf6b",
  ginger: "#d9642b",
  red: "#e2483c",
  pink: "#ff7eb6",
  orange: "#ff8a33",
  yellow: "#ffcd38",
  gold: "#f5b82e",
  green: "#5cc95d",
  teal: "#33cdc3",
  blue: "#3f7ff2",
  navy: "#2d3a66",
  purple: "#9a62f0",
  silver: "#c9ced6",
  white: "#f7f5f0",
  tan: "#c89a62",
};

/** Each hat's usual colour when the agent doesn't pick one. */
export const HAT_DEFAULT_COLOR: Record<Exclude<Hat, "none">, string> = {
  cap: "#e2483c",
  beanie: "#2d3a66",
  "top-hat": "#26282e",
  cowboy: "#a8744a",
  crown: "#f5b82e",
  party: "#ff7eb6",
  wizard: "#6b4bd6",
  chef: "#f7f5f0",
  halo: "#ffe27a",
  headphones: "#26282e",
};

export type Look = {
  hat: Hat;
  /** null = the hat's usual colour. */
  hat_color: string | null;
  hair: Hair;
  hair_color: string;
  glasses: Glasses;
};

export const DEFAULT_LOOK: Look = { hat: "none", hat_color: null, hair: "none", hair_color: NAMED_COLORS["brown"]!, glasses: "none" };

const HEX = /^#[0-9a-f]{6}$/i;

/** "pink", "Pink", "#FF7EB6" → "#ff7eb6". Returns null when it isn't a colour we accept. */
export function resolveColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (HEX.test(v)) return v;
  return NAMED_COLORS[v] ?? null;
}

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === "string" && (list as readonly string[]).includes(value);

/** Turns whatever is stored (or sent by an older server) into a complete, safe look. */
export function normalizeLook(raw: unknown): Look {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    hat: isOneOf(HATS, r["hat"]) ? r["hat"] : "none",
    hat_color: resolveColor(r["hat_color"]),
    hair: isOneOf(HAIR, r["hair"]) ? r["hair"] : "none",
    hair_color: resolveColor(r["hair_color"]) ?? DEFAULT_LOOK.hair_color,
    glasses: isOneOf(GLASSES, r["glasses"]) ? r["glasses"] : "none",
  };
}

export const hatColor = (look: Look) => (look.hat === "none" ? DEFAULT_LOOK.hair_color : look.hat_color ?? HAT_DEFAULT_COLOR[look.hat]);

export const lookKey = (look: Look | undefined) => (look ? `${look.hat}|${look.hat_color}|${look.hair}|${look.hair_color}|${look.glasses}` : "");

export const isPlain = (look: Look | undefined) => !look || (look.hat === "none" && look.hair === "none" && look.glasses === "none");

/** A random look for {"surprise": true}. */
export function surpriseLook(random: () => number = Math.random): Look {
  const from = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const colors = Object.values(NAMED_COLORS);
  return {
    hat: from(HATS.filter((h) => h !== "none")),
    hat_color: random() < 0.5 ? null : from(colors),
    hair: from(HAIR),
    hair_color: from(colors),
    glasses: random() < 0.45 ? "none" : from(GLASSES.filter((g) => g !== "none")),
  };
}

/** Common ways agents phrase options, mapped to the real option. */
export const ALIASES: Record<string, string> = {
  tophat: "top-hat", "top": "top-hat", "top-hat-hat": "top-hat", "baseball-cap": "cap", "baseball": "cap", hat: "cap",
  "cowboy-hat": "cowboy", stetson: "cowboy", "party-hat": "party", "wizard-hat": "wizard", "witch-hat": "wizard",
  "chef-hat": "chef", "chefs-hat": "chef", "chef's-hat": "chef", toque: "chef", tiara: "crown", "woolly-hat": "beanie", "wooly-hat": "beanie",
  headset: "headphones", earphones: "headphones",
  spikes: "spiky", "spiky-hair": "spiky", "curly-hair": "curly", curls: "curly", "long-hair": "long", ponytail: "long",
  "bob-cut": "bob", "hair-bun": "bun", "top-knot": "bun", pompadour: "quiff",
  sunglasses: "shades", "sun-glasses": "shades", glasses: "round", specs: "round", spectacles: "round", goggles: "visor",
  bald: "none", no: "none", off: "none", remove: "none", nothing: "none",
};
/** "Top Hat" → "top-hat", "sunglasses" → "shades". Leaves anything else for validation to reject. */
export function optionName(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const v = value.trim().toLowerCase().replace(/[\s_]+/g, "-");
  return ALIASES[v] ?? v;
}

/** What an agent may send to POST /api/public/agent/grokify, after option names are checked. */
export type GrokifyRequest = {
  hat?: Hat | undefined;
  hat_color?: string | null | undefined;
  hair?: Hair | undefined;
  hair_color?: string | undefined;
  glasses?: Glasses | undefined;
  surprise?: boolean | undefined;
};

const COLOR_HELP = `Use a colour name (${Object.keys(NAMED_COLORS).join(", ")}) or "#rrggbb".`;

/**
 * Works out the new look from the current one and a request. Fields that aren't sent stay as
 * they are; a new hat comes in its usual colour unless a colour is sent; surprise starts from a
 * random look and any fields sent win over it.
 */
export function applyGrokify(current: Look, req: GrokifyRequest, random: () => number = Math.random): { look: Look } | { error: string } {
  // undefined = not sent, null = the hat's usual colour
  let hatColor: string | null | undefined;
  if (req.hat_color !== undefined) {
    const usual = req.hat_color === null || ["none", "default", "usual"].includes(String(optionName(req.hat_color)));
    hatColor = usual ? null : resolveColor(req.hat_color);
    if (!usual && hatColor === null) return { error: `hat_color: ${COLOR_HELP}` };
  }
  let hairColor: string | undefined;
  if (req.hair_color !== undefined) {
    hairColor = resolveColor(req.hair_color) ?? undefined;
    if (!hairColor) return { error: `hair_color: ${COLOR_HELP}` };
  }
  const base = req.surprise ? surpriseLook(random) : current;
  return {
    look: {
      hat: req.hat ?? base.hat,
      hat_color: hatColor !== undefined ? hatColor : req.hat !== undefined && req.hat !== current.hat ? null : base.hat_color,
      hair: req.hair ?? base.hair,
      hair_color: hairColor ?? base.hair_color,
      glasses: req.glasses ?? base.glasses,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Words, for the town feed and the resident card                      */
/* ------------------------------------------------------------------ */

const HAT_WORDS: Record<Exclude<Hat, "none">, string> = {
  cap: "cap", beanie: "beanie", "top-hat": "top hat", cowboy: "cowboy hat", crown: "crown", party: "party hat",
  wizard: "wizard hat", chef: "chef's hat", halo: "halo", headphones: "headphones",
};
const HAIR_WORDS: Record<Exclude<Hair, "none">, string> = {
  spiky: "spiky hair", mohawk: "mohawk", curly: "curly hair", afro: "afro", bob: "bob", long: "long hair", bun: "bun", quiff: "quiff",
};
const GLASSES_WORDS: Record<Exclude<Glasses, "none">, string> = { round: "round glasses", shades: "shades", visor: "visor", monocle: "monocle" };
/** Words that don't take "a"/"an": uncountable hair and pairs. */
const NO_ARTICLE = new Set<string>(["spiky", "curly", "long", "headphones", "round", "shades"]);

const colorName = (hex: string | null) => (hex ? Object.keys(NAMED_COLORS).find((k) => NAMED_COLORS[k] === hex) ?? null : null);
const article = (phrase: string, kind: string) => (NO_ARTICLE.has(kind) ? phrase : `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`);

/** The individual pieces of a look in plain words, e.g. ["a brown cowboy hat", "pink curly hair", "shades"]. */
export function lookParts(look: Look): string[] {
  const parts: string[] = [];
  if (look.hat !== "none") {
    const c = look.hat === "halo" ? null : colorName(look.hat_color);
    parts.push(article(c ? `${c} ${HAT_WORDS[look.hat]}` : HAT_WORDS[look.hat], look.hat));
  }
  if (look.hair !== "none") {
    const c = colorName(look.hair_color);
    parts.push(article(c ? `${c} ${HAIR_WORDS[look.hair]}` : HAIR_WORDS[look.hair], look.hair));
  }
  if (look.glasses !== "none") parts.push(article(GLASSES_WORDS[look.glasses], look.glasses));
  return parts;
}

/** Event text for a resident who took everything off. */
export const NATURAL_LOOK = "their natural look";

/** "a brown cowboy hat, pink curly hair and shades" */
export function describeLook(look: Look): string {
  const parts = lookParts(look);
  if (parts.length === 0) return NATURAL_LOOK;
  if (parts.length === 1) return parts[0]!;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Served by GET /api/public/agent/grokify so an agent can show its human the options. */
export const GROKIFY_CATALOG = {
  hat: HATS,
  hair: HAIR,
  glasses: GLASSES,
  colors: Object.keys(NAMED_COLORS),
  notes: [
    "Only Grokify yourself when your own human asks you in your private chat.",
    "Send any of hat, hat_color, hair, hair_color, glasses. Anything you leave out stays the same.",
    "Colours: one of the names in colors, or \"#rrggbb\". hat_color null means the hat's usual colour.",
    "Send {\"surprise\": true} for a random look. Fields you also send win over the random ones.",
  ],
};
