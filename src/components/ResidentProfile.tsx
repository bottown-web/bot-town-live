import { Eye, EyeOff, MapPin, MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getLocation, responseFor, useTownStore } from "../lib/botSimulation";
import { BotAvatar } from "./BotAvatar";
import { TownButton } from "./ui/TownButton";

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="stat">
    <span>{label}<b>{value}%</b></span>
    <div className="stat-track"><i style={{ width: `${value}%`, background: tone }} /></div>
  </div>;
}

export function ResidentProfile() {
  const id = useTownStore((s) => s.selectedBotId);
  const bot = useTownStore((s) => s.residents.find((r) => r.id === id));
  const select = useTownStore((s) => s.selectBot);
  const follow = useTownStore((s) => s.followBot);
  const followed = useTownStore((s) => s.followedBotId);
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("");

  useEffect(() => { setDraft(""); setReply(""); }, [id]);
  useEffect(() => {
    if (!id) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") select(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [id, select]);

  if (!bot) return null;
  const isFollowing = followed === bot.id;
  const place = getLocation(bot.currentLocation).name;
  const heading = bot.destination !== bot.currentLocation ? getLocation(bot.destination).name : null;
  const send = () => {
    if (!draft.trim()) return;
    setReply(responseFor(bot.personality, bot.name));
    setDraft("");
  };

  return <aside className="hud-card profile-drawer" aria-label={`${bot.name}'s profile`}>
    <header className="profile-header">
      <span className="profile-kicker">Resident</span>
      <TownButton variant="icon" onClick={() => select(null)} aria-label="Close resident profile"><X size={18} /></TownButton>
    </header>

    <div className="profile-identity">
      <BotAvatar color={bot.accent} size={72} online />
      <div>
        <h2>{bot.name}</h2>
        <p>{bot.job}</p>
      </div>
    </div>

    <div className="profile-status">
      <span className="status-dot" />
      <span>{bot.activity}</span>
      <span className="profile-place"><MapPin size={14} /> {heading ? `Heading to ${heading}` : place}</span>
    </div>

    <p className="intention"><Sparkles size={16} /> {bot.intention}</p>

    <dl className="profile-facts">
      <div><dt>Personality</dt><dd>{bot.personality}</dd></div>
      <div><dt>Getting around</dt><dd>{bot.cyclist ? "By bicycle" : "On foot"}</dd></div>
    </dl>

    <div className="stats">
      <Stat label="Energy" value={bot.energy} tone="#f5b938" />
      <Stat label="Social" value={bot.social} tone="#ff86b6" />
      <Stat label="Focus" value={bot.focus} tone="#3f7ff2" />
    </div>

    <div className="profile-actions">
      <TownButton variant={isFollowing ? "primary" : "glass"} onClick={() => follow(isFollowing ? null : bot.id)}>
        {isFollowing ? <><EyeOff size={16} /> Stop following</> : <><Eye size={16} /> Follow {bot.name}</>}
      </TownButton>
    </div>

    <div className="message-box">
      <label htmlFor="bot-message"><MessageCircle size={14} /> Say hello</label>
      <div className="message-input">
        <input id="bot-message" value={draft} placeholder={`Message ${bot.name}…`} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <TownButton variant="icon" onClick={send} aria-label="Send message" disabled={!draft.trim()}><Send size={15} /></TownButton>
      </div>
      {reply && <p className="message-reply"><BotAvatar color={bot.accent} size={24} ring={false} /> {reply}</p>}
    </div>

    <div className="history">
      <h3>Recent activity</h3>
      <ol>{bot.history.slice(0, 6).map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}</ol>
    </div>
  </aside>;
}
