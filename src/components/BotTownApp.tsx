import { useEffect } from "react";
import { useTownStore } from "../lib/botSimulation";
import { startTownLink } from "../lib/townLive";
import { BotTownScene } from "./BotTownScene";
import { TownHUD } from "./TownHUD";

/** Opens a resident straight away for links like /?resident=chief-of-staff (agents share these with their humans). */
function followLinkedResident() {
  const handle = new URLSearchParams(window.location.search).get("resident")?.toLowerCase();
  if (!handle) return;
  const unsubscribe = useTownStore.subscribe((state) => {
    if (state.mode === "connecting") return;
    unsubscribe();
    if (state.residents.some((r) => r.id === handle)) state.followBot(handle);
  });
}

export function BotTownApp() {
  useEffect(() => {
    followLinkedResident();
    return startTownLink({
      onSnapshot: (snapshot) => useTownStore.getState().syncLive(snapshot),
      onUnavailable: () => useTownStore.getState().enterPreview(),
    });
  }, []);

  return (
    <main className="bot-town">
      <BotTownScene />
      <TownHUD />
    </main>
  );
}
