import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useTownStore } from "../lib/botSimulation";
import { ROAD, ROAD_LENGTH, roadPoint, TOWN_COLORS } from "../lib/townData";

const LANE = -0.9; // inner lane, next to the bus stop
const SPEED = 5.2;
const STOP_S = 2 * (ROAD.hx - ROAD.radius) * 0.5 + 13; // x = 13 on the south edge
const DWELL = 4.5;

function busPose(s: number) {
  const p = roadPoint(s);
  return { x: p.x - p.tz * LANE, z: p.z + p.tx * LANE, yaw: Math.atan2(p.tx, p.tz) };
}

export function TownBus() {
  const ref = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const state = useRef({ s: STOP_S - 22, wait: 0 });
  const reduced = useTownStore((s) => s.reducedMotion);

  useFrame((_, rawDelta) => {
    const group = ref.current;
    if (!group) return;
    const dt = Math.min(rawDelta, 0.05);
    const st = state.current;
    if (reduced) {
      st.s = STOP_S;
    } else if (st.wait > 0) {
      st.wait -= dt;
    } else {
      // Ease in to the stop.
      const toStop = ((STOP_S - st.s) % ROAD_LENGTH + ROAD_LENGTH) % ROAD_LENGTH;
      const speed = toStop < 7 ? Math.max(0.6, SPEED * (toStop / 7)) : SPEED;
      const next = st.s + speed * dt;
      if (toStop > 0.05 && toStop <= speed * dt + 0.05) { st.s = STOP_S; st.wait = DWELL; }
      else st.s = next % ROAD_LENGTH;
      if (wheels.current) wheels.current.children.forEach((w) => { w.rotation.x += (speed * dt) / 0.42; });
    }
    const pose = busPose(st.s);
    group.position.set(pose.x, 0.05, pose.z);
    group.rotation.y = pose.yaw;
  });

  const body = "#f7f4ee";
  const stripe = "#3d5fa8";
  return <group ref={ref}>
    {/* Body — the bus faces +z */}
    <mesh position-y={1.35} castShadow receiveShadow><boxGeometry args={[2.2, 2.1, 6]} /><meshStandardMaterial color={body} roughness={0.5} /></mesh>
    <mesh position-y={2.46}><boxGeometry args={[2.1, 0.14, 5.8]} /><meshStandardMaterial color="#e9e5dc" /></mesh>
    <mesh position-y={0.62}><boxGeometry args={[2.24, 0.5, 6.04]} /><meshStandardMaterial color={stripe} roughness={0.5} /></mesh>
    <mesh position-y={1.02}><boxGeometry args={[2.25, 0.1, 6.05]} /><meshStandardMaterial color="#e2483c" /></mesh>
    {/* Window band */}
    <mesh position-y={1.72}><boxGeometry args={[2.24, 0.78, 5.2]} /><meshStandardMaterial color="#2c3b57" roughness={0.15} metalness={0.3} /></mesh>
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 1.72, -2.2 + i * 0.86]}><boxGeometry args={[2.27, 0.8, 0.08]} /><meshStandardMaterial color={body} /></mesh>)}
    {/* Windscreen, destination sign, lights */}
    <mesh position={[0, 1.7, 3.01]}><boxGeometry args={[1.9, 1.05, 0.04]} /><meshStandardMaterial color="#2c3b57" roughness={0.1} metalness={0.3} /></mesh>
    <mesh position={[0, 2.33, 3.02]}><boxGeometry args={[1.5, 0.22, 0.03]} /><meshStandardMaterial color="#ffb347" emissive="#ffb347" emissiveIntensity={0.8} toneMapped={false} /></mesh>
    {[-0.78, 0.78].map((x) => <mesh key={x} position={[x, 0.78, 3.03]}><boxGeometry args={[0.32, 0.18, 0.03]} /><meshStandardMaterial color="#fff6d8" emissive="#fff2c4" emissiveIntensity={1.4} toneMapped={false} /></mesh>)}
    {[-0.78, 0.78].map((x) => <mesh key={x} position={[x, 0.78, -3.03]}><boxGeometry args={[0.3, 0.16, 0.03]} /><meshStandardMaterial color="#ff5a4f" emissive="#ff3b30" emissiveIntensity={0.9} /></mesh>)}
    {/* Door on the kerb side */}
    <mesh position={[-1.12, 1.25, 1.9]}><boxGeometry args={[0.04, 1.8, 0.9]} /><meshStandardMaterial color="#2c3b57" roughness={0.1} /></mesh>
    <group ref={wheels}>
      {[-1.9, 1.9].flatMap((z) => [-1.02, 1.02].map((x) => <mesh key={`${x}${z}`} position={[x, 0.42, z]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.3, 14]} /><meshStandardMaterial color={TOWN_COLORS.iron} roughness={0.8} />
      </mesh>))}
    </group>
  </group>;
}
