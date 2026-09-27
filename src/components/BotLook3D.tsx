import { RoundedBox } from "@react-three/drei";
import { memo } from "react";
import * as THREE from "three";
import { hatColor, lookKey, type Hair, type Hat, type Look } from "../lib/grokify";

/*
 * Grokify accessories, drawn in the resident's body space (see BlobBody in BotResident3D):
 * the body is a rounded cube 1 wide, 0.98 tall and 0.9 deep, centred on the origin, facing +z.
 * Its top is at y ≈ 0.49 and its eyes sit at x ±0.19, y 0.1, z ≈ 0.45.
 */

/** How far hair pushes a hat up. */
const HAIR_LIFT: Record<Hair, number> = { none: 0, spiky: 0.07, mohawk: 0.09, curly: 0.1, afro: 0.3, bob: 0.07, long: 0.07, bun: 0.07, quiff: 0.1 };
const HAIR_TOP: Record<Hair, number> = { none: 0.49, spiky: 0.78, mohawk: 0.84, curly: 0.68, afro: 0.93, bob: 0.58, long: 0.58, bun: 0.86, quiff: 0.75 };
const HAT_TOP: Record<Hat, number> = { none: 0.49, cap: 0.74, beanie: 0.9, "top-hat": 1.04, cowboy: 0.88, crown: 0.84, party: 1.22, wizard: 1.48, chef: 1.1, halo: 1.0, headphones: 0.64 };

/** Highest point of a look in body space, so props and speech bubbles can sit above it. */
export function lookTop(look: Look | undefined) {
  if (!look) return 0.49;
  return Math.max(HAIR_TOP[look.hair], look.hat === "none" ? 0 : HAT_TOP[look.hat] + HAIR_LIFT[look.hair]);
}

const TAU = Math.PI * 2;
const Std = ({ c, r = 0.6, m = 0, e }: { c: string; r?: number; m?: number; e?: number }) =>
  <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e ? c : "#000000"} emissiveIntensity={e ?? 0} />;

/* ------------------------------------------------------------------ hair */

function HairCap({ c, rim = 0.27 }: { c: string; rim?: number }) {
  return <mesh position-y={rim} scale={[1, 0.62, 0.96]} castShadow>
    <sphereGeometry args={[0.535, 26, 12, 0, TAU, 0, Math.PI / 2]} />
    <meshStandardMaterial color={c} roughness={0.75} side={THREE.DoubleSide} />
  </mesh>;
}

const SPIKES: Array<[number, number, number]> = [[0, 0.02, 0.34], [-0.22, 0.08, 0.3], [0.22, 0.08, 0.3], [-0.12, -0.2, 0.32], [0.12, -0.2, 0.32], [-0.3, -0.12, 0.26], [0.3, -0.12, 0.26], [0, -0.34, 0.26]];
const CURLS: Array<[number, number, number, number]> = [
  [-0.26, 0.5, 0.2, 0.13], [0, 0.53, 0.22, 0.14], [0.26, 0.5, 0.2, 0.13],
  [-0.3, 0.55, -0.02, 0.15], [-0.08, 0.6, 0, 0.16], [0.16, 0.59, -0.02, 0.16], [0.34, 0.54, 0, 0.14],
  [-0.22, 0.54, -0.26, 0.15], [0.04, 0.57, -0.26, 0.16], [0.28, 0.52, -0.26, 0.14],
  [-0.42, 0.34, -0.12, 0.13], [0.42, 0.34, -0.12, 0.13], [0, 0.4, -0.42, 0.15],
];

