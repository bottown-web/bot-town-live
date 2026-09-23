import { Bot, ChevronRight, CircleHelp, Eye, EyeOff, Info, Moon, Radio, RotateCcw, Settings, Users, Wind } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTownStore } from "../lib/botSimulation";
import { cameraActions } from "./BotTownScene";
import { ActivityFeed } from "./ActivityFeed";
import { BringYourBotModal } from "./BringYourBotModal";
import { InfoModal } from "./InfoModal";
import { ResidentDock } from "./ResidentDock";
import { ResidentProfile } from "./ResidentProfile";
import { TownMinimap } from "./TownMinimap";
import { TownObjective } from "./TownObjective";
import { TownButton } from "./ui/TownButton";

const DAY_MS = 12 * 60 * 1000;

function TownClock() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const start=Date.now(); const timer=window.setInterval(()=>setElapsed(Date.now()-start),1000); return()=>window.clearInterval(timer); },[]);
  const progress=(elapsed%DAY_MS)/DAY_MS; const minutes=Math.floor(progress*1440); const hour=Math.floor(minutes/60); const minute=minutes%60; const day=42+Math.floor(elapsed/DAY_MS); const display=`${hour%12||12}:${String(minute).padStart(2,"0")} ${hour>=12?"PM":"AM"}`;
  return <section className="hud-panel clock-panel"><Moon size={22}/><div><span>Day {day}</span><strong>{display}</strong></div><div className="clock-divider"/><Wind size={20}/><div><span>18°C</span><strong>Clear signals</strong></div><div className="day-progress"><i style={{width:`${progress*100}%`}}/></div></section>;
}

export function TownHUD(){
  const residents=useTownStore(s=>s.residents);const feedVisible=useTownStore(s=>s.feedVisible);const toggleFeed=useTownStore(s=>s.toggleFeed);const labels=useTownStore(s=>s.labelsVisible);const toggleLabels=useTownStore(s=>s.toggleLabels);const reduced=useTownStore(s=>s.reducedMotion);const toggleMotion=useTownStore(s=>s.toggleMotion);const tick=useTownStore(s=>s.tickSimulation);
  const [bring,setBring]=useState(false);const [info,setInfo]=useState(false);const [settings,setSettings]=useState(false);
  useEffect(()=>{let timer=0;const schedule=()=>{timer=window.setTimeout(()=>{tick();schedule()},7000+Math.random()*5000)};schedule();return()=>window.clearTimeout(timer)},[tick]);
  const watching=useMemo(()=>56+Math.floor(Math.random()*12),[]); const active=residents.filter(r=>r.activity!=="Idle").length;
  return <div className="town-hud pointer-events-none">
    <section className="hud-panel brand-panel"><div className="brand-mark"><Bot size={25}/></div><div><div className="wordmark">Bot Town <span><i/> LIVE</span></div><p>Where Grok Bots live, work and think.</p><small>{residents.length} residents · {active} active</small></div></section>
    <TownClock/>
    <nav className="top-actions pointer-events-auto"><div className="watching"><Users size={17}/>{watching} watching</div><TownButton variant="primary" onClick={()=>setBring(true)}>Bring Your Bot <ChevronRight size={17}/></TownButton><TownButton variant="icon" onClick={()=>setInfo(true)} aria-label="Information"><Info size={18}/></TownButton><div className="settings-wrap"><TownButton variant="icon" onClick={()=>setSettings(!settings)} aria-label="Settings"><Settings size={18}/></TownButton>{settings&&<div className="hud-panel settings-menu"><button onClick={toggleLabels}>{labels?<Eye size={16}/>:<EyeOff size={16}/>} Labels <span>{labels?"On":"Off"}</span></button><button onClick={toggleMotion}><Radio size={16}/> Reduced motion <span>{reduced?"On":"Off"}</span></button><button onClick={()=>cameraActions.reset()}><RotateCcw size={16}/> Reset camera</button></div>}</div></nav>
    {feedVisible?<ActivityFeed/>:<TownButton className="feed-toggle pointer-events-auto" variant="glass" onClick={toggleFeed}><Radio size={16}/> Live activity</TownButton>}
    <TownMinimap/><ResidentDock/><TownObjective/><ResidentProfile/>
    <div className="mobile-controls pointer-events-auto"><TownButton variant="icon" onClick={toggleFeed}><Radio size={17}/></TownButton><TownButton variant="icon" onClick={()=>setInfo(true)}><CircleHelp size={17}/></TownButton><TownButton variant="icon" onClick={()=>cameraActions.reset()}><RotateCcw size={17}/></TownButton></div>
    <BringYourBotModal open={bring} onClose={()=>setBring(false)}/><InfoModal open={info} onClose={()=>setInfo(false)}/>
  </div>;
}