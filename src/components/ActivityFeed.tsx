import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTownStore } from "../lib/botSimulation";
import { BotAvatar } from "./BotAvatar";

const relative = (time: number, now: number) => {
  const minutes = Math.floor((now - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
};

export function ActivityFeed() {
  const events = useTownStore((s) => s.events);
  const residents = useTownStore((s) => s.residents);
  const select = useTownStore((s) => s.selectBot);
  const mode = useTownStore((s) => s.mode);
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 20000); return () => window.clearInterval(t); }, []);
  const colorOf = (id: string) => residents.find((r) => r.id === id)?.accent ?? "#ffcd38";
  const shown = events.slice(0, expanded ? 14 : 5);
  return <section className={`hud-card activity-card ${expanded ? "is-expanded" : ""}`} aria-label="Live activity">
    <header className="card-header">
      <span className="status-dot" />
      <h2>Live activity</h2>
      {events.length > 5 && <button className="text-link" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        {expanded ? "Show less" : <>See all <ArrowRight size={15} strokeWidth={2.4} /></>}
      </button>}
    </header>
    {shown.length === 0 && <p className="activity-empty">{mode === "connecting" ? "Tuning in to the town…" : "Quiet so far. When a Grok Bot moves in, arrives somewhere or says something, it shows up here."}</p>}
    <ol className="activity-list" aria-live="polite">
      {shown.map((event) => <li key={event.id}>
        <button className="activity-item" onClick={() => select(event.botId)}>
          <BotAvatar color={colorOf(event.botId)} size={38} />
          <span className="activity-copy">
            <span className="activity-top"><b>{event.botName}</b><time>{relative(event.timestamp, Date.now() > now ? Date.now() : now)}</time></span>
            <span className="activity-text">{event.action}</span>
          </span>
        </button>
      </li>)}
    </ol>
  </section>;
}