function HairPiece({ hair, c }: { hair: Hair; c: string }) {
  switch (hair) {
    case "spiky":
      return <group>
        <mesh position-y={0.45} scale={[0.46, 0.14, 0.44]} castShadow><sphereGeometry args={[1, 18, 10]} /><Std c={c} r={0.7} /></mesh>
        {SPIKES.map(([x, z, h], i) => <mesh key={i} position={[x, 0.49 + h / 2 - 0.04, z]} rotation={[z * 1.3, 0, -x * 1.5]} castShadow>
          <coneGeometry args={[0.1, h, 8]} /><Std c={c} r={0.7} />
        </mesh>)}
      </group>;
    case "mohawk":
      return <group>
        {[[0.24, 0.26], [0.1, 0.34], [-0.05, 0.36], [-0.2, 0.32], [-0.34, 0.24]].map(([z, h], i) =>
          <mesh key={i} position={[0, 0.47 + h! / 2 - 0.03, z!]} rotation-x={-0.25} scale={[0.42, 1, 1.25]} castShadow>
            <coneGeometry args={[0.12, h!, 10]} /><Std c={c} r={0.65} />
          </mesh>)}
      </group>;
    case "curly":
      return <group>{CURLS.map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]} castShadow>
        <icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={c} roughness={0.8} flatShading />
      </mesh>)}</group>;
    case "afro":
      return <mesh position={[0, 0.52, -0.08]} scale={[0.6, 0.41, 0.53]} castShadow>
        <icosahedronGeometry args={[1, 2]} /><meshStandardMaterial color={c} roughness={0.9} flatShading />
      </mesh>;
    case "bob":
      return <group>
        <HairCap c={c} />
        {[-1, 1].map((s) => <RoundedBox key={s} args={[0.1, 0.46, 0.66]} radius={0.04} position={[s * 0.5, 0.07, -0.07]} castShadow><Std c={c} r={0.75} /></RoundedBox>)}
        <RoundedBox args={[1.0, 0.46, 0.1]} radius={0.04} position={[0, 0.07, -0.44]} castShadow><Std c={c} r={0.75} /></RoundedBox>
      </group>;
    case "long":
      return <group>
        <HairCap c={c} />
        {[-1, 1].map((s) => <RoundedBox key={s} args={[0.1, 0.86, 0.5]} radius={0.04} position={[s * 0.51, -0.12, -0.14]} castShadow><Std c={c} r={0.75} /></RoundedBox>)}
        <RoundedBox args={[1.02, 0.98, 0.12]} radius={0.05} position={[0, -0.15, -0.45]} castShadow><Std c={c} r={0.75} /></RoundedBox>
      </group>;
    case "bun":
      return <group>
        <HairCap c={c} />
        <mesh position={[0, 0.7, -0.14]} castShadow><sphereGeometry args={[0.17, 16, 12]} /><Std c={c} r={0.75} /></mesh>
      </group>;
    case "quiff":
      return <group>
        <HairCap c={c} />
        <mesh position={[0, 0.6, 0.18]} rotation-x={-0.55} scale={[0.36, 0.17, 0.3]} castShadow><sphereGeometry args={[1, 18, 12]} /><Std c={c} r={0.7} /></mesh>
      </group>;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ hats */

