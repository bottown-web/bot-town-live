import { Activity, BatteryCharging, Coffee, Footprints, MessageCircle, Radar, Sparkles, X } from "lucide-react";
import { useTownStore } from "../lib/botSimulation";
import { TownButton } from "./ui/TownButton";

const icons = { chat: MessageCircle, scan: Radar, compute: Activity, cup: Coffee, bolt: BatteryCharging, walk: Footprints, spark: Sparkles, discover: Sparkles, home: BatteryCharging };
const relative=(time:number)=>{const sec=Math.max(1,Math.floor((Date.now()-time)/1000));return sec<60?"now":`${Math.floor(sec/60)}m`};

export function ActivityFeed(){const allEvents=useTownStore(s=>s.events);const events=allEvents.slice(0,6);const toggle=useTownStore(s=>s.toggleFeed);return <section className="hud-panel activity-panel pointer-events-auto" aria-label="Live activity"><header className="panel-header"><span className="status-dot"/><b>Live activity</b><TownButton variant="icon" onClick={toggle} aria-label="Close activity feed"><X size={16}/></TownButton></header><div className="activity-list">{events.map((event,i)=>{const Icon=icons[event.icon as keyof typeof icons]??Activity;return <article key={event.id} className="activity-item" style={{animationDelay:`${i*35}ms`}}><span className="activity-icon"><Icon size={15}/></span><div><b>{event.botName}</b><p>{event.action}</p></div><time>{relative(event.timestamp)}</time></article>})}</div></section>}