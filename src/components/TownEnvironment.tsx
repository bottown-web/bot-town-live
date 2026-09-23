import { Environment, Instance, Instances, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useTownStore } from "../lib/botSimulation";
import { distanceToRoad, islandRadius, PLAZA_RADIUS, ROAD, roadPoint, ROAD_LENGTH, seededRandom, TOWN_COLORS } from "../lib/townData";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

type Rect = [number, number, number, number]; // minX, minZ, maxX, maxZ

/** Areas kept clear of trees and bushes (buildings, paths, playground…). */
export const CLEAR_ZONES: Rect[] = [
  [-6, -14.5, 6, -6.4], // town hall
  [-16.4, -14, -6.6, -7.2], // maple row homes
  [-19.2, -3.5, -9.8, 7.6], // café + terrace
  [-11.4, 6.6, -3.2, 15.4], // grocer + apron
  [0.6, 8.3, 8.6, 12.4], // benches
  [9.6, 12.8, 16.6, 16.4], // bus stop
  [7.2, -8, 18.4, 2], // playground
  [-2.2, 7, 2.2, 16], // south path
  [-12.5, 2.4, -7, 6.2], // west path
  [23.6, -11.2, 29.4, -4.8], // east cottage
  [-9.4, -26, -3.6, -20.8], // north cottage
  [2.2, 12.2, 9.4, 16.2], // front lawn, keeps the garden benches in view
  [-9, 21.2, 8, 30], // south shore in front of the camera
];

const leaf = (i: number) => TOWN_COLORS.leaf[i % TOWN_COLORS.leaf.length] ?? "#5fa846";

const inRect = (x: number, z: number, [a, b, c, d]: Rect, pad = 0) => x > a - pad && x < c + pad && z > b - pad && z < d + pad;

function isOpenGround(x: number, z: number, margin: number) {
  const r = Math.hypot(x, z);
  if (r > islandRadius(Math.atan2(-z, x)) - 2.2) return false;
  if (r < PLAZA_RADIUS + margin) return false;
  if (distanceToRoad(x, z) < ROAD.halfWidth + ROAD.sidewalk + margin) return false;
  return !CLEAR_ZONES.some((zone) => inRect(x, z, zone, margin * 0.6));
}

