import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { locations, TOWN_COLORS } from "../lib/townData";
import { useTownStore } from "../lib/botSimulation";

function Windows({ width, height, depth }: { width:number;height:number;depth:number }) {
  const rows = Math.max(2, Math.floor(height / 1.4)); const cols = Math.max(2, Math.floor(width / 1.7));
  return <>{Array.from({length: rows*cols},(_,i)=>{ const r=Math.floor(i/cols), c=i%cols; return <mesh key={i} position={[-width/2+1+c*(width-2)/Math.max(cols-1,1),.9+r*(height-1.5)/Math.max(rows-1,1),depth/2+.04]}><boxGeometry args={[.55,.55,.05]}/><meshStandardMaterial color={i%3===0?TOWN_COLORS.warm:TOWN_COLORS.blue} emissive={i%3===0?TOWN_COLORS.warm:TOWN_COLORS.blue} emissiveIntensity={1.1}/></mesh>})}</>;
}

function Fountain({ labels, onFocus }: { labels:boolean; onFocus:()=>void }) {
  const water = useRef<THREE.Mesh>(null);
  useFrame(({clock})=>{ if(water.current) water.current.position.y=.22+Math.sin(clock.elapsedTime*2)*.025; });
  return <group position={[-4,0,7]} onClick={e=>{e.stopPropagation();onFocus()}}><mesh position-y={.12}><cylinderGeometry args={[2.3,2.5,.35,32]}/><meshStandardMaterial color={TOWN_COLORS.structureLight}/></mesh><mesh ref={water} rotation-x={-Math.PI/2} position-y={.22}><circleGeometry args={[2.05,32]}/><meshStandardMaterial color={TOWN_COLORS.cyan} emissive={TOWN_COLORS.blue} emissiveIntensity={.6} transparent opacity={.78}/></mesh><mesh position-y={1}><cylinderGeometry args={[.13,.18,1.8,10]}/><meshBasicMaterial color={TOWN_COLORS.cyan}/></mesh>{labels&&<Html position={[0,2,0]} center distanceFactor={18}><button className="world-label" onClick={onFocus}>Central Plaza</button></Html>}</group>;
}

function Core({ progress, labels, onFocus }: { progress:number; labels:boolean; onFocus:()=>void }) {
  const orb = useRef<THREE.Mesh>(null); const rings = useRef<THREE.Group>(null);
  useFrame(({clock},d)=>{ if(orb.current) orb.current.scale.setScalar(1+Math.sin(clock.elapsedTime*2)*.04); if(rings.current) rings.current.rotation.y+=Math.min(d,.05)*.22; });
  return <group position={[0,0,0]} onClick={e=>{e.stopPropagation();onFocus()}}><mesh position-y={.3}><cylinderGeometry args={[3.2,3.7,.6,8]}/><meshStandardMaterial color={TOWN_COLORS.structure}/></mesh><group ref={rings} position-y={3.6}>{[0,1,2].map(i=><mesh key={i} rotation={[i===1?Math.PI/2:0,i===2?Math.PI/2:0,i===2?Math.PI/2:0]}><torusGeometry args={[2.1+i*.18,.055,8,48]}/><meshBasicMaterial color={i===0?TOWN_COLORS.purple:TOWN_COLORS.cyan}/></mesh>)}</group><mesh ref={orb} position-y={3.6}><icosahedronGeometry args={[1.55,2]}/><meshStandardMaterial color={TOWN_COLORS.white} emissive={TOWN_COLORS.purple} emissiveIntensity={1.4+progress/50} transparent opacity={.82} wireframe/></mesh><pointLight position={[0,3.6,0]} color={TOWN_COLORS.purple} intensity={40+progress} distance={14}/>{labels&&<Html position={[0,6.5,0]} center distanceFactor={18}><button className="world-label" onClick={onFocus}>Grok Core</button></Html>}</group>;
}

function Building({ location, progress }: { location: typeof locations[number]; progress:number }) {
  const labels = useTownStore((s)=>s.labelsVisible); const focus = useTownStore((s)=>s.focusLocation);
  const [w,h,d]=location.size;
  if(location.kind==="plaza") return <Fountain labels={labels} onFocus={()=>focus(location.id)}/>;
  if(location.kind==="core") return <Core progress={progress} labels={labels} onFocus={()=>focus(location.id)}/>;
  return <group position={location.position} onClick={(e)=>{e.stopPropagation();focus(location.id)}}>
    <mesh position-y={h/2} castShadow receiveShadow><boxGeometry args={[w,h,d]}/><meshStandardMaterial color={TOWN_COLORS.structure} roughness={.42} metalness={.5}/></mesh>
    <mesh position={[0,h+.18,0]}><boxGeometry args={[w+.35,.35,d+.35]}/><meshStandardMaterial color={location.kind==="cafe"?TOWN_COLORS.purple:TOWN_COLORS.blue} emissive={location.kind==="cafe"?TOWN_COLORS.purple:TOWN_COLORS.blue} emissiveIntensity={1.2}/></mesh>
    <Windows width={w} height={h} depth={d}/>
    <mesh position={[0,.85,d/2+.18]}><boxGeometry args={[1.2,1.7,.18]}/><meshStandardMaterial color={TOWN_COLORS.glass} emissive={TOWN_COLORS.cyan} emissiveIntensity={.3}/></mesh>
    {labels&&<Html position={[0,h+1.1,0]} center distanceFactor={18}><button className="world-label" onClick={()=>focus(location.id)}>{location.name}</button></Html>}
  </group>;
}

export function TownBuildings(){ const progress=useTownStore(s=>s.objective); return <>{locations.map(location=><Building key={location.id} location={location} progress={progress}/>)}<RoadMarkings/></> }

function RoadMarkings(){ const marks=useMemo(()=>Array.from({length:18},(_,i)=>-20+i*2.35),[]); return <>{marks.map(x=><mesh key={`x${x}`} position={[x,.015,0]}><boxGeometry args={[1,.025,.09]}/><meshBasicMaterial color={TOWN_COLORS.blue}/></mesh>)}{marks.slice(1,16).map(z=><mesh key={`z${z}`} position={[0,.018,z*.82]}><boxGeometry args={[.09,.025,1]}/><meshBasicMaterial color={TOWN_COLORS.purple}/></mesh>)}</>}