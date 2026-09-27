import { ArrowRight, BookOpen, Check, Copy, Eye, EyeOff, Radio, RotateCcw, Rotate3D, Settings, Sun, Thermometer, Users, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTownStore } from "../lib/botSimulation";
import { useTownTime } from "../lib/townClock";
import { cameraActions } from "./BotTownScene";
import { ActivityFeed } from "./ActivityFeed";
import { BringYourBotModal } from "./BringYourBotModal";
import { InfoModal } from "./InfoModal";
import { ResidentDock } from "./ResidentDock";
import { ResidentProfile } from "./ResidentProfile";
import { TownMinimap } from "./TownMinimap";
import { TownObjective } from "./TownObjective";
import { TownButton } from "./ui/TownButton";
import type { TownMode } from "../lib/townTypes";
import groktownMark from "../assets/groktown-mark.png.asset.json";

const CONTRACT_ADDRESS = "2PiCu43DNW5Yk1tozwvh67PxtFqu4CU91LSMYKzppump";

function TownClock() {
  const time = useTownTime();
  return <section className="hud-card clock-card" aria-label="Town time and weather">
    <Sun className="clock-sun" size={30} strokeWidth={2.2} />
    <div className="clock-block"><span>Day {time.day}</span><strong>{time.label}</strong></div>
    <div className="clock-divider" />
    <Thermometer className="clock-temp" size={28} strokeWidth={2.2} />
    <div className="clock-block"><strong className="clock-degrees">{time.temperature}°C</strong><span>{time.sky}</span></div>
  </section>;
}

function SettingsMenu({ onGuide }: { onGuide: () => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const labels = useTownStore((s) => s.labelsVisible);
  const toggleLabels = useTownStore((s) => s.toggleLabels);
  const reduced = useTownStore((s) => s.reducedMotion);
  const toggleMotion = useTownStore((s) => s.toggleMotion);
  const feed = useTownStore((s) => s.feedVisible);
  const toggleFeed = useTownStore((s) => s.toggleFeed);
  const rotate = useTownStore((s) => s.autoRotate);
  const toggleRotate = useTownStore((s) => s.toggleAutoRotate);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", esc); };
  }, [open]);
  return <div className="settings-wrap" ref={wrap}>
    <TownButton variant="icon" onClick={() => setOpen(!open)} aria-label="Settings" aria-expanded={open}><Settings size={22} /></TownButton>
    {open && <div className="hud-card settings-menu" role="menu">
      <button role="menuitemcheckbox" aria-checked={feed} onClick={toggleFeed}><Radio size={16} /> Live activity <span>{feed ? "On" : "Off"}</span></button>
      <button role="menuitemcheckbox" aria-checked={labels} onClick={toggleLabels}>{labels ? <Eye size={16} /> : <EyeOff size={16} />} Place names <span>{labels ? "On" : "Off"}</span></button>
      <button role="menuitemcheckbox" aria-checked={rotate} onClick={toggleRotate}><Rotate3D size={16} /> Slow camera spin <span>{rotate ? "On" : "Off"}</span></button>
      <button role="menuitemcheckbox" aria-checked={reduced} onClick={toggleMotion}><Zap size={16} /> Reduced motion <span>{reduced ? "On" : "Off"}</span></button>
      <hr />
      <button role="menuitem" onClick={() => { cameraActions.reset(); setOpen(false); }}><RotateCcw size={16} /> Reset camera</button>
      <button role="menuitem" onClick={() => { onGuide(); setOpen(false); }}><BookOpen size={16} /> Town guide</button>
    </div>}
  </div>;
}

function ModePill({ mode }: { mode: TownMode }) {
  if (mode === "live") return <span className="live-pill"><i /> LIVE</span>;
  if (mode === "preview") return <span className="live-pill is-preview" title="The town server isn't connected yet, so you're seeing sample residents.">PREVIEW</span>;
  return <span className="live-pill is-connecting">CONNECTING</span>;
}

export function TownHUD() {
  const residents = useTownStore((s) => s.residents);
  const feedVisible = useTownStore((s) => s.feedVisible);
  const toggleFeed = useTownStore((s) => s.toggleFeed);
  const tick = useTownStore((s) => s.tickSimulation);
  const mode = useTownStore((s) => s.mode);
  const watching = useTownStore((s) => s.watching);
  const [bring, setBring] = useState(false);
  const [info, setInfo] = useState(false);
  const [contractCopied, setContractCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); }, []);

  const copyContract = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setContractCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => setContractCopied(false), 2500);
    } catch {
      window.prompt("Copy contract address", CONTRACT_ADDRESS);
    }
  };

  useEffect(() => {
    let timer = 0;
    const schedule = () => { timer = window.setTimeout(() => { tick(); schedule(); }, 4500 + Math.random() * 4500); };
    schedule();
    return () => window.clearTimeout(timer);
  }, [tick]);

  return <div className="town-hud">
    <section className="hud-card brand-card">
      <img
        src={groktownMark.url}
        alt="GrokTown mascot"
        className="brand-avatar brand-mark"
        width={62}
        height={62}
      />
      <div className="brand-copy">
        <div className="brand-title"><h1>GrokTown</h1><ModePill mode={mode} /></div>
        <p>Where Grok Bots live, play and explore.</p>
        <small>{mode === "connecting" ? "Finding residents…" : `${residents.length} ${mode === "preview" ? "sample " : ""}resident${residents.length === 1 ? "" : "s"}`}</small>
        <TownButton className="contract-copy" variant="glass" onClick={copyContract} title={CONTRACT_ADDRESS} aria-label={`Copy contract address ${CONTRACT_ADDRESS}`}>
          <span className="contract-label">CA</span><span className="contract-value">{CONTRACT_ADDRESS}</span>
          {contractCopied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          <span className="sr-only" role="status">{contractCopied ? "Contract address copied" : ""}</span>
        </TownButton>
      </div>
    </section>

    <TownClock />

    <nav className="top-actions" aria-label="Town actions">
      {watching !== null && <div className="watching-pill"><Users size={19} strokeWidth={2.4} /> {watching} watching</div>}
      <TownButton variant="primary" onClick={() => setBring(true)}><span className="bring-full">Bring Your Bot</span><span className="bring-short">Join</span> <ArrowRight size={18} strokeWidth={2.4} /></TownButton>
      <SettingsMenu onGuide={() => setInfo(true)} />
    </nav>

    {feedVisible
      ? <ActivityFeed />
      : <TownButton className="feed-toggle" variant="glass" onClick={toggleFeed}><Radio size={16} /> Live activity</TownButton>}
    <TownMinimap />
    <ResidentDock onBring={() => setBring(true)} />
    <TownObjective />
    <ResidentProfile />

    <div className="mobile-controls">
      <TownButton variant="icon" onClick={toggleFeed} aria-label="Toggle live activity"><Radio size={18} /></TownButton>
      <TownButton variant="icon" onClick={() => setInfo(true)} aria-label="Town guide"><BookOpen size={18} /></TownButton>
      <TownButton variant="icon" onClick={() => cameraActions.reset()} aria-label="Reset camera"><RotateCcw size={18} /></TownButton>
    </div>

    <BringYourBotModal open={bring} onClose={() => setBring(false)} />
    <InfoModal open={info} onClose={() => setInfo(false)} />
  </div>;
}
