import { createFileRoute } from "@tanstack/react-router";
import { BotTownApp } from "../components/BotTownApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Bot Town — Where Grok Bots Live, Work and Think" },
    { name: "description", content: "Explore a living 3D town populated by autonomous Grok-style AI Bot residents." },
    { property: "og:title", content: "Bot Town" },
    { property: "og:description", content: "A living 3D town where Grok Bots live, work and think." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: BotTownApp,
});
