import { Html, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTownStore } from "../lib/botSimulation";
import { hashString, locationById, routeBetween } from "../lib/townData";
import type { BotResident, GroundPoint } from "../lib/townTypes";
import { BeachBall, Bicycle, Book, CoffeeCup, PottedPlant } from "./TownProps";

/** Residents are drawn a touch larger than life so they read clearly from the default camera. */
const BOT_SCALE = 1.25;

export const botObjectRefs = new Map<string, THREE.Group>();

const SEATED = new Set(["Reading", "Resting"]);
const SEAT_HEIGHT = 0.5;

function shortestAngle(from: number, to: number) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** A cute rounded-cube resident with big oval eyes. Shared with the HUD portrait style. */
function BlobBody({ color, selected }: { color: string; selected: boolean }) {
  return <>
    <RoundedBox args={[1, 0.98, 0.9]} radius={0.34} smoothness={4} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.42} emissive={color} emissiveIntensity={selected ? 0.18 : 0.04} />
    </RoundedBox>
    {[-0.19, 0.19].map((x) => <group key={x} position={[x, 0.1, 0.44]}>
      <mesh scale={[0.085, 0.14, 0.05]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color="#17191d" roughness={0.25} /></mesh>
      <mesh position={[0.025, 0.055, 0.04]}><sphereGeometry args={[0.024, 8, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>
    </group>)}
  </>;
}

export function BotResident3D({ bot }: { bot: BotResident }) {
  const ref = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const feet = useRef<THREE.Group>(null);
  const ball = useRef<THREE.Group>(null);
  const select = useTownStore((s) => s.selectBot);
  const selected = useTownStore((s) => s.selectedBotId === bot.id);
  const reduced = useTownStore((s) => s.reducedMotion);
  const route = useRef<GroundPoint[]>([]);
  const routeFor = useRef<string | null>(null);
  const seed = useMemo(() => hashString(bot.id), [bot.id]);
  const idleYaw = useMemo(() => ((seed % 100) / 100 - 0.5) * 0.7, [seed]);

  useEffect(() => {
    if (ref.current) botObjectRefs.set(bot.id, ref.current);
    return () => { botObjectRefs.delete(bot.id); };
  }, [bot.id]);

  const walking = bot.activity === "Walking";
  const onBike = walking && bot.cyclist;
  const seated = !walking && bot.currentLocation === "park" && SEATED.has(bot.activity);

  useFrame(({ clock }, rawDelta) => {
    const group = ref.current;
    if (!group) return;
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime + (seed % 10);
    const resident = useTownStore.getState().residents.find((r) => r.id === bot.id);
    if (!resident) return;
    const isWalking = resident.activity === "Walking";

    if (isWalking) {
      const key = `${resident.currentLocation}>${resident.destination}`;
      if (routeFor.current !== key) {
        routeFor.current = key;
        route.current = routeBetween(resident.currentLocation, resident.destination, resident.id, [group.position.x, group.position.z]);
      }
      const next = route.current[0];
      if (!next) {
        routeFor.current = null;
        useTownStore.getState().arrive(resident.id);
        return;
      }
      const dx = next[0] - group.position.x;
      const dz = next[1] - group.position.z;
      const dist = Math.hypot(dx, dz);
      const speed = (resident.cyclist ? 4.2 : 2.3) * (reduced ? 0.7 : 1);
      if (dist < 0.12) {
        route.current.shift();
      } else {
        const step = Math.min(dist, speed * dt);
        group.position.x += (dx / dist) * step;
        group.position.z += (dz / dist) * step;
        const yaw = Math.atan2(dx, dz);
        group.rotation.y += shortestAngle(group.rotation.y, yaw) * (1 - Math.exp(-10 * dt));
      }
    } else {
      routeFor.current = null;
      const facing = locationById(resident.currentLocation).facing + idleYaw;
      group.rotation.y += shortestAngle(group.rotation.y, facing) * (1 - Math.exp(-3 * dt));
    }

    const b = body.current;
    if (b) {
      const baseY = (onBike ? 0.62 : 0) + (seated ? SEAT_HEIGHT : 0);
      if (reduced) {
        b.position.y = baseY + 0.55;
        b.scale.set(1, 1, 1);
      } else if (isWalking && !resident.cyclist) {
        const hop = Math.abs(Math.sin(t * 8));
        b.position.y = baseY + 0.55 + hop * 0.16;
        b.scale.set(1 + (1 - hop) * 0.05, 1 - (1 - hop) * 0.07, 1 + (1 - hop) * 0.05);
      } else {
        const breathe = Math.sin(t * 2.1) * 0.02;
        b.position.y = baseY + 0.55;
        b.scale.set(1 - breathe * 0.5, 1 + breathe, 1 - breathe * 0.5);
      }
    }
    if (feet.current) {
      const [left, right] = feet.current.children;
      const swing = isWalking && !resident.cyclist && !reduced ? Math.sin(t * 8) * 0.14 : 0;
      if (left) left.position.z = swing;
      if (right) right.position.z = -swing;
    }
    if (ball.current) ball.current.position.y = 1.55 + (reduced ? 0 : Math.abs(Math.sin(t * 3)) * 0.45);
  });

  const accessory = !walking && (() => {
    switch (bot.activity) {
      case "Reading": return <Book position={[0, 0.55, 0.62]} />;
      case "Playing": return <group ref={ball} position={[0.28, 1.55, 0.25]}><BeachBall scale={0.9} /></group>;
      case "Having coffee": return <CoffeeCup position={[0.52, 0.5, 0.32]} />;
      case "Shopping": return <PottedPlant position={[0, 0.02, 0.62]} scale={0.75} />;
      default: return null;
    }
  })();

  const feetY = (onBike ? 0.62 : 0) + (seated ? SEAT_HEIGHT / BOT_SCALE : 0);

  return <group ref={ref} position={bot.position} scale={BOT_SCALE} onClick={(e) => { e.stopPropagation(); select(bot.id); }}>
    {onBike && <Bicycle color={bot.accent === "#33cdc3" ? "#e2483c" : "#33cdc3"} />}
    <group ref={feet} position={[0, feetY + 0.05, seated ? 0.35 : 0]}>
      {[-0.22, 0.22].map((x) => <mesh key={x} position-x={x} scale={[0.15, 0.08, 0.2]} castShadow>
        <sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#2a2d33" roughness={0.6} />
      </mesh>)}
    </group>
    <group ref={body} position-y={0.55}>
      <BlobBody color={bot.accent} selected={selected} />
      {accessory}
    </group>
    {selected && <mesh rotation-x={-Math.PI / 2} position-y={0.2}>
      <ringGeometry args={[0.72, 0.88, 40]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
    </mesh>}
    {(selected || bot.speech) && <Html position={[0, seated ? 2.2 : 1.8, 0]} center distanceFactor={20} zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
      <div className={selected && !bot.speech ? "bot-nameplate" : "speech-bubble"}>
        {selected && <b><i style={{ background: bot.accent }} />{bot.name}</b>}
        {bot.speech && <span>{bot.speech}</span>}
      </div>
    </Html>}
  </group>;
}
