import { TOWN_COLORS } from "../lib/townData";

type Vec3 = [number, number, number];

export function Bench({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <group position={position} rotation-y={rotation}>
    {[-0.95, 0.95].map((x) => <group key={x} position-x={x}>
      <mesh position={[0, 0.24, 0.08]} castShadow><boxGeometry args={[0.1, 0.48, 0.1]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
      <mesh position={[0, 0.24, -0.26]} castShadow><boxGeometry args={[0.1, 0.48, 0.1]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
      <mesh position={[0, 0.72, -0.34]} castShadow><boxGeometry args={[0.1, 0.6, 0.08]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
    </group>)}
    {[0.1, -0.1, -0.28].map((z, i) => <mesh key={z} position={[0, 0.5, z + 0.04]} castShadow receiveShadow>
      <boxGeometry args={[2.3, 0.07, 0.16]} /><meshStandardMaterial color={i % 2 ? TOWN_COLORS.woodLight : TOWN_COLORS.wood} />
    </mesh>)}
    {[0.62, 0.86].map((y) => <mesh key={y} position={[0, y, -0.36]} castShadow>
      <boxGeometry args={[2.3, 0.14, 0.06]} /><meshStandardMaterial color={TOWN_COLORS.wood} />
    </mesh>)}
  </group>;
}

export function Bicycle({ position = [0, 0, 0], rotation = 0, color = "#e2483c", spin = 0 }: { position?: Vec3; rotation?: number; color?: string; spin?: number }) {
  return <group position={position} rotation-y={rotation}>
    {[0.52, -0.52].map((z) => <group key={z} position={[0, 0.34, z]} rotation={[spin, Math.PI / 2, 0]}>
      <mesh castShadow><torusGeometry args={[0.3, 0.05, 6, 18]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
      {[0, 1, 2].map((k) => <mesh key={k} rotation-z={(k * Math.PI) / 3}><boxGeometry args={[0.56, 0.02, 0.02]} /><meshStandardMaterial color="#c9ccd2" /></mesh>)}
    </group>)}
    <mesh position={[0, 0.56, 0]} rotation-x={Math.PI / 2} castShadow><cylinderGeometry args={[0.04, 0.04, 1.02, 6]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 0.5, 0.26]} rotation-x={-0.9} castShadow><cylinderGeometry args={[0.04, 0.04, 0.62, 6]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 0.46, -0.26]} rotation-x={0.7} castShadow><cylinderGeometry args={[0.04, 0.04, 0.5, 6]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 0.82, 0.48]} castShadow><cylinderGeometry args={[0.035, 0.035, 0.5, 6]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
    <mesh position={[0, 1.06, 0.48]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.56, 6]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
    <mesh position={[0, 0.74, -0.18]}><boxGeometry args={[0.16, 0.06, 0.3]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
  </group>;
}

export function BeachBall({ position = [0, 0, 0], scale = 1 }: { position?: Vec3; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh castShadow><sphereGeometry args={[0.3, 16, 12]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
    {[0, 1, 2].map((i) => <mesh key={i} rotation-y={(i * Math.PI) / 3}>
      <sphereGeometry args={[0.305, 16, 12, 0, Math.PI / 3.2, 0, Math.PI]} />
      <meshStandardMaterial color={["#f24b4b", "#3f7ff2", "#ffcd38"][i] ?? "#f24b4b"} roughness={0.4} />
    </mesh>)}
  </group>;
}

export function Book({ position = [0, 0, 0] }: { position?: Vec3 }) {
  return <group position={position} rotation-x={-0.5}>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 0.14, 0, 0]} rotation-y={side * -0.35}>
      <boxGeometry args={[0.28, 0.36, 0.03]} /><meshStandardMaterial color="#fbf7ee" />
    </mesh>)}
    <mesh position={[0, 0, -0.03]}><boxGeometry args={[0.6, 0.38, 0.02]} /><meshStandardMaterial color="#3f7ff2" /></mesh>
  </group>;
}

export function CoffeeCup({ position = [0, 0, 0] }: { position?: Vec3 }) {
  return <group position={position}>
    <mesh castShadow><cylinderGeometry args={[0.1, 0.08, 0.2, 10]} /><meshStandardMaterial color="#ffffff" /></mesh>
    <mesh position-y={0.06}><cylinderGeometry args={[0.105, 0.105, 0.06, 10]} /><meshStandardMaterial color={TOWN_COLORS.awningGreen} /></mesh>
  </group>;
}

export function PottedPlant({ position = [0, 0, 0], scale = 1, pot = "#c9774f", leaves = "#4f963f" }: { position?: Vec3; scale?: number; pot?: string; leaves?: string }) {
  return <group position={position} scale={scale}>
    <mesh position-y={0.18} castShadow><cylinderGeometry args={[0.22, 0.16, 0.36, 10]} /><meshStandardMaterial color={pot} /></mesh>
    <mesh position-y={0.52} castShadow><icosahedronGeometry args={[0.3, 1]} /><meshStandardMaterial color={leaves} flatShading /></mesh>
    <mesh position={[0.12, 0.72, 0.05]} castShadow><icosahedronGeometry args={[0.18, 1]} /><meshStandardMaterial color="#6fb84f" flatShading /></mesh>
  </group>;
}

export function TrashBin({ position }: { position: Vec3 }) {
  return <group position={position}>
    <mesh position-y={0.42} castShadow><cylinderGeometry args={[0.28, 0.24, 0.84, 10]} /><meshStandardMaterial color="#4f6b5a" roughness={0.6} /></mesh>
    <mesh position-y={0.88}><cylinderGeometry args={[0.31, 0.31, 0.08, 10]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
  </group>;
}

export function CafeTable({ position }: { position: Vec3 }) {
  return <group position={position}>
    <mesh position-y={0.74} castShadow><cylinderGeometry args={[0.46, 0.46, 0.05, 16]} /><meshStandardMaterial color="#fbf7f0" /></mesh>
    <mesh position-y={0.37}><cylinderGeometry args={[0.04, 0.04, 0.74, 6]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
    <mesh position-y={0.02}><cylinderGeometry args={[0.22, 0.22, 0.04, 10]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
    {[-0.72, 0.72].map((x) => <group key={x} position-x={x} rotation-y={x > 0 ? -Math.PI / 2 : Math.PI / 2}>
      <mesh position-y={0.44} castShadow><boxGeometry args={[0.42, 0.05, 0.42]} /><meshStandardMaterial color={TOWN_COLORS.wood} /></mesh>
      <mesh position={[0, 0.7, -0.2]} castShadow><boxGeometry args={[0.42, 0.5, 0.05]} /><meshStandardMaterial color={TOWN_COLORS.wood} /></mesh>
      {[-0.18, 0.18].flatMap((a) => [-0.18, 0.18].map((b) => <mesh key={`${a}${b}`} position={[a, 0.22, b]}><boxGeometry args={[0.04, 0.44, 0.04]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>))}
    </group>)}
    <CoffeeCup position={[0.15, 0.86, 0.05]} />
  </group>;
}

const FRUIT = ["#e8453c", "#ff9a2e", "#f5d33d", "#7cc24f", "#c0392b"];

export function ProduceCrate({ position, fruit = 0, rotation = 0 }: { position: Vec3; fruit?: number; rotation?: number }) {
  const color = FRUIT[fruit % FRUIT.length] ?? "#e8453c";
  return <group position={position} rotation-y={rotation}>
    <mesh position-y={0.28} castShadow receiveShadow><boxGeometry args={[0.9, 0.56, 0.62]} /><meshStandardMaterial color={TOWN_COLORS.woodLight} /></mesh>
    {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[-0.28 + (i % 3) * 0.28, 0.62 + (i > 2 ? 0.06 : 0), i > 2 ? 0.1 : -0.12]} castShadow>
      <sphereGeometry args={[0.15, 8, 6]} /><meshStandardMaterial color={color} roughness={0.5} />
    </mesh>)}
  </group>;
}

export function FlowerBox({ position, width = 1.2, colors = ["#e8453c", "#ff7aa2"] }: { position: Vec3; width?: number; colors?: string[] }) {
  const n = Math.max(3, Math.round(width / 0.26));
  return <group position={position}>
    <mesh castShadow><boxGeometry args={[width, 0.2, 0.3]} /><meshStandardMaterial color={TOWN_COLORS.brickDark} /></mesh>
    <mesh position-y={0.14}><boxGeometry args={[width - 0.06, 0.12, 0.26]} /><meshStandardMaterial color="#5a9a45" /></mesh>
    {Array.from({ length: n }, (_, i) => <mesh key={i} position={[-width / 2 + 0.13 + (i * (width - 0.26)) / (n - 1), 0.24, (i % 2) * 0.08 - 0.04]}>
      <sphereGeometry args={[0.09, 6, 5]} /><meshStandardMaterial color={colors[i % colors.length] ?? "#e8453c"} />
    </mesh>)}
  </group>;
}
