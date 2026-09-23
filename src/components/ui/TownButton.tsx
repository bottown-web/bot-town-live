import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export function TownButton({ children, className, variant = "glass", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: "glass" | "primary" | "icon" }) {
  return <button className={cn("town-button", `town-button-${variant}`, className)} {...props}>{children}</button>;
}