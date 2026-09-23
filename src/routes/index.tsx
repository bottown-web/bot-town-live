import { createFileRoute } from "@tanstack/react-router";
import { BotTownApp } from "../components/BotTownApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Bot Town — Where Grok Bots Live, Play and Explore" },
    { name: "description", content: "Watch a cozy seaside 3D town where Grok Bot residents live, play and explore in real time." },
    { property: "og:title", content: "Bot Town" },
    { property: "og:description", content: "A cozy island town where Grok Bots live, play and explore." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: BotTownApp,
});