function roundedRectPath<T extends THREE.Path>(path: T, hx: number, hz: number, r: number, cx: number, cz: number): T {
  // Shape space: x = world x, y = -world z.
  const cy = -cz;
  path.moveTo(cx - hx + r, cy - hz);
  path.lineTo(cx + hx - r, cy - hz);
  path.absarc(cx + hx - r, cy - hz + r, r, -Math.PI / 2, 0, false);
  path.lineTo(cx + hx, cy + hz - r);
  path.absarc(cx + hx - r, cy + hz - r, r, 0, Math.PI / 2, false);
  path.lineTo(cx - hx + r, cy + hz);
  path.absarc(cx - hx + r, cy + hz - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(cx - hx, cy - hz + r);
  path.absarc(cx - hx + r, cy - hz + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

function ringShape(outerOffset: number, innerOffset: number) {
  const { hx, hz, radius, cx, cz } = ROAD;
  const shape = roundedRectPath(new THREE.Shape(), hx + outerOffset, hz + outerOffset, radius + outerOffset, cx, cz);
  shape.holes.push(roundedRectPath(new THREE.Path(), hx + innerOffset, hz + innerOffset, radius + innerOffset, cx, cz));
  return shape;
}

function gradientTexture(stops: Array<[number, string]>, radial = false) {
  const canvas = document.createElement("canvas");
  canvas.width = radial ? 256 : 4;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = radial ? ctx.createRadialGradient(128, 128, 0, 128, 128, 128) : ctx.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cobbleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rand = seededRandom(7);
  ctx.fillStyle = TOWN_COLORS.cobbleLine;
  ctx.fillRect(0, 0, 512, 512);
  const tones = ["#efdcc2", "#e8d3b6", "#f3e3cc", "#e2cbad"];
  for (let y = 0; y < 512; y += 22) {
    const shift = (y / 22) % 2 ? 13 : 0;
    for (let x = -26; x < 540; x += 26) {
      ctx.fillStyle = tones[Math.floor(rand() * tones.length)] ?? tones[0]!;
      ctx.beginPath();
      ctx.roundRect(x + shift + 1.5, y + 1.5, 23, 19, 6);
      ctx.fill();
    }
  }
  // Decorative rings like a paved town square.
  ctx.strokeStyle = "#d4b894";
  ctx.lineWidth = 7;
  [120, 236].forEach((r) => { ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.stroke(); });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/* ------------------------------------------------------------------ */
/* Pieces                                                             */
/* ------------------------------------------------------------------ */

function Island() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const steps = 160;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const r = islandRadius(a);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 7, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.9, bevelSegments: 2, curveSegments: 4 });
  }, []);
  const rocks = useMemo(() => {
    const rand = seededRandom(21);
    return Array.from({ length: 120 }, (_, i) => {
      const a = (i / 120) * Math.PI * 2 + rand() * 0.04;
      const r = islandRadius(a) + 0.4 + rand() * 1.6;
      const s = 1.1 + rand() * 1.9;
      return {
        position: [Math.cos(a) * r, -1.2 - rand() * 2.2, -Math.sin(a) * r] as [number, number, number],
        rotation: [rand() * 3, rand() * 3, rand() * 3] as [number, number, number],
        scale: [s * (0.9 + rand() * 0.6), s * (0.7 + rand() * 0.5), s] as [number, number, number],
        color: rand() > 0.5 ? TOWN_COLORS.rock : TOWN_COLORS.rockDark,
      };
    });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <>
    <mesh geometry={geometry} rotation-x={-Math.PI / 2} position-y={-7.6} receiveShadow>
      <meshStandardMaterial attach="material-0" color={TOWN_COLORS.grass} roughness={0.95} />
      <meshStandardMaterial attach="material-1" color={TOWN_COLORS.rock} roughness={1} flatShading />
    </mesh>
    <Instances limit={rocks.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} flatShading />
      {rocks.map((rock, i) => <Instance key={i} position={rock.position} rotation={rock.rotation} scale={rock.scale} color={rock.color} />)}
    </Instances>
  </>;
}

function Sea() {
  const shallow = useMemo(() => gradientTexture([[0, "#ffffff"], [0.45, "#ffffff"], [0.62, "#8a8a8a"], [1, "#000000"]], true), []);
  useEffect(() => () => shallow?.dispose(), [shallow]);
  const hills = useMemo(() => [
    { p: [-120, -2.6, -150], s: [70, 16, 30] }, { p: [-60, -2.6, -190], s: [60, 22, 26] },
    { p: [110, -2.6, -170], s: [80, 14, 30] }, { p: [-190, -2.6, -40], s: [40, 12, 70] },
    { p: [180, -2.6, -40], s: [36, 10, 60] },
  ] as Array<{ p: [number, number, number]; s: [number, number, number] }>, []);
  return <>
    <mesh rotation-x={-Math.PI / 2} position-y={-2.6} receiveShadow>
      <planeGeometry args={[900, 900]} />
      <meshStandardMaterial color={TOWN_COLORS.sea} roughness={0.28} metalness={0.08} />
    </mesh>
    {shallow && <mesh rotation-x={-Math.PI / 2} position-y={-2.55}>
      <planeGeometry args={[104, 104]} />
      <meshBasicMaterial color={TOWN_COLORS.seaShallow} alphaMap={shallow} transparent opacity={0.75} depthWrite={false} />
    </mesh>}
    {hills.map((h, i) => <mesh key={i} position={h.p} scale={h.s}>
      <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={i % 2 ? "#9db792" : "#8fae88"} roughness={1} flatShading />
    </mesh>)}
  </>;
}

function Cloud({ position, scale, speed }: { position: [number, number, number]; scale: number; speed: number }) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useTownStore((s) => s.reducedMotion);
  useFrame((_, delta) => {
    if (!ref.current || reduced) return;
    ref.current.position.x += Math.min(delta, 0.05) * speed;
    if (ref.current.position.x > 110) ref.current.position.x = -110;
  });
  return <group ref={ref} position={position} scale={scale}>
    {[[-1.6, 0, 0, 1.2], [0, 0.5, 0, 1.6], [1.5, 0.1, 0.2, 1.15], [0.4, -0.2, 0.8, 1]].map(([x, y, z, r], i) =>
      <mesh key={i} position={[x ?? 0, y ?? 0, z ?? 0]}><sphereGeometry args={[r ?? 1, 14, 10]} /><meshStandardMaterial color="#fff7f0" emissive="#ffe9dc" emissiveIntensity={0.25} roughness={1} /></mesh>)}
  </group>;
}

