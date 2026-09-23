import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useTownStore } from "../lib/botSimulation";
import { locationById, PLAZA_RADIUS, TOWN_COLORS } from "../lib/townData";
import { BeachBall, Bench, Bicycle, CafeTable, FlowerBox, PottedPlant, ProduceCrate, TrashBin } from "./TownProps";

type Vec3 = [number, number, number];

/* ------------------------------------------------------------------ */
/* Building blocks                                                    */
/* ------------------------------------------------------------------ */

function Window({ position, size = [0.8, 1.05], lit = false, rotation = 0, frame = TOWN_COLORS.trim, shutters }: {
  position: Vec3; size?: [number, number]; lit?: boolean; rotation?: number; frame?: string; shutters?: string | undefined;
}) {
  const [w, h] = size;
  return <group position={position} rotation-y={rotation}>
    <mesh position-z={0.02}><boxGeometry args={[w + 0.16, h + 0.16, 0.06]} /><meshStandardMaterial color={frame} /></mesh>
    <mesh position-z={0.05}>
      <boxGeometry args={[w, h, 0.04]} />
      {lit
        ? <meshStandardMaterial color={TOWN_COLORS.window} emissive="#ffc766" emissiveIntensity={0.9} roughness={0.3} />
        : <meshStandardMaterial color={TOWN_COLORS.glass} roughness={0.15} metalness={0.25} />}
    </mesh>
    <mesh position-z={0.08}><boxGeometry args={[0.05, h, 0.02]} /><meshStandardMaterial color={frame} /></mesh>
    <mesh position-z={0.08}><boxGeometry args={[w, 0.05, 0.02]} /><meshStandardMaterial color={frame} /></mesh>
    <mesh position={[0, -h / 2 - 0.1, 0.1]}><boxGeometry args={[w + 0.3, 0.07, 0.2]} /><meshStandardMaterial color={frame} /></mesh>
    {shutters && [-1, 1].map((s) => <mesh key={s} position={[s * (w / 2 + 0.22), 0, 0.04]}>
      <boxGeometry args={[0.3, h + 0.1, 0.05]} /><meshStandardMaterial color={shutters} />
    </mesh>)}
  </group>;
}

/** Triangular-prism roof. Caps use `endColor` (gable walls), slopes use `color`. */
function GableRoof({ position, width, depth, height, overhang = 0.35, color, endColor, ridge = "x" }: {
  position: Vec3; width: number; depth: number; height: number; overhang?: number; color: string; endColor: string; ridge?: "x" | "z";
}) {
  const geometry = useMemo(() => {
    const span = ridge === "x" ? depth : width;
    const length = ridge === "x" ? width : depth;
    const shape = new THREE.Shape();
    shape.moveTo(-span / 2 - overhang, 0);
    shape.lineTo(span / 2 + overhang, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: length + overhang * 2, bevelEnabled: false });
    g.translate(0, 0, -(length + overhang * 2) / 2);
    return g;
  }, [width, depth, height, overhang, ridge]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} position={position} rotation-y={ridge === "x" ? Math.PI / 2 : 0} castShadow receiveShadow>
    <meshStandardMaterial attach="material-0" color={endColor} roughness={0.85} />
    <meshStandardMaterial attach="material-1" color={color} roughness={0.75} flatShading />
  </mesh>;
}

/** Striped shop awning sloping out from a wall. */
function Awning({ position, width, depth = 1.5, color, stripes = 9, scallop = true }: { position: Vec3; width: number; depth?: number; color: string; stripes?: number; scallop?: boolean }) {
  const stripeW = width / stripes;
  return <group position={position}>
    <group rotation-x={0.42}>
      {Array.from({ length: stripes }, (_, i) => <mesh key={i} position={[-width / 2 + stripeW * (i + 0.5), 0, depth / 2]} castShadow>
        <boxGeometry args={[stripeW + 0.005, 0.06, depth]} /><meshStandardMaterial color={i % 2 ? TOWN_COLORS.white : color} roughness={0.8} />
      </mesh>)}
      {scallop && Array.from({ length: stripes }, (_, i) => <mesh key={`v${i}`} position={[-width / 2 + stripeW * (i + 0.5), -0.16, depth]} rotation-x={-0.42}>
        <boxGeometry args={[stripeW + 0.005, 0.32, 0.04]} /><meshStandardMaterial color={i % 2 ? TOWN_COLORS.white : color} roughness={0.8} />
      </mesh>)}
    </group>
  </group>;
}

