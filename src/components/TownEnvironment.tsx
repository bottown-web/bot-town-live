import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TOWN_COLORS } from "../lib/townData";
import { useTownStore } from "../lib/botSimulation";

const trees: Array<[number, number, number]> = [
  [-19,-15,1],[-15,-15,.8],[-5,-16,1],[5,-16,.9],[15,-16,1],[20,-11,.9],[-20,-5,.9],[-19,4,1.1],[-19,14,.9],[-9,16,1],[15,16,.9],[20,13,1],[-7,-3,.7],[7,-4,.8],[-8,3,.75],[9,3,.7]
];
const lamps: Array<[number,number,number]> = [-16,-8,0,8,16].flatMap(x => [[x, -4, 0],[x, 4, Math.PI]] as Array<[number,number,number]>);

function createTownGroundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = TOWN_COLORS.ground;
  context.fillRect(0, 0, 128, 128);
  context.fillStyle = "#28334a";
  for (let y = 8; y < 128; y += 16) for (let x = 8; x < 128; x += 16) {
    context.beginPath();
    context.arc(x, y, 1.25, 0, Math.PI * 2);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 12);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

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
  const { scene } = useThree();
  const groundTexture = useMemo(createTownGroundTexture, []);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const night = useMemo(() => new THREE.Color(TOWN_COLORS.night), []);
  const dawn = useMemo(() => new THREE.Color("#667895"), []);
  useEffect(() => () => groundTexture?.dispose(), [groundTexture]);
  useFrame(({ clock }) => {
    const dayProgress = (clock.elapsedTime % 720) / 720;
    const daylight = Math.max(0, Math.sin(dayProgress * Math.PI * 2 - Math.PI / 2));
    const sky = night.clone().lerp(dawn, daylight * .82);
    scene.background = sky;
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(sky);
    if (hemisphere.current) hemisphere.current.intensity = .9 + daylight * .65;
    if (sun.current) sun.current.intensity = 1.25 + daylight * 1.8;
  });
  return <>
    <color attach="background" args={[TOWN_COLORS.night]}/><fogExp2 attach="fog" args={[TOWN_COLORS.night,.018]}/>
    <hemisphereLight ref={hemisphere} args={["#8da0d7", "#0b0d12", 1.15]}/>
    <directionalLight ref={sun} position={[-18,28,14]} intensity={2.4} color="#d5ddff" castShadow shadow-mapSize={[1536,1536]} shadow-camera-left={-27} shadow-camera-right={27} shadow-camera-top={27} shadow-camera-bottom={-27} shadow-bias={-.0004} shadow-normalBias={.03}/>
    <pointLight position={[0,8,0]} intensity={55} color={TOWN_COLORS.purple} distance={28}/>
    <Environment resolution={64}><Lightformer intensity={2} color="#7f8fff" position={[0,12,-8]} scale={[30,10,1]}/><Lightformer intensity={1.2} color="#41dbea" position={[-15,3,0]} rotation-y={Math.PI/2} scale={[20,4,1]}/></Environment>
    <mesh rotation-x={-Math.PI/2} position-y={-.18} receiveShadow><planeGeometry args={[58,50]}/><meshStandardMaterial map={groundTexture} color={TOWN_COLORS.ground} roughness={.94}/></mesh>
    {[-8,0,8].map(z => <group key={`road-z-${z}`}><mesh rotation-x={-Math.PI/2} position={[0,-.08,z]} receiveShadow><boxGeometry args={[50,5.6,.12]}/><meshStandardMaterial color={TOWN_COLORS.road} roughness={.9}/></mesh><mesh rotation-x={-Math.PI/2} position={[0,-.015,z]}><boxGeometry args={[50,.08,.03]}/><meshBasicMaterial color={TOWN_COLORS.pavement} transparent opacity={.35}/></mesh></group>)}
    {[-8,0,8].map(x => <mesh key={`road-x-${x}`} rotation-x={-Math.PI/2} position={[x,-.07,0]} receiveShadow><boxGeometry args={[5.6,42,.1]}/><meshStandardMaterial color={TOWN_COLORS.road} roughness={.9}/></mesh>)}
    {[-21,-13,-5,3,11,19].map(x => [-12,-4,4,12].map(z => <mesh key={`${x}-${z}`} rotation-x={-Math.PI/2} position={[x,.012,z]}><boxGeometry args={[1.25,.02,.12]}/><meshBasicMaterial color={TOWN_COLORS.white} transparent opacity={.36}/></mesh>))}
    {trees.map((p,i)=><group key={i} position={p}><mesh position-y={.65} castShadow><cylinderGeometry args={[.18,.27,1.3,7]}/><meshStandardMaterial color="#4d3340"/></mesh><mesh position-y={2} castShadow><dodecahedronGeometry args={[1.05,0]}/><meshStandardMaterial color={i%2 ? "#164843":"#243d55"} flatShading/></mesh></group>)}
    {lamps.map((p,i)=><group key={i} position={p}><mesh position-y={1.5}><cylinderGeometry args={[.05,.08,3,8]}/><meshStandardMaterial color={TOWN_COLORS.dark} metalness={.8}/></mesh><mesh position={[0,3,0]}><sphereGeometry args={[.15,8,8]}/><meshBasicMaterial color={TOWN_COLORS.warm}/></mesh><pointLight position={[0,3,0]} color={TOWN_COLORS.warm} intensity={5} distance={5}/></group>)}
    <Cloud position={[-22,14,-18]} speed={.26}/><Cloud position={[5,17,-23]} speed={.16}/><Drone/>
    {!reduced && Array.from({length:18},(_,i)=><mesh key={i} position={[(i*7%19)-9,1+(i%6)*.65,(i*11%17)-8]}><sphereGeometry args={[.035,5,5]}/><meshBasicMaterial color={i%2?TOWN_COLORS.cyan:TOWN_COLORS.purple}/></mesh>)}
  </>;
}