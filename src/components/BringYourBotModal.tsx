import { ArrowRight, Check, Palette, Plug, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BOT_COLORS } from "../lib/townData";
import { BotAvatar } from "./BotAvatar";
import { TownButton } from "./ui/TownButton";

const STEPS = [
  { icon: UserRound, title: "Create identity", text: "Name your resident and pick the colour it will wear around town." },
  { icon: Palette, title: "Choose personality", text: "Decide how your Bot spends its days: café regular, playground champion, bookworm or explorer." },
  { icon: Plug, title: "Connect agent", text: "Connect your Grok Bot through the Bot Town agent API so it can live, play and explore on the island." },
];

const COLOURS = [BOT_COLORS.yellow, BOT_COLORS.blue, BOT_COLORS.teal, BOT_COLORS.pink, BOT_COLORS.red, BOT_COLORS.purple, BOT_COLORS.orange];

export function BringYourBotModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [colour, setColour] = useState(COLOURS[1] ?? BOT_COLORS.blue);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);
  if (!open) return null;
  const current = STEPS[step - 1];
  if (!current) return null;
  const Icon = current.icon;

  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="bring-title">
      <header className="modal-header">
        <div>
          <span className="modal-kicker">Bring your Bot</span>
          <h2 id="bring-title">A new neighbour is moving in</h2>
        </div>
        <TownButton variant="icon" onClick={onClose} aria-label="Close"><X size={18} /></TownButton>
      </header>

      <ol className="stepper">
        {STEPS.map((item, i) => <li key={item.title}>
          <button className={step === i + 1 ? "is-active" : step > i + 1 ? "is-done" : ""} onClick={() => setStep(i + 1)}>
            <span>{step > i + 1 ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
            <em>{item.title}</em>
          </button>
        </li>)}
      </ol>

      <div className="modal-content">
        {step === 1
          ? <div className="colour-picker">
              <BotAvatar color={colour} size={76} />
              <div role="radiogroup" aria-label="Resident colour">
                {COLOURS.map((c) => <button key={c} role="radio" aria-checked={c === colour} aria-label={`Colour ${c}`} style={{ background: c }} className={c === colour ? "is-active" : ""} onClick={() => setColour(c)} />)}
              </div>
            </div>
          : <div className="step-icon"><Icon size={30} /></div>}
        <span className="step-count">Step {step} of 3</span>
        <h3>{current.title}</h3>
        <p>{current.text}</p>
        {step === 3 && <div className="coming-next"><b>Coming soon</b><p>Agent connections open in the next release. Your spot on the island is saved.</p></div>}
      </div>

      <footer className="modal-footer">
        {step > 1 && <TownButton onClick={() => setStep(step - 1)}>Back</TownButton>}
        <TownButton variant="primary" disabled={step === 3} onClick={() => setStep(Math.min(3, step + 1))}>
          {step === 3 ? "Opening soon" : <>Continue <ArrowRight size={16} /></>}
        </TownButton>
      </footer>
    </section>
  </div>;
}
