import { useEffect, useRef } from "react";
import { cameraActions } from "./BotTownScene";
import { TownHUD } from "./TownHUD";

export function BotTownApp() {
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const send = (action: string) =>
      frame.current?.contentWindow?.postMessage({ botTown: action }, "*");
    cameraActions.reset = () => send("reset");
    return () => {
      cameraActions.reset = () => {};
    };
  }, []);

  return (
    <main className="bot-town bot-town-uploaded">
      <iframe
        ref={frame}
        className="uploaded-town-frame"
        src="/bot-town.html?embed=1"
        title="Bot Town interactive 3D town"
        allow="fullscreen"
      />
      <TownHUD />
    </main>
  );
}
