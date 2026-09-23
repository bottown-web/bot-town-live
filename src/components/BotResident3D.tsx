import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getLocation, useTownStore } from "../lib/botSimulation";
import { TOWN_COLORS } from "../lib/townData";
import type { BotResident } from "../lib/townTypes";

export const botObjectRefs = new Map<string, THREE.Group>();

export function BotResident3D({ bot }: { bot: BotResident }) {
  const ref=useRef<THREE.Group>(null); const body=useRef<THREE.Group>(null); const select=useTownStore(s=>s.selectBot); const selected=useTownStore(s=>s.selectedBotId===bot.id); const reduced=useTownStore(s=>s.reducedMotion);
  useEffect(()=>{ if(ref.current) botObjectRefs.set(bot.id,ref.current); return()=>{botObjectRefs.delete(bot.id)} },[bot.id]);
  useFrame(({clock},rawDelta)=>{ const group=ref.current; if(!group)return; const dt=Math.min(rawDelta,.05); const target=getLocation(useTownStore.getState().residents.find(r=>r.id===bot.id)?.destination??bot.destination); const dx=target.position[0]-group.position.x, dz=target.position[2]-group.position.z; const dist=Math.hypot(dx,dz);
    if(dist>.9){ const speed=reduced?1.7:2.35; group.position.x+=(dx/dist)*speed*dt; group.position.z+=(dz/dist)*speed*dt; const yaw=Math.atan2(dx,dz); group.rotation.y=THREE.MathUtils.lerp(group.rotation.y,yaw,1-Math.exp(-8*dt)); if(body.current&&!reduced) body.current.position.y=.72+Math.abs(Math.sin(clock.elapsedTime*7+bot.name.length))*.13; }
    else { const current=useTownStore.getState().residents.find(r=>r.id===bot.id); if(current?.activity==="Walking") useTownStore.setState(s=>({residents:s.residents.map(r=>r.id===bot.id?{...r,currentLocation:r.destination,activity:r.intention.split(" at ")[0] as BotResident["activity"]}:r)})); }
  });
  return <group ref={ref} position={bot.position} onClick={e=>{e.stopPropagation();select(bot.id)}}>
    <group ref={body} position-y={.72} scale={selected?1.12:1}>
      <mesh castShadow><capsuleGeometry args={[.38,.52,5,12]}/><meshStandardMaterial color={TOWN_COLORS.white} metalness={.35} roughness={.24}/></mesh>
      <mesh position={[0,.34,.34]} scale={[1,.58,.18]}><sphereGeometry args={[.32,16,10]}/><meshStandardMaterial color={TOWN_COLORS.dark} metalness={.8}/></mesh>
      {[-.11,.11].map(x=><mesh key={x} position={[x,.37,.405]}><sphereGeometry args={[.035,8,8]}/><meshBasicMaterial color={bot.accent}/></mesh>)}
      <mesh position={[0,-.18,.38]}><boxGeometry args={[.42,.055,.04]}/><meshBasicMaterial color={bot.accent}/></mesh>
      {[-.31,.31].map(x=><mesh key={x} position={[x,-.12,0]}><sphereGeometry args={[.16,10,8]}/><meshStandardMaterial color={TOWN_COLORS.structureLight} metalness={.7}/></mesh>)}
      <pointLight position={[0,.1,.4]} color={bot.accent} intensity={selected?4:1.6} distance={2.5}/>
    </group>
    {(selected||bot.speech)&&<Html position={[0,1.85,0]} center distanceFactor={13}><div className={selected?"bot-nameplate":"speech-bubble"}>{selected?bot.name:bot.speech}</div></Html>}
  </group>;
}