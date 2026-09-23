import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { useTownStore } from "../lib/botSimulation";
import { BotAvatar } from "./BotAvatar";

export function ResidentDock() {
  const residents = useTownStore((s) => s.residents);
  const selected = useTownStore((s) => s.selectedBotId);
  const select = useTownStore((s) => s.selectBot);
  const dock = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => dock.current?.scrollBy({ left: dir * 236, behavior: "smooth" });
  return <section className="hud-card resident-dock" aria-label="Town residents">
    <header className="dock-header"><span className="status-dot" /><h2>Town residents</h2><span className="online-count">{residents.length} online</span></header>
    <div className="dock-row">
      <button className="dock-arrow" onClick={() => scroll(-1)} aria-label="Previous residents"><ChevronLeft size={20} /></button>
      <div className="resident-scroll" ref={dock}>
        {residents.map((bot) => <button key={bot.id} className={`resident-chip ${selected === bot.id ? "is-selected" : ""}`} onClick={() => select(selected === bot.id ? null : bot.id)} aria-pressed={selected === bot.id}>
          <BotAvatar color={bot.accent} size={40} />
          <span>{bot.name}</span>
        </button>)}
      </div>
      <button className="dock-arrow" onClick={() => scroll(1)} aria-label="More residents"><ChevronRight size={20} /></button>
    </div>
  </section>;
}