function Door({ position, color = TOWN_COLORS.wood, width = 1, height = 1.9, glass = false }: { position: Vec3; color?: string; width?: number; height?: number; glass?: boolean }) {
  return <group position={position}>
    <mesh position={[0, height / 2, 0.02]}><boxGeometry args={[width + 0.18, height + 0.12, 0.06]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
    <mesh position={[0, height / 2, 0.06]}><boxGeometry args={[width, height, 0.05]} /><meshStandardMaterial color={color} roughness={0.7} /></mesh>
    {glass && <mesh position={[0, height * 0.62, 0.09]}><boxGeometry args={[width * 0.7, height * 0.45, 0.02]} /><meshStandardMaterial color={TOWN_COLORS.window} emissive="#ffc766" emissiveIntensity={0.7} /></mesh>}
    <mesh position={[width * 0.34, height * 0.48, 0.1]}><sphereGeometry args={[0.05, 6, 6]} /><meshStandardMaterial color="#e2b04a" metalness={0.6} roughness={0.3} /></mesh>
  </group>;
}

function Label({ id, name, height }: { id: string; name: string; height: number }) {
  const labels = useTownStore((s) => s.labelsVisible);
  const focus = useTownStore((s) => s.focusLocation);
  if (!labels) return null;
  return <Html position={[0, height, 0]} center distanceFactor={26} zIndexRange={[5, 0]}>
    <button className="world-label" onClick={() => focus(id)}>{name}</button>
  </Html>;
}

function Place({ id, children, labelHeight }: { id: string; children: ReactNode; labelHeight: number }) {
  const focus = useTownStore((s) => s.focusLocation);
  const location = locationById(id);
  const onClick = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); focus(id); };
  return <group position={location.position} onClick={onClick}>
    {children}
    <Label id={id} name={location.name} height={labelHeight} />
  </group>;
}

/* ------------------------------------------------------------------ */
/* Landmarks                                                          */
/* ------------------------------------------------------------------ */

function TownClock({ position }: { position: Vec3 }) {
  const hour = useRef<THREE.Mesh>(null);
  const minute = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (minute.current) minute.current.rotation.z = -t * 0.35;
    if (hour.current) hour.current.rotation.z = -0.9 - t * 0.03;
  });
  return <group position={position}>
    <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.66, 0.66, 0.1, 28]} /><meshStandardMaterial color="#6b5a4a" /></mesh>
    <mesh position-z={0.06} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.56, 0.56, 0.04, 28]} /><meshStandardMaterial color="#fffaf0" /></mesh>
    {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.sin((i / 12) * Math.PI * 2) * 0.46, Math.cos((i / 12) * Math.PI * 2) * 0.46, 0.09]}>
      <boxGeometry args={[0.04, 0.04, 0.02]} /><meshStandardMaterial color={TOWN_COLORS.ink} />
    </mesh>)}
    <mesh ref={hour} position-z={0.1}><boxGeometry args={[0.05, 0.28, 0.02]} /><meshStandardMaterial color={TOWN_COLORS.ink} /></mesh>
    <mesh ref={minute} position-z={0.12}><boxGeometry args={[0.035, 0.42, 0.02]} /><meshStandardMaterial color={TOWN_COLORS.ink} /></mesh>
  </group>;
}

