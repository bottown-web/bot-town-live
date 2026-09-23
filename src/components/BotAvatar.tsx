import type { CSSProperties } from "react";
import { cn } from "../lib/utils";

/** The resident's face as a flat HUD avatar — same rounded-cube shape and oval eyes as in the 3D town. */
export function BotAvatar({ color, size = 44, ring = true, online = false, className }: { color: string; size?: number; ring?: boolean; online?: boolean; className?: string }) {
  return <span className={cn("bot-avatar", ring && "has-ring", className)} style={{ "--bot": color, "--size": `${size}px` } as CSSProperties} aria-hidden="true">
    <span className="blob"><i /><i /></span>
    {online && <span className="online-dot" />}
  </span>;
}