function Roads() {
  const { road, outerWalk, innerWalk } = useMemo(() => {
    const hw = ROAD.halfWidth;
    const sw = ROAD.sidewalk;
    const curb = { depth: 0.16, bevelEnabled: false, curveSegments: 16 };
    return {
      road: new THREE.ShapeGeometry(ringShape(hw, -hw), 20),
      outerWalk: new THREE.ExtrudeGeometry(ringShape(hw + sw, hw), curb),
      innerWalk: new THREE.ExtrudeGeometry(ringShape(-hw, -hw - sw), curb),
    };
  }, []);
  useEffect(() => () => { road.dispose(); outerWalk.dispose(); innerWalk.dispose(); }, [road, outerWalk, innerWalk]);

  const dashes = useMemo(() => {
    const out: Array<{ p: [number, number, number]; r: number }> = [];
    for (let s = 0; s < ROAD_LENGTH; s += 2.8) {
      const pt = roadPoint(s);
      out.push({ p: [pt.x, 0.035, pt.z], r: Math.atan2(pt.tx, pt.tz) });
    }
    return out;
  }, []);

  // Zebra crossings: position + road direction.
  const crossings: Array<{ x: number; z: number; along: "x" | "z" }> = [
    { x: 5, z: ROAD.cz + ROAD.hz, along: "x" },
    { x: -ROAD.hx, z: 4.6, along: "z" },
    { x: ROAD.hx, z: -3.4, along: "z" },
    { x: 0, z: ROAD.cz - ROAD.hz, along: "x" },
  ];

  return <>
    <mesh geometry={road} rotation-x={-Math.PI / 2} position-y={0.03} receiveShadow>
      <meshStandardMaterial color={TOWN_COLORS.road} roughness={0.92} />
    </mesh>
    {[outerWalk, innerWalk].map((g, i) => <mesh key={i} geometry={g} rotation-x={-Math.PI / 2} position-y={0} receiveShadow>
      <meshStandardMaterial color={TOWN_COLORS.sidewalk} roughness={0.9} />
    </mesh>)}
    <Instances limit={dashes.length}>
      <boxGeometry args={[0.14, 0.02, 1.2]} />
      <meshBasicMaterial color={TOWN_COLORS.roadLine} transparent opacity={0.8} />
      {dashes.map((d, i) => <Instance key={i} position={d.p} rotation={[0, d.r, 0]} />)}
    </Instances>
    {crossings.map((c, i) => <group key={i} position={[c.x, 0.04, c.z]} rotation-y={c.along === "x" ? 0 : Math.PI / 2}>
      {Array.from({ length: 6 }, (_, k) => <mesh key={k} position={[(k - 2.5) * 0.72, 0, 0]} receiveShadow>
        <boxGeometry args={[0.42, 0.02, ROAD.halfWidth * 2 - 0.3]} />
        <meshStandardMaterial color={TOWN_COLORS.roadLine} roughness={0.8} />
      </mesh>)}
    </group>)}
  </>;
}

const PATHS: Array<{ p: [number, number]; s: [number, number]; r?: number }> = [
  { p: [0, 11.8], s: [3.2, 8.2] }, // south path to the road
  { p: [-9.8, 4.3], s: [5.6, 3] }, // west path to café terrace
  { p: [-14.5, 5.2], s: [7.4, 3.2] }, // café terrace
  { p: [-6.2, 13.6], s: [9.4, 2.6] }, // grocer apron
  { p: [8.4, -2.4], s: [2.2, 2.6] }, // east path to playground
  { p: [-7.9, -5.8], s: [6.4, 1.8], r: -0.54 }, // homes path
  { p: [9, 10.3], s: [11, 1.8], r: -0.88 }, // path to bus stop
];

