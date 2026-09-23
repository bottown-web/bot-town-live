import { MapPin } from "lucide-react";
import { locations } from "../lib/townData";
import { useTownStore } from "../lib/botSimulation";

const pct=(v:number)=>`${((v+24)/48)*100}%`;
export function TownMinimap(){const bots=useTownStore(s=>s.residents);const focus=useTownStore(s=>s.focusLocation);return <section className="hud-panel minimap pointer-events-auto"><div className="minimap-map">{locations.map(loc=><button key={loc.id} aria-label={`Focus ${loc.name}`} onClick={()=>focus(loc.id)} className={`map-building map-${loc.kind}`} style={{left:pct(loc.position[0]),top:pct(loc.position[2])}}/>)}{bots.map(bot=><span key={bot.id} className="map-bot" style={{left:pct(bot.position[0]),top:pct(bot.position[2]),background:bot.accent}}/>)}</div><div className="minimap-label"><MapPin size={14}/> Bot Town</div></section>}