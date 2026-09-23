import { Environment, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { TOWN_COLORS } from "../lib/townData";
import { useTownStore } from "../lib/botSimulation";

const trees: Array<[number, number, number]> = [
  [-19,-15,1],[-15,-15,.8],[-5,-16,1],[5,-16,.9],[15,-16,1],[20,-11,.9],[-20,-5,.9],[-19,4,1.1],[-19,14,.9],[-9,16,1],[15,16,.9],[20,13,1],[-7,-3,.7],[7,-4,.8],[-8,3,.75],[9,3,.7]
];
const lamps: Array<[number,number,number]> = [-16,-8,0,8,16].flatMap(x => [[x, -4, 0],[x, 4, Math.PI]] as Array<[number,number,number]>);

function Cloud({ position, speed }: { position: [number,number,number]; speed: number }) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useTownStore((s) => s.reducedMotion);
  useFrame((_, rawDelta) => {
    if (!ref.current || reduced) return;
    ref.current.position.x += Math.min(rawDelta, .05) * speed;
    if (ref.current.position.x > 32) ref.current.position.x = -32;
  });
  return <group ref={ref} position={position}>{[-1.2,0,1.2].map((x,i) => <mesh key={x} position={[x,i === 1 ? .35 : 0,0]} scale={[1.7,1,1]}><sphereGeometry args={[1.4,10,8]}/><meshStandardMaterial color={TOWN_COLORS.structureLight} transparent opacity={.34}/></mesh>)}</group>;
}

function Drone() {
  const ref = useRef<THREE.Group>(null);
  const reduced = useTownStore((s) => s.reducedMotion);
  useFrame(({ clock }) => {
    if (!ref.current || reduced) return;
    const t = clock.elapsedTime * .24;
    ref.current.position.set(Math.cos(t) * 13, 7 + Math.sin(t*2) * .4, Math.sin(t) * 11);
    ref.current.rotation.y = -t;
  });
  return <group ref={ref}><mesh castShadow><boxGeometry args={[1.3,.35,.7]}/><meshStandardMaterial color={TOWN_COLORS.dark} metalness={.8}/></mesh><mesh position={[0,-.12,.41]}><boxGeometry args={[.55,.12,.1]}/><meshBasicMaterial color={TOWN_COLORS.cyan}/></mesh></group>;
}

export function TownEnvironment() {
  const reduced = useTownStore((s) => s.reducedMotion);
  return <>
    <color attach="background" args={[TOWN_COLORS.night]}/><fogExp2 attach="fog" args={[TOWN_COLORS.night,.018]}/>
    <hemisphereLight args={["#788dff", "#101426", 1.15]}/>
    <directionalLight position={[-12,22,10]} intensity={2.4} color="#b9c8ff" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-25} shadow-camera-right={25} shadow-camera-top={25} shadow-camera-bottom={-25}/>
    <pointLight position={[0,8,0]} intensity={55} color={TOWN_COLORS.purple} distance={28}/>
    <Environment resolution={64}><Lightformer intensity={2} color="#7f8fff" position={[0,12,-8]} scale={[30,10,1]}/><Lightformer intensity={1.2} color="#41dbea" position={[-15,3,0]} rotation-y={Math.PI/2} scale={[20,4,1]}/></Environment>
    <mesh rotation-x={-Math.PI/2} position-y={-.16} receiveShadow><planeGeometry args={[52,44]}/><meshStandardMaterial color={TOWN_COLORS.ground} roughness={.84}/></mesh>
    <mesh rotation-x={-Math.PI/2} position-y={-.08} receiveShadow><boxGeometry args={[44,7,.12]}/><meshStandardMaterial color={TOWN_COLORS.road}/></mesh>
    <mesh rotation-x={-Math.PI/2} position-y={-.07} receiveShadow><boxGeometry args={[7,38,.12]}/><meshStandardMaterial color={TOWN_COLORS.road}/></mesh>
    {[-8,8].map(z => <mesh key={z} rotation-x={-Math.PI/2} position={[0,-.06,z]}><boxGeometry args={[44,3,.1]}/><meshStandardMaterial color={TOWN_COLORS.road}/></mesh>)}
    {trees.map((p,i)=><group key={i} position={p}><mesh position-y={.65} castShadow><cylinderGeometry args={[.18,.27,1.3,7]}/><meshStandardMaterial color="#4d3340"/></mesh><mesh position-y={2} castShadow><dodecahedronGeometry args={[1.05,0]}/><meshStandardMaterial color={i%2 ? "#164843":"#243d55"} flatShading/></mesh></group>)}
    {lamps.map((p,i)=><group key={i} position={p}><mesh position-y={1.5}><cylinderGeometry args={[.05,.08,3,8]}/><meshStandardMaterial color={TOWN_COLORS.dark} metalness={.8}/></mesh><mesh position={[0,3,0]}><sphereGeometry args={[.13,8,8]}/><meshBasicMaterial color={TOWN_COLORS.warm}/></mesh><pointLight position={[0,3,0]} color={TOWN_COLORS.warm} intensity={4} distance={5}/></group>)}
    <Cloud position={[-22,14,-18]} speed={.26}/><Cloud position={[5,17,-23]} speed={.16}/><Drone/>
    {!reduced && Array.from({length:18},(_,i)=><mesh key={i} position={[(i*7%19)-9,1+(i%6)*.65,(i*11%17)-8]}><sphereGeometry args={[.035,5,5]}/><meshBasicMaterial color={i%2?TOWN_COLORS.cyan:TOWN_COLORS.purple}/></mesh>)}
  </>;
}