function TownHall() {
  const w = 10, d = 4.5, h = 4.4;
  const stone = "#efe2cb";
  return <Place id="hall" labelHeight={8.6}>
    <mesh position-y={0.15} receiveShadow><boxGeometry args={[w + 0.5, 0.3, d + 0.5]} /><meshStandardMaterial color={TOWN_COLORS.stone} /></mesh>
    <mesh position-y={h / 2 + 0.3} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={stone} roughness={0.9} /></mesh>
    <mesh position-y={h + 0.36} castShadow><boxGeometry args={[w + 0.3, 0.18, d + 0.3]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
    <GableRoof position={[0, h + 0.45, 0]} width={w} depth={d} height={2} color={TOWN_COLORS.slate} endColor={stone} />
    {/* Dormers */}
    {[-3.2, 3.2].map((x) => <group key={x} position={[x, h + 0.9, d / 2 - 0.35]}>
      <mesh castShadow><boxGeometry args={[0.9, 0.9, 0.8]} /><meshStandardMaterial color={stone} /></mesh>
      <GableRoof position={[0, 0.45, 0]} width={1} depth={0.8} height={0.5} overhang={0.12} ridge="z" color={TOWN_COLORS.slateDark} endColor={stone} />
      <Window position={[0, 0, 0.4]} size={[0.45, 0.5]} />
    </group>)}
    {/* Portico with clock gable */}
    <group position={[0, 0, d / 2]}>
      <mesh position={[0, 2.8, 0.55]} castShadow receiveShadow><boxGeometry args={[4.2, 5.2, 1.1]} /><meshStandardMaterial color="#f5ead8" roughness={0.9} /></mesh>
      <mesh position={[0, 5.46, 0.55]}><boxGeometry args={[4.5, 0.18, 1.35]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
      <GableRoof position={[0, 5.55, 0.4]} width={4.2} depth={1.9} height={1.7} overhang={0.25} ridge="z" color={TOWN_COLORS.slate} endColor="#f5ead8" />
      <TownClock position={[0, 6.2, 1.62]} />
      {[-1.7, 1.7].map((x) => <mesh key={x} position={[x, 2.8, 1.12]} castShadow><boxGeometry args={[0.4, 5, 0.12]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>)}
      <group position={[0, 0.3, 1.1]}>
        <mesh position={[0, 1.2, 0]}><boxGeometry args={[1.8, 2.4, 0.06]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
        {[-0.42, 0.42].map((x) => <mesh key={x} position={[x, 1.1, 0.04]}><boxGeometry args={[0.78, 2.1, 0.05]} /><meshStandardMaterial color="#6b4a33" roughness={0.6} /></mesh>)}
        <mesh position={[0, 2.4, 0.035]}><circleGeometry args={[0.9, 20, 0, Math.PI]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
        <mesh position={[0, 2.4, 0.045]}><circleGeometry args={[0.72, 20, 0, Math.PI]} /><meshStandardMaterial color={TOWN_COLORS.window} emissive="#ffc766" emissiveIntensity={0.6} /></mesh>
      </group>
      <Window position={[0, 3.9, 1.12]} size={[1.1, 1.1]} lit />
      {/* Steps down to the plaza */}
      {[0.46, 0.34, 0.22].map((height, i) => <mesh key={i} position={[0, height / 2, 1.3 + i * 0.4]} receiveShadow castShadow>
        <boxGeometry args={[4.8 + i * 0.4, height, 0.4]} /><meshStandardMaterial color={TOWN_COLORS.stone} />
      </mesh>)}
      {[-2.9, 2.9].map((x) => <PottedPlant key={x} position={[x, 0.3, 0.9]} scale={1.3} pot="#d9cfc0" />)}
    </group>
    {[-4, -2.9, 2.9, 4].flatMap((x) => [1.5, 3.4].map((y) => <Window key={`${x}${y}`} position={[x, y, d / 2]} size={[0.7, 1.15]} lit={x === -4 && y === 3.4} />))}
    {[-1, 1].map((s) => [-0.9, 0.9].map((z) => <Window key={`${s}${z}`} position={[(s * w) / 2, 2.4, z]} rotation={(s * Math.PI) / 2} size={[0.7, 1.15]} />))}
  </Place>;
}

function MapleRowHomes() {
  const w = 6.4, d = 5, floors = 3, fh = 2.2;
  const h = floors * fh;
  return <Place id="homes" labelHeight={h + 3}>
    <mesh position-y={h / 2} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={TOWN_COLORS.cream} roughness={0.9} /></mesh>
    {/* Brick ground floor + brick side wing */}
    <mesh position={[0, 0.8, 0.02]} castShadow><boxGeometry args={[w + 0.08, 1.6, d + 0.06]} /><meshStandardMaterial color={TOWN_COLORS.brick} roughness={0.95} /></mesh>
    <mesh position={[-w / 2 - 1.1, 2.4, -0.4]} castShadow receiveShadow><boxGeometry args={[2.2, 4.8, 4]} /><meshStandardMaterial color={TOWN_COLORS.brick} roughness={0.95} /></mesh>
    <mesh position={[-w / 2 - 1.1, 4.9, -0.4]}><boxGeometry args={[2.4, 0.2, 4.2]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
    <Window position={[-w / 2 - 1.1, 3.3, 1.6]} size={[0.8, 1.1]} lit />
    <Window position={[-w / 2 - 1.1, 1.3, 1.6]} size={[0.8, 1.1]} />
    {/* Cornice + roof bits */}
    <mesh position-y={h + 0.12}><boxGeometry args={[w + 0.4, 0.24, d + 0.4]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
    <mesh position={[0, h + 0.5, 0]} castShadow><boxGeometry args={[w - 0.6, 0.6, d - 0.6]} /><meshStandardMaterial color={TOWN_COLORS.slate} /></mesh>
    <mesh position={[1.9, h + 1.2, -1]} castShadow><boxGeometry args={[0.8, 1.6, 0.8]} /><meshStandardMaterial color={TOWN_COLORS.brickDark} /></mesh>
    <mesh position={[1.9, h + 2.05, -1]}><boxGeometry args={[0.95, 0.12, 0.95]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
    <PottedPlant position={[-1.8, h + 0.8, 1.2]} scale={1.1} />
    <PottedPlant position={[-0.6, h + 0.8, 1.4]} scale={0.9} />
    <mesh position={[-2.4, h + 1.2, -1.4]} castShadow><boxGeometry args={[1, 1, 0.9]} /><meshStandardMaterial color="#aeb4bf" metalness={0.3} /></mesh>
    {/* Front facade */}
    <Door position={[0, 0, d / 2]} color="#2f6b4f" glass />
    <Window position={[-2, 0.95, d / 2]} size={[1, 0.9]} lit />
    <Window position={[2, 0.95, d / 2]} size={[1, 0.9]} />
    {[1, 2].map((f) => [-2, 0, 2].map((x) => <group key={`${f}${x}`}>
      <Window position={[x, f * fh + 1.1, d / 2]} size={[0.75, 1.15]} lit={(f + x) % 3 === 0} shutters={f === 1 ? "#3f6b8f" : undefined} />
      {f === 2 && <FlowerBox position={[x, f * fh + 0.35, d / 2 + 0.2]} width={0.95} />}
    </group>))}
    {/* Balcony */}
    <group position={[0, fh + 0.2, d / 2 + 0.45]}>
      <mesh castShadow><boxGeometry args={[5.4, 0.12, 0.9]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
      <mesh position={[0, 0.5, 0.42]}><boxGeometry args={[5.4, 0.05, 0.05]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
      {Array.from({ length: 19 }, (_, i) => <mesh key={i} position={[-2.7 + i * 0.3, 0.26, 0.42]}><boxGeometry args={[0.03, 0.48, 0.03]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>)}
      <FlowerBox position={[-1.6, 0.2, 0.1]} width={1.2} colors={["#e8453c", "#ffd166"]} />
      <FlowerBox position={[1.6, 0.2, 0.1]} width={1.2} />
    </group>
    {[-1, 1].map((s) => [1, 2].map((f) => <Window key={`${s}${f}`} position={[(s * w) / 2, f * fh + 1.1, 0]} rotation={(s * Math.PI) / 2} size={[0.75, 1.15]} lit={s > 0 && f === 1} />))}
  </Place>;
}

function CornerCafe() {
  const w = 7, d = 6, h = 4.4;
  return <Place id="cafe" labelHeight={h + 2.4}>
    <mesh position-y={h / 2} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={TOWN_COLORS.peach} roughness={0.9} /></mesh>
    <mesh position={[0, 0.9, 0.02]} castShadow><boxGeometry args={[w + 0.06, 1.8, d + 0.06]} /><meshStandardMaterial color={TOWN_COLORS.brick} roughness={0.95} /></mesh>
    <mesh position-y={h + 0.15}><boxGeometry args={[w + 0.35, 0.3, d + 0.35]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
    <mesh position={[0, h + 0.48, 0]} castShadow><boxGeometry args={[w - 0.3, 0.4, d - 0.3]} /><meshStandardMaterial color={TOWN_COLORS.slate} /></mesh>
    <mesh position={[-2.2, h + 1, -1.4]} castShadow><boxGeometry args={[0.7, 1.2, 0.7]} /><meshStandardMaterial color={TOWN_COLORS.brickDark} /></mesh>
    {/* Big glowing shop windows */}
    {[-2.3, 2.3].map((x) => <Window key={x} position={[x, 1.35, d / 2]} size={[2, 1.6]} lit frame="#3b2a20" />)}
    <Door position={[0, 0, d / 2]} color="#3b2a20" width={1.1} height={2.1} glass />
    {/* Sign board */}
    <mesh position={[0, 3.5, d / 2 + 0.08]}><boxGeometry args={[3.2, 0.62, 0.12]} /><meshStandardMaterial color="#3b2a20" /></mesh>
    <mesh position={[0, 3.5, d / 2 + 0.15]}><boxGeometry args={[2.9, 0.4, 0.02]} /><meshStandardMaterial color="#f7e7c6" emissive="#ffdca0" emissiveIntensity={0.3} /></mesh>
    <mesh position={[-1.1, 3.5, d / 2 + 0.17]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.13, 0.1, 0.02, 12]} /><meshStandardMaterial color={TOWN_COLORS.awningRed} /></mesh>
    {[-0.5, 0, 0.5, 1].map((x) => <mesh key={x} position={[x, 3.5, d / 2 + 0.17]}><boxGeometry args={[0.28, 0.2, 0.02]} /><meshStandardMaterial color="#3b2a20" /></mesh>)}
    <Awning position={[0, 2.95, d / 2]} width={w - 0.4} depth={1.7} color={TOWN_COLORS.awningRed} stripes={11} />
    {[-1, 1].map((s) => [-1.5, 1.5].map((z) => <Window key={`${s}${z}`} position={[(s * w) / 2, 2.9, z]} rotation={(s * Math.PI) / 2} size={[0.85, 1]} lit={s > 0} />))}
    {/* Terrace */}
    <CafeTable position={[-2.5, 0.12, d / 2 + 2.8]} />
    <CafeTable position={[2.5, 0.12, d / 2 + 2.9]} />
    <group position={[-3.4, 0.12, d / 2 + 0.7]} rotation-y={0.4}>
      <mesh position-y={0.55} rotation-x={-0.12} castShadow><boxGeometry args={[0.7, 1, 0.06]} /><meshStandardMaterial color="#2f3a33" /></mesh>
      <mesh position={[0, 0.55, 0.04]} rotation-x={-0.12}><boxGeometry args={[0.56, 0.8, 0.02]} /><meshStandardMaterial color="#3f4d44" /></mesh>
    </group>
    <PottedPlant position={[3.3, 0.12, d / 2 + 0.5]} scale={1.2} />
    <PottedPlant position={[-0.2, 0.12, d / 2 + 0.45]} scale={0.9} pot="#8a5a3b" />
  </Place>;
}

function GreenGrocer() {
  const w = 6.5, d = 5, h = 4.2;
  return <Place id="grocer" labelHeight={h + 2.2}>
    <mesh position-y={h / 2} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color="#f3e6cf" roughness={0.9} /></mesh>
    <mesh position-y={h + 0.14}><boxGeometry args={[w + 0.35, 0.28, d + 0.35]} /><meshStandardMaterial color={TOWN_COLORS.trim} /></mesh>
    <mesh position={[0, h + 0.45, 0]} castShadow><boxGeometry args={[w - 0.4, 0.4, d - 0.4]} /><meshStandardMaterial color={TOWN_COLORS.slate} /></mesh>
    <mesh position={[1.8, h + 0.95, -0.8]} castShadow><boxGeometry args={[1.4, 0.8, 1.2]} /><meshStandardMaterial color="#c9cdd4" /></mesh>
    <mesh position={[0, 0.3, 0.02]}><boxGeometry args={[w + 0.06, 0.6, d + 0.06]} /><meshStandardMaterial color={TOWN_COLORS.awningGreen} /></mesh>
    {[-2, 2].map((x) => <Window key={x} position={[x, 1.55, d / 2]} size={[1.9, 1.5]} lit frame={TOWN_COLORS.awningGreen} />)}
    <Door position={[0, 0.02, d / 2]} color={TOWN_COLORS.awningGreen} width={1} height={2.1} glass />
    <mesh position={[0, 3.55, d / 2 + 0.08]}><boxGeometry args={[4.4, 0.6, 0.1]} /><meshStandardMaterial color={TOWN_COLORS.awningGreen} /></mesh>
    {[-1.4, -0.7, 0, 0.7, 1.4].map((x, i) => <mesh key={x} position={[x, 3.55, d / 2 + 0.14]}><sphereGeometry args={[0.13, 8, 6]} /><meshStandardMaterial color={["#e8453c", "#ff9a2e", "#f5d33d", "#7cc24f", "#e8453c"][i] ?? "#e8453c"} /></mesh>)}
    <Awning position={[0, 2.95, d / 2]} width={w - 0.3} depth={1.6} color={TOWN_COLORS.awningGreen} stripes={9} />
    {/* Produce stand */}
    {[-2.2, -1.2, 1.2, 2.2].map((x, i) => <ProduceCrate key={x} position={[x, 0, d / 2 + 0.9]} fruit={i} />)}
    <ProduceCrate position={[-2.9, 0, d / 2 + 1.9]} fruit={3} rotation={0.3} />
    {[-1, 1].map((s) => <Window key={s} position={[(s * w) / 2, 2.2, 0]} rotation={(s * Math.PI) / 2} size={[1, 1.2]} />)}
    <PottedPlant position={[3, 0, d / 2 + 1.8]} scale={1.1} />
  </Place>;
}

function Swing({ x, phase }: { x: number; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useTownStore((s) => s.reducedMotion);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.x = reduced ? 0 : Math.sin(clock.elapsedTime * 1.6 + phase) * 0.35; });
  return <group ref={ref} position={[x, 2.4, 0]}>
    {[-0.28, 0.28].map((cx) => <mesh key={cx} position={[cx, -0.85, 0]}><cylinderGeometry args={[0.015, 0.015, 1.7, 4]} /><meshStandardMaterial color="#c9ccd2" /></mesh>)}
    <mesh position-y={-1.72} castShadow><boxGeometry args={[0.7, 0.07, 0.3]} /><meshStandardMaterial color={TOWN_COLORS.awningRed} /></mesh>
  </group>;
}

function Playground() {
  const ball = useRef<THREE.Group>(null);
  const reduced = useTownStore((s) => s.reducedMotion);
  useFrame(({ clock }) => {
    if (!ball.current) return;
    const t = clock.elapsedTime * 2.2;
    ball.current.position.y = reduced ? 0.3 : 0.3 + Math.abs(Math.sin(t)) * 1.1;
  });
  return <Place id="playground" labelHeight={4.4}>
    <mesh position-y={0.05} scale={[4.7, 1, 4.1]} receiveShadow><cylinderGeometry args={[1, 1, 0.1, 40]} /><meshStandardMaterial color={TOWN_COLORS.mulch} roughness={1} /></mesh>
    {/* Swing set */}
    <group position={[1.3, 0, -2.2]}>
      {[-1.7, 1.7].map((x) => <group key={x} position-x={x}>
        {[-0.55, 0.55].map((z) => <mesh key={z} position={[0, 1.2, z * 0.8]} rotation-x={z > 0 ? -0.24 : 0.24} castShadow><cylinderGeometry args={[0.07, 0.07, 2.5, 6]} /><meshStandardMaterial color={TOWN_COLORS.wood} /></mesh>)}
      </group>)}
      <mesh position-y={2.42} rotation-z={Math.PI / 2} castShadow><cylinderGeometry args={[0.08, 0.08, 3.6, 8]} /><meshStandardMaterial color={TOWN_COLORS.wood} /></mesh>
      <Swing x={-0.75} phase={0} />
      <Swing x={0.75} phase={1.7} />
    </group>
    {/* Slide */}
    <group position={[-2.6, 0, -0.6]} rotation-y={0.5}>
      <mesh position={[0, 0.9, -0.9]} castShadow><boxGeometry args={[0.9, 1.8, 0.9]} /><meshStandardMaterial color="#ffcd38" /></mesh>
      <mesh position={[0, 1.85, -0.9]}><boxGeometry args={[1, 0.1, 1]} /><meshStandardMaterial color={TOWN_COLORS.awningRed} /></mesh>
      <mesh position={[0, 0.95, 0.35]} rotation-x={0.72} castShadow><boxGeometry args={[0.7, 0.08, 2.4]} /><meshStandardMaterial color="#3f7ff2" roughness={0.4} /></mesh>
      {[-0.36, 0.36].map((x) => <mesh key={x} position={[x, 1.05, 0.35]} rotation-x={0.72}><boxGeometry args={[0.06, 0.18, 2.4]} /><meshStandardMaterial color="#3f7ff2" /></mesh>)}
    </group>
    {/* Sandbox */}
    <group position={[2.8, 0, 1.6]}>
      <mesh position-y={0.14} castShadow><boxGeometry args={[1.8, 0.28, 1.6]} /><meshStandardMaterial color={TOWN_COLORS.woodLight} /></mesh>
      <mesh position-y={0.22}><boxGeometry args={[1.56, 0.1, 1.36]} /><meshStandardMaterial color="#f1dc9f" /></mesh>
    </group>
    <group ref={ball} position={[-0.3, 0.3, 1.4]}><BeachBall scale={1.3} /></group>
  </Place>;
}

function BusStop() {
  return <Place id="busstop" labelHeight={3.8}>
    <mesh position={[0, 2.55, -0.1]} castShadow><boxGeometry args={[4.6, 0.16, 1.9]} /><meshStandardMaterial color="#34466b" roughness={0.5} /></mesh>
    {[-2.1, 2.1].map((x) => [-0.8, 0.6].map((z) => <mesh key={`${x}${z}`} position={[x, 1.25, z]} castShadow><boxGeometry args={[0.1, 2.5, 0.1]} /><meshStandardMaterial color="#34466b" /></mesh>))}
    <mesh position={[0, 1.35, -0.8]}><boxGeometry args={[4.1, 2.1, 0.05]} /><meshStandardMaterial color="#cfe6f2" transparent opacity={0.45} roughness={0.05} /></mesh>
    {[-2.1, 2.1].map((x) => <mesh key={x} position={[x, 1.35, -0.1]}><boxGeometry args={[0.04, 2.1, 1.3]} /><meshStandardMaterial color="#cfe6f2" transparent opacity={0.4} roughness={0.05} /></mesh>)}
    <mesh position={[-1.25, 1.4, -0.76]}><boxGeometry args={[1, 1.4, 0.04]} /><meshStandardMaterial color="#fff6e5" emissive="#ffe7b5" emissiveIntensity={0.4} /></mesh>
    <mesh position={[0.4, 0.5, -0.45]} castShadow><boxGeometry args={[2.6, 0.08, 0.5]} /><meshStandardMaterial color={TOWN_COLORS.woodLight} /></mesh>
    <group position={[2.8, 0, 0.6]}>
      <mesh position-y={1.3}><cylinderGeometry args={[0.05, 0.05, 2.6, 6]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
      <mesh position-y={2.6} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.32, 0.32, 0.05, 20]} /><meshStandardMaterial color="#3f7ff2" /></mesh>
      <mesh position={[0, 2.6, 0.03]}><boxGeometry args={[0.36, 0.1, 0.02]} /><meshStandardMaterial color="#ffffff" /></mesh>
    </group>
  </Place>;
}

function Cottage({ position, rotation, wall, roof }: { position: Vec3; rotation: number; wall: string; roof: string }) {
  return <group position={position} rotation-y={rotation}>
    <mesh position-y={1.4} castShadow receiveShadow><boxGeometry args={[4.2, 2.8, 3.6]} /><meshStandardMaterial color={wall} roughness={0.9} /></mesh>
    <GableRoof position={[0, 2.8, 0]} width={4.2} depth={3.6} height={1.8} color={roof} endColor={wall} />
    <mesh position={[1.2, 4, -0.5]} castShadow><boxGeometry args={[0.5, 1.2, 0.5]} /><meshStandardMaterial color={TOWN_COLORS.brickDark} /></mesh>
    <Door position={[0, 0, 1.8]} color="#3f6b8f" />
    {[-1.35, 1.35].map((x) => <Window key={x} position={[x, 1.5, 1.8]} size={[0.8, 0.8]} lit={x > 0} shutters="#3f6b8f" />)}
  </group>;
}

/* ------------------------------------------------------------------ */
/* Plaza centrepiece                                                  */
/* ------------------------------------------------------------------ */

function Fountain() {
  const drops = useRef<THREE.Group>(null);
  const water = useRef<THREE.Mesh>(null);
  const reduced = useTownStore((s) => s.reducedMotion);
  const focus = useTownStore((s) => s.focusLocation);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (water.current) water.current.position.y = 0.66 + Math.sin(t * 2) * 0.01;
    if (!drops.current) return;
    drops.current.visible = !reduced;
    drops.current.children.forEach((child, i) => {
      const angle = (i / drops.current!.children.length) * Math.PI * 2;
      const p = (t * 0.7 + (i % 3) / 3) % 1;
      const r = 0.25 + p * 1.05;
      child.position.set(Math.cos(angle) * r, 3.05 + p * 0.9 - p * p * 2.1, Math.sin(angle) * r);
    });
  });
  return <group onClick={(e) => { e.stopPropagation(); focus("plaza"); }}>
    <mesh position-y={0.46} castShadow receiveShadow><cylinderGeometry args={[2.7, 2.85, 0.6, 40]} /><meshStandardMaterial color={TOWN_COLORS.stone} roughness={0.8} /></mesh>
    <mesh position-y={0.78}><torusGeometry args={[2.62, 0.14, 8, 48]} /><meshStandardMaterial color="#f6f1e8" roughness={0.7} /></mesh>
    <mesh ref={water} position-y={0.66} rotation-x={-Math.PI / 2}><circleGeometry args={[2.5, 40]} /><meshStandardMaterial color={TOWN_COLORS.water} roughness={0.1} metalness={0.1} transparent opacity={0.9} /></mesh>
    <mesh position-y={1.5} castShadow><cylinderGeometry args={[0.32, 0.46, 1.8, 16]} /><meshStandardMaterial color={TOWN_COLORS.stone} /></mesh>
    <mesh position-y={2.35} castShadow><cylinderGeometry args={[1.25, 0.55, 0.36, 28]} /><meshStandardMaterial color={TOWN_COLORS.stone} /></mesh>
    <mesh position-y={2.54} rotation-x={-Math.PI / 2}><circleGeometry args={[1.12, 28]} /><meshStandardMaterial color={TOWN_COLORS.water} roughness={0.1} /></mesh>
    <mesh position-y={2.85} castShadow><cylinderGeometry args={[0.16, 0.22, 0.7, 12]} /><meshStandardMaterial color={TOWN_COLORS.stone} /></mesh>
    <mesh position-y={3.2}><cylinderGeometry args={[0.55, 0.25, 0.2, 20]} /><meshStandardMaterial color={TOWN_COLORS.stone} /></mesh>
    <mesh position-y={3.55}><coneGeometry args={[0.16, 0.8, 10]} /><meshStandardMaterial color="#dff4ff" transparent opacity={0.75} emissive="#bfe8ff" emissiveIntensity={0.3} /></mesh>
    {/* Falling water sheets */}
    <mesh position-y={1.62}><cylinderGeometry args={[1.28, 1.6, 1.2, 28, 1, true]} /><meshStandardMaterial color="#d8f1ff" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <group ref={drops}>
      {Array.from({ length: 18 }, (_, i) => <mesh key={i}><sphereGeometry args={[0.06, 6, 5]} /><meshStandardMaterial color="#e6f7ff" emissive="#cdeeff" emissiveIntensity={0.5} /></mesh>)}
    </group>
  </group>;
}

function Planter({ angle }: { angle: number }) {
  const a = (angle * Math.PI) / 180;
  const flowers = ["#ffffff", "#ff86b6", "#ffd166", "#ffffff", "#ff7aa2", "#ffffff"];
  return <group position={[Math.cos(a) * 4.7, 0.16, Math.sin(a) * 4.7]}>
    <mesh position-y={0.24} castShadow receiveShadow><cylinderGeometry args={[1.15, 1.2, 0.48, 24]} /><meshStandardMaterial color={TOWN_COLORS.stone} /></mesh>
    <mesh position-y={0.49}><cylinderGeometry args={[1.02, 1.02, 0.04, 24]} /><meshStandardMaterial color="#6d4b35" /></mesh>
    <mesh position-y={0.85} castShadow><icosahedronGeometry args={[0.62, 1]} /><meshStandardMaterial color={TOWN_COLORS.hedge} flatShading /></mesh>
    {Array.from({ length: 14 }, (_, i) => {
      const t = (i / 14) * Math.PI * 2;
      return <mesh key={i} position={[Math.cos(t) * 0.82, 0.62 + (i % 2) * 0.08, Math.sin(t) * 0.82]}>
        <sphereGeometry args={[0.13, 6, 5]} /><meshStandardMaterial color={flowers[i % flowers.length] ?? "#ffffff"} />
      </mesh>;
    })}
  </group>;
}

function PlazaFurniture() {
  const labels = useTownStore((s) => s.labelsVisible);
  const focus = useTownStore((s) => s.focusLocation);
  const benchAt = (deg: number, radius: number) => {
    const a = (deg * Math.PI) / 180;
    const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
    return { position: [x, 0.16, z] as Vec3, rotation: Math.atan2(-x, -z) };
  };
  return <>
    <Fountain />
    {[45, 135, 225, 315].map((a) => <Planter key={a} angle={a} />)}
    {[200, 330].map((deg) => <Bench key={deg} {...benchAt(deg, PLAZA_RADIUS - 0.9)} />)}
    <TrashBin position={[-7.35, 0.16, -1.2]} />
    {labels && <Html position={[0, 4.8, 0]} center distanceFactor={26} zIndexRange={[5, 0]}><button className="world-label" onClick={() => focus("plaza")}>Town Plaza</button></Html>}
  </>;
}

function FountainGarden() {
  return <Place id="park" labelHeight={2.6}>
    <Bench position={[-1.7, 0, -0.15]} />
    <Bench position={[1.7, 0, -0.15]} />
    <TrashBin position={[3.3, 0, -0.2]} />
  </Place>;
}

/* ------------------------------------------------------------------ */

export function TownBuildings() {
  return <>
    <PlazaFurniture />
    <TownHall />
    <MapleRowHomes />
    <CornerCafe />
    <GreenGrocer />
    <FountainGarden />
    <Playground />
    <BusStop />
    <Cottage position={[26.6, 0, -8]} rotation={-Math.PI / 2} wall="#f3e2c8" roof="#d0683f" />
    <Cottage position={[-6.5, 0, -23.4]} rotation={0} wall="#e9d5c0" roof="#c65b3c" />
    <Bicycle position={[16.8, 0, 4.4]} rotation={0.25} color="#e2483c" />
    <Bicycle position={[17.6, 0, 4.2]} rotation={0.25} color="#3f8d5a" />
  </>;
}