function Plaza() {
  const texture = useMemo(cobbleTexture, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return <>
    <mesh position-y={0.08} receiveShadow>
      <cylinderGeometry args={[PLAZA_RADIUS, PLAZA_RADIUS + 0.15, 0.16, 64]} />
      <meshStandardMaterial attach="material-0" color={TOWN_COLORS.sidewalk} />
      <meshStandardMaterial attach="material-1" map={texture} color="#ffffff" roughness={0.9} />
      <meshStandardMaterial attach="material-2" color={TOWN_COLORS.sidewalk} />
    </mesh>
    {PATHS.map((path, i) => <mesh key={i} position={[path.p[0], 0.06, path.p[1]]} rotation-y={path.r ?? 0} receiveShadow>
      <boxGeometry args={[path.s[0], 0.12, path.s[1]]} />
      <meshStandardMaterial color={i === 2 ? "#e6d2b4" : TOWN_COLORS.cobble} roughness={0.9} />
    </mesh>)}
  </>;
}

/** Trees, bushes and flowers scattered across the open grass. */
function Greenery() {
  const { trees, bushes, flowers } = useMemo(() => {
    const rand = seededRandom(1337);
    const trees: Array<{ x: number; z: number; s: number; c: number }> = [];
    // Hand-placed feature trees that frame the plaza like the reference.
    const featured: Array<[number, number, number]> = [
      [-8.9, -2.2, 1.1], [7.9, 5.6, 1.05], [9.6, -10.4, 1.2], [0.5, -22.6, 1.3], [6.5, -22, 1.25], [13, -21.2, 1.15],
      [-17.6, -9.8, 1.1], [16.4, 6.6, 1.1], [-17.2, 11.6, 1.15], [16.2, -12.2, 1.1], [13.6, 9.2, 0.9], [-4.6, 5.6, 0.75],
    ];
    featured.forEach(([x, z, s]) => { if (isOpenGround(x, z, 0.6)) trees.push({ x, z, s, c: Math.floor(rand() * 4) }); });
    let guard = 0;
    while (trees.length < 78 && guard++ < 5000) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!isOpenGround(x, z, 1.4)) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
      trees.push({ x, z, s: 0.8 + rand() * 0.55, c: Math.floor(rand() * 4) });
    }
    const bushes: Array<{ x: number; z: number; s: [number, number, number]; r: number }> = [];
    guard = 0;
    while (bushes.length < 70 && guard++ < 5000) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 30;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!isOpenGround(x, z, 0.7)) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.3)) continue;
      const s = 0.55 + rand() * 0.45;
      bushes.push({ x, z, s: [s * (1.2 + rand()), s * 0.85, s], r: rand() * Math.PI });
    }
    // Hedge rows along the paths, like the clipped hedges in the reference.
    const hedgeRows: Array<[number, number, number, number]> = [
      [2.1, 12.2, 2.1, 15], [-1.9, 8.6, -1.9, 11.8], [-10.4, 2.2, -8.6, 2.2], [3.4, 14.4, 8.4, 14.4],
      [-4.8, -8.3, -8, -8.3], [4.8, -8.3, 7.6, -8.3], [9.2, 1.9, 16, 1.9],
    ];
    hedgeRows.forEach(([x1, z1, x2, z2]) => {
      const n = Math.max(2, Math.round(Math.hypot(x2 - x1, z2 - z1) / 1.05));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        bushes.push({ x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t, s: [0.78, 0.62, 0.72], r: rand() });
      }
    });
    const palette = ["#ff7aa2", "#ffd166", "#ffffff", "#ff8c42", "#c792ea", "#ff5d73"];
    const flowers: Array<{ p: [number, number, number]; c: string }> = [];
    bushes.forEach((b, i) => {
      if (i % 2) return;
      for (let k = 0; k < 4; k++) {
        const a = rand() * Math.PI * 2;
        flowers.push({ p: [b.x + Math.cos(a) * b.s[0] * 0.8, 0.35 + rand() * b.s[1] * 0.7, b.z + Math.sin(a) * b.s[2] * 0.8], c: palette[i % palette.length] ?? "#ffffff" });
      }
    });
    guard = 0;
    while (flowers.length < 420 && guard++ < 8000) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 29;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!isOpenGround(x, z, 0.3)) continue;
      const c = palette[Math.floor(rand() * palette.length)] ?? "#ffffff";
      for (let k = 0; k < 5; k++) flowers.push({ p: [x + (rand() - 0.5) * 1.2, 0.1, z + (rand() - 0.5) * 1.2], c });
    }
    return { trees, bushes, flowers };
  }, []);

  return <>
    <Instances limit={trees.length} castShadow receiveShadow>
      <cylinderGeometry args={[0.16, 0.24, 1.6, 7]} />
      <meshStandardMaterial color={TOWN_COLORS.trunk} roughness={1} />
      {trees.map((t, i) => <Instance key={i} position={[t.x, 0.8 * t.s, t.z]} scale={t.s} />)}
    </Instances>
    <Instances limit={trees.length * 3} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.9} flatShading />
      {trees.flatMap((t, i) => [
        <Instance key={`${i}a`} position={[t.x, 2.35 * t.s, t.z]} scale={1.35 * t.s} color={leaf(t.c)} />,
        <Instance key={`${i}b`} position={[t.x + 0.6 * t.s, 1.9 * t.s, t.z + 0.3 * t.s]} scale={0.95 * t.s} color={leaf(t.c + 1)} />,
        <Instance key={`${i}c`} position={[t.x - 0.45 * t.s, 3.05 * t.s, t.z - 0.25 * t.s]} scale={0.85 * t.s} color={leaf(t.c + 2)} />,
      ])}
    </Instances>
    <Instances limit={bushes.length} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.95} flatShading />
      {bushes.map((b, i) => <Instance key={i} position={[b.x, b.s[1] * 0.7, b.z]} scale={b.s} rotation={[0, b.r, 0]} color={i % 3 ? TOWN_COLORS.hedge : "#62a94c"} />)}
    </Instances>
    <Instances limit={flowers.length}>
      <sphereGeometry args={[0.1, 6, 5]} />
      <meshStandardMaterial roughness={0.7} />
      {flowers.map((f, i) => <Instance key={i} position={f.p} color={f.c} />)}
    </Instances>
  </>;
}

