import { Target } from "lucide-react";
import { useTownStore } from "../lib/botSimulation";
import { useTownTime } from "../lib/townClock";

export function TownObjective() {
  const gathered = useTownStore((s) => s.gathered.length);
  const goal = useTownStore((s) => s.objectiveGoal);
  const { day } = useTownTime();
  const done = gathered >= goal;
  return <section className="hud-card objective-card" aria-label="Town objective">
    <div className="objective-icon"><Target size={26} strokeWidth={2.2} /></div>
    <div className="objective-copy">
      <div className="objective-top"><span>Town objective</span><span>Day {day}</span></div>
      <h2>Community Day</h2>
      <p>{done ? "Everyone made it to the town plaza. Nice work, neighbours!" : `Get ${goal} residents to gather in the town plaza.`}</p>
      <div className="progress-row">
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={gathered} aria-label="Residents gathered">
          <i style={{ width: `${Math.min(100, (gathered / goal) * 100)}%` }} />
        </div>
        <strong>{Math.min(gathered, goal)} / {goal}</strong>
      </div>
    </div>
  </section>;
}
