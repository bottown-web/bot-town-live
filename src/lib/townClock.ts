import { useEffect, useState } from "react";

/**
 * Town time. The town lives through sunny daytime hours only (8 AM – 7 PM),
 * one town minute every 5 real seconds, starting at Day 42, 1:30 PM.
 */
const START_REAL = Date.now();
const START_DAY = 42;
const DAY_START_MIN = 8 * 60;
const DAY_LENGTH_MIN = 11 * 60;
const START_OFFSET_MIN = 13 * 60 + 30 - DAY_START_MIN;
const REAL_MS_PER_MIN = 5000;

export interface TownTime {
  day: number;
  hour: number;
  minute: number;
  label: string;
  temperature: number;
  sky: string;
  /** 0 → 1 through the day. */
  progress: number;
}

export function readTownTime(now = Date.now()): TownTime {
  const elapsed = START_OFFSET_MIN + Math.floor((now - START_REAL) / REAL_MS_PER_MIN);
  const day = START_DAY + Math.floor(elapsed / DAY_LENGTH_MIN);
  const minuteOfDay = DAY_START_MIN + (elapsed % DAY_LENGTH_MIN);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const label = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  const progress = (minuteOfDay - DAY_START_MIN) / DAY_LENGTH_MIN;
  const temperature = Math.round(18 + 4 * Math.sin(Math.min(1, Math.max(0, (minuteOfDay - DAY_START_MIN) / 660)) * Math.PI));
  const sky = hour < 10 ? "Morning sun" : hour >= 17 ? "Golden hour" : "Clear skies";
  return { day, hour, minute, label, temperature, sky, progress };
}

export function useTownTime() {
  const [time, setTime] = useState(readTownTime);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(readTownTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return time;
}