export function StreetLamp({ position }: { position: [number, number, number] }) {
  return <group position={position}>
    <mesh position-y={0.12} castShadow><cylinderGeometry args={[0.2, 0.26, 0.24, 8]} /><meshStandardMaterial color={TOWN_COLORS.iron} roughness={0.5} metalness={0.4} /></mesh>
    <mesh position-y={1.45} castShadow><cylinderGeometry args={[0.06, 0.09, 2.7, 8]} /><meshStandardMaterial color={TOWN_COLORS.iron} roughness={0.5} metalness={0.4} /></mesh>
    <mesh position-y={2.95}><cylinderGeometry args={[0.2, 0.14, 0.46, 6]} /><meshStandardMaterial color={TOWN_COLORS.lantern} emissive={TOWN_COLORS.lantern} emissiveIntensity={1.6} toneMapped={false} /></mesh>
    <mesh position-y={3.26} castShadow><coneGeometry args={[0.27, 0.26, 6]} /><meshStandardMaterial color={TOWN_COLORS.iron} roughness={0.5} metalness={0.4} /></mesh>
    <mesh position-y={3.43}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color={TOWN_COLORS.iron} /></mesh>
  </group>;
}

function Lamps() {
  const lamps = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    // Around the plaza, skipping the paths.
    [22, 122, 182, 242, 300].forEach((deg) => {
      const a = (deg * Math.PI) / 180;
      out.push([Math.cos(a) * (PLAZA_RADIUS - 0.5), 0.16, Math.sin(a) * (PLAZA_RADIUS - 0.5)]);
    });
    // Along the inner sidewalk.
    for (let s = 4; s < ROAD_LENGTH; s += 9.5) {
      const pt = roadPoint(s);
      const inward = ROAD.halfWidth + ROAD.sidewalk * 0.55;
      const x = pt.x + pt.tz * inward;
      const z = pt.z - pt.tx * inward;
      if (CLEAR_ZONES.slice(0, 7).some((zone) => inRect(x, z, zone, 0.3))) continue;
      out.push([x, 0.16, z]);
    }
    return out;
  }, []);
  return <>{lamps.map((p, i) => <StreetLamp key={i} position={p} />)}</>;
}

/* ------------------------------------------------------------------ */
/* Environment                                                        */
/* ------------------------------------------------------------------ */

export function TownEnvironment() {
  const sky = useMemo(() => gradientTexture([[0, TOWN_COLORS.skyTop], [0.55, TOWN_COLORS.skyMid], [1, TOWN_COLORS.skyHorizon]]), []);
  useEffect(() => () => sky?.dispose(), [sky]);
  return <>
    {sky ? <primitive attach="background" object={sky} /> : <color attach="background" args={[TOWN_COLORS.skyMid]} />}
    <fog attach="fog" args={[TOWN_COLORS.haze, 85, 230]} />
    <hemisphereLight args={["#ffeede", "#86a660", 0.95]} />
    <ambientLight intensity={0.25} color="#ffe9d2" />
    <directionalLight
      position={[-32, 38, -10]} intensity={3.1} color="#ffdcae" castShadow
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40}
      shadow-camera-near={1} shadow-camera-far={120} shadow-bias={-0.0004} shadow-normalBias={0.04}
    />
    <directionalLight position={[26, 18, 30]} intensity={0.55} color="#cfe3ff" />
    <Environment resolution={64} frames={1}>
      <Lightformer intensity={1.4} color="#ffe0bd" position={[0, 14, -12]} scale={[40, 12, 1]} />
      <Lightformer intensity={0.9} color="#bfe0ff" position={[-18, 6, 10]} rotation-y={Math.PI / 2} scale={[30, 6, 1]} />
      <Lightformer intensity={0.6} color="#ffffff" position={[0, 20, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
    </Environment>
    <Sea />
    <Island />
    <Roads />
    <Plaza />
    <Greenery />
    <Lamps />
    <Cloud position={[-60, 26, -70]} scale={3.2} speed={0.5} />
    <Cloud position={[30, 30, -90]} scale={4} speed={0.35} />
    <Cloud position={[80, 24, -40]} scale={2.6} speed={0.45} />
  </>;
}