function HatPiece({ hat, c }: { hat: Hat; c: string }) {
  switch (hat) {
    case "cap":
      return <group>
        <mesh position-y={0.4} scale={[1, 0.74, 1]} castShadow>
          <sphereGeometry args={[0.45, 26, 12, 0, TAU, 0, Math.PI / 2]} /><meshStandardMaterial color={c} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.42, 0.36]} scale={[1.05, 1, 1]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.035, 24]} /><Std c={c} r={0.6} /></mesh>
        <mesh position-y={0.74}><sphereGeometry args={[0.045, 10, 8]} /><Std c={c} r={0.6} /></mesh>
      </group>;
    case "beanie":
      return <group>
        <mesh position-y={0.33} scale={[1, 0.82, 1]} castShadow>
          <sphereGeometry args={[0.48, 26, 12, 0, TAU, 0, Math.PI / 2]} /><meshStandardMaterial color={c} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        <mesh position-y={0.39} castShadow><cylinderGeometry args={[0.495, 0.495, 0.14, 28, 1, true]} /><meshStandardMaterial color={c} roughness={0.95} side={THREE.DoubleSide} /></mesh>
        <mesh position-y={0.8} castShadow><icosahedronGeometry args={[0.11, 1]} /><meshStandardMaterial color="#f7f5f0" roughness={1} flatShading /></mesh>
      </group>;
    case "top-hat":
      return <group rotation-z={-0.08}>
        <mesh position-y={0.5} castShadow><cylinderGeometry args={[0.5, 0.5, 0.035, 32]} /><Std c={c} r={0.4} /></mesh>
        <mesh position-y={0.78} castShadow><cylinderGeometry args={[0.3, 0.31, 0.52, 28]} /><Std c={c} r={0.4} /></mesh>
        <mesh position-y={0.57}><cylinderGeometry args={[0.315, 0.315, 0.09, 28]} /><Std c={c === "#e2483c" ? "#f7f5f0" : "#e2483c"} r={0.5} /></mesh>
      </group>;
    case "cowboy":
      return <group>
        <group scale={[1, 1, 0.86]}>
          <mesh position-y={0.5} castShadow><cylinderGeometry args={[0.72, 0.72, 0.03, 36]} /><Std c={c} r={0.8} /></mesh>
          <mesh position-y={0.53} rotation-x={Math.PI / 2}><torusGeometry args={[0.7, 0.04, 8, 36]} /><Std c={c} r={0.8} /></mesh>
        </group>
        <mesh position-y={0.69} castShadow><cylinderGeometry args={[0.28, 0.35, 0.36, 24]} /><Std c={c} r={0.8} /></mesh>
        <mesh position-y={0.55}><cylinderGeometry args={[0.355, 0.355, 0.07, 24]} /><Std c="#4a2e1c" r={0.7} /></mesh>
      </group>;
    case "crown":
      return <group>
        <mesh position-y={0.59} castShadow><cylinderGeometry args={[0.34, 0.32, 0.2, 28, 1, true]} /><meshStandardMaterial color={c} roughness={0.3} metalness={0.6} side={THREE.DoubleSide} emissive={c} emissiveIntensity={0.15} /></mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const a = (i / 6) * TAU;
          return <mesh key={i} position={[Math.sin(a) * 0.33, 0.76, Math.cos(a) * 0.33]} castShadow><coneGeometry args={[0.075, 0.16, 6]} /><Std c={c} r={0.3} m={0.6} /></mesh>;
        })}
        {[[-0.14, "#e2483c"], [0.14, "#3f7ff2"], [0, "#5cc95d"]].map(([x, g]) =>
          <mesh key={String(g)} position={[x as number, 0.6, 0.33]}><octahedronGeometry args={[0.05]} /><Std c={g as string} r={0.2} e={0.3} /></mesh>)}
      </group>;
    case "party":
      return <group rotation={[-0.08, 0, 0.16]}>
        <mesh position-y={0.8} castShadow><coneGeometry args={[0.25, 0.64, 22]} /><Std c={c} r={0.55} /></mesh>
        <mesh position-y={0.53} rotation-x={Math.PI / 2}><torusGeometry args={[0.235, 0.03, 8, 24]} /><Std c="#ffcd38" r={0.5} /></mesh>
        <mesh position-y={1.14}><icosahedronGeometry args={[0.08, 1]} /><meshStandardMaterial color="#f7f5f0" roughness={1} flatShading /></mesh>
      </group>;
    case "wizard":
      return <group>
        <mesh position-y={0.49} castShadow><cylinderGeometry args={[0.58, 0.58, 0.035, 32]} /><Std c={c} r={0.7} /></mesh>
        <group rotation-z={0.12} position-y={0.49}>
          <mesh position-y={0.48} castShadow><coneGeometry args={[0.36, 0.96, 24]} /><Std c={c} r={0.7} /></mesh>
          <mesh position={[0.05, 0.42, 0.3]} rotation-z={0.4}><octahedronGeometry args={[0.07]} /><Std c="#ffe27a" r={0.3} e={0.8} /></mesh>
          <mesh position={[-0.12, 0.2, 0.33]} rotation-z={0.9}><octahedronGeometry args={[0.05]} /><Std c="#ffe27a" r={0.3} e={0.8} /></mesh>
        </group>
      </group>;
    case "chef":
      return <group>
        <mesh position-y={0.62} castShadow><cylinderGeometry args={[0.34, 0.36, 0.26, 26]} /><Std c={c} r={0.85} /></mesh>
        {([[0, 0.87, 0, 0.26], [-0.18, 0.83, 0.02, 0.2], [0.18, 0.83, 0.02, 0.2], [0, 0.83, 0.16, 0.2], [0, 0.83, -0.16, 0.2]] as const).map(([x, y, z, r], i) =>
          <mesh key={i} position={[x, y, z]} castShadow><sphereGeometry args={[r, 18, 12]} /><Std c={c} r={0.9} /></mesh>)}
      </group>;
    case "halo":
      return <mesh position-y={0.96} rotation={[Math.PI / 2 - 0.2, 0, 0]}>
        <torusGeometry args={[0.3, 0.045, 10, 36]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={1.2} roughness={0.3} toneMapped={false} />
      </mesh>;
    case "headphones":
      return <group>
        <mesh position-y={0.1}><torusGeometry args={[0.53, 0.045, 8, 32, Math.PI]} /><Std c={c} r={0.4} /></mesh>
        {[-1, 1].map((s) => <group key={s} position={[s * 0.53, 0.08, 0]} rotation-z={Math.PI / 2}>
          <mesh castShadow><cylinderGeometry args={[0.17, 0.17, 0.12, 22]} /><Std c={c} r={0.4} /></mesh>
          <mesh position-y={-s * 0.07}><cylinderGeometry args={[0.13, 0.13, 0.04, 20]} /><Std c="#ff7eb6" r={0.8} /></mesh>
        </group>)}
      </group>;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ glasses */

function Arms({ c }: { c: string }) {
  return <>{[-1, 1].map((s) => <group key={s}>
    <mesh position={[s * 0.4, 0.12, 0.47]}><boxGeometry args={[0.2, 0.025, 0.025]} /><Std c={c} r={0.4} /></mesh>
    <mesh position={[s * 0.505, 0.12, 0.2]}><boxGeometry args={[0.025, 0.025, 0.54]} /><Std c={c} r={0.4} /></mesh>
  </group>)}</>;
}

function GlassesPiece({ glasses }: { glasses: Look["glasses"] }) {
  switch (glasses) {
    case "round":
      return <group>
        {[-0.19, 0.19].map((x) => <mesh key={x} position={[x, 0.11, 0.5]}><torusGeometry args={[0.12, 0.022, 8, 28]} /><Std c="#26282e" r={0.35} /></mesh>)}
        <mesh position={[0, 0.13, 0.5]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.014, 0.014, 0.15, 6]} /><Std c="#26282e" r={0.35} /></mesh>
        <Arms c="#26282e" />
      </group>;
    case "shades":
      return <group>
        {[-0.19, 0.19].map((x) => <RoundedBox key={x} args={[0.3, 0.19, 0.04]} radius={0.05} position={[x, 0.11, 0.5]}>
          <meshStandardMaterial color="#121418" roughness={0.08} metalness={0.4} />
        </RoundedBox>)}
        <mesh position={[0, 0.15, 0.5]}><boxGeometry args={[0.1, 0.03, 0.03]} /><Std c="#121418" r={0.2} /></mesh>
        <Arms c="#121418" />
      </group>;
    case "visor":
      return <group>
        <RoundedBox args={[0.84, 0.18, 0.06]} radius={0.05} position={[0, 0.11, 0.5]}>
          <meshStandardMaterial color="#33e0ff" emissive="#33e0ff" emissiveIntensity={0.7} roughness={0.15} transparent opacity={0.85} toneMapped={false} />
        </RoundedBox>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.505, 0.12, 0.26]}><boxGeometry args={[0.03, 0.05, 0.46]} /><Std c="#26282e" r={0.4} /></mesh>)}
      </group>;
    case "monocle":
      return <group>
        <mesh position={[0.19, 0.11, 0.5]}><torusGeometry args={[0.125, 0.02, 8, 28]} /><Std c="#f5b82e" r={0.3} m={0.7} /></mesh>
        <mesh position={[0.27, -0.1, 0.49]} rotation-z={0.35}><cylinderGeometry args={[0.008, 0.008, 0.34, 5]} /><Std c="#f5b82e" r={0.3} m={0.7} /></mesh>
      </group>;
    default:
      return null;
  }
}

/** Everything a resident was Grokified with. Rendered inside the body group so it hops along. */
export const BotLook = memo(function BotLook({ look }: { look: Look }) {
  const lift = HAIR_LIFT[look.hair];
  return <group>
    <HairPiece hair={look.hair} c={look.hair_color} />
    {look.hat !== "none" && <group position-y={lift} scale={look.hair === "afro" ? 1.12 : 1}>
      <HatPiece hat={look.hat} c={hatColor(look)} />
    </group>}
    <GlassesPiece glasses={look.glasses} />
  </group>;
}, (a, b) => lookKey(a.look) === lookKey(b.look));
