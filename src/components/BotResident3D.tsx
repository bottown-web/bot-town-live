import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getLocation, useTownStore } from "../lib/botSimulation";
import { TOWN_COLORS } from "../lib/townData";
import type { BotResident } from "../lib/townTypes";

export const botObjectRefs = new Map<string, THREE.Group>();

export function BotResident3D({ bot }: { bot: BotResident }) {
  const ref=useRef<THREE.Group>(null); const body=useRef<THREE.Group>(null); const select=useTownStore(s=>s.selectBot); const selected=useTownStore(s=>s.selectedBotId===bot.id); const reduced=useTownStore(s=>s.reducedMotion); const lastDestination=useRef(bot.destination); const route=useRef<THREE.Vector3[]>([]); const routeIndex=useRef(0);
  useEffect(()=>{ if(ref.current) botObjectRefs.set(bot.id,ref.current); return()=>{botObjectRefs.delete(bot.id)} },[bot.id]);
  useFrame(({clock},rawDelta)=>{ const group=ref.current; if(!group)return; const dt=Math.min(rawDelta,.05); const resident=useTownStore.getState().residents.find(r=>r.id===bot.id); const destination=resident?.destination??bot.destination; const target=getLocation(destination); if(destination!==lastDestination.current||route.current.length===0){lastDestination.current=destination;const roadZ=Math.abs(group.position.z-8)<Math.abs(group.position.z)?8:Math.abs(group.position.z+8)<Math.abs(group.position.z)?-8:0;const targetRoadZ=Math.abs(target.position[2]-8)<Math.abs(target.position[2])?8:Math.abs(target.position[2]+8)<Math.abs(target.position[2])?-8:0;route.current=[new THREE.Vector3(group.position.x,0,roadZ),new THREE.Vector3(0,0,roadZ),new THREE.Vector3(0,0,targetRoadZ),new THREE.Vector3(target.position[0],0,targetRoadZ),new THREE.Vector3(target.position[0],0,target.position[2])];routeIndex.current=0;} const waypoint=route.current[routeIndex.current]??new THREE.Vector3(...target.position); const dx=waypoint.x-group.position.x, dz=waypoint.z-group.position.z; const dist=Math.hypot(dx,dz);
    if(dist>.9){ const speed=reduced?1.7:2.35; group.position.x+=(dx/dist)*speed*dt; group.position.z+=(dz/dist)*speed*dt; const yaw=Math.atan2(dx,dz); group.rotation.y=THREE.MathUtils.lerp(group.rotation.y,yaw,1-Math.exp(-8*dt)); if(body.current&&!reduced) body.current.position.y=.72+Math.abs(Math.sin(clock.elapsedTime*7+bot.name.length))*.13; }
    else if(routeIndex.current<route.current.length-1){routeIndex.current+=1}else { const current=useTownStore.getState().residents.find(r=>r.id===bot.id); if(current?.activity==="Walking") useTownStore.setState(s=>({residents:s.residents.map(r=>r.id===bot.id?{...r,currentLocation:r.destination,activity:r.intention.split(" at ")[0] as BotResident["activity"]}:r)})); }
  });
  return <group ref={ref} position={bot.position} onClick={e=>{e.stopPropagation();select(bot.id)}}>
    <group ref={body} position-y={.76} scale={selected?1.16:1}>
      <mesh castShadow scale={[1,.9,.58]}><sphereGeometry args={[.58,18,12]}/><meshStandardMaterial color={TOWN_COLORS.white} metalness={.38} roughness={.2}/></mesh>
      <mesh position={[0,.02,.34]} scale={[1,.74,.18]}><sphereGeometry args={[.45,16,10]}/><meshStandardMaterial color={TOWN_COLORS.dark} metalness={.86} roughness={.16}/></mesh>
      {[-.14,.14].map((x,i)=><mesh key={x} position={[x,.08,.425]} rotation-z={-.28}><capsuleGeometry args={[.035,.13,4,8]}/><meshBasicMaterial color={i===0?TOWN_COLORS.white:bot.accent}/></mesh>)}
      <mesh position={[0,-.36,-.28]}><boxGeometry args={[.48,.16,.2]}/><meshStandardMaterial color={bot.accent} emissive={bot.accent} emissiveIntensity={.8}/></mesh>
      {[-.27,.27].map(x=><group key={x} position={[x,-.5,0]}><mesh castShadow><sphereGeometry args={[.17,10,8]}/><meshStandardMaterial color={TOWN_COLORS.structureLight} metalness={.72}/></mesh><mesh position={[0,-.1,.08]}><boxGeometry args={[.22,.1,.3]}/><meshStandardMaterial color={TOWN_COLORS.dark}/></mesh></group>)}
      <pointLight position={[0,.1,.4]} color={bot.accent} intensity={selected?4:1.6} distance={2.5}/>
    </group>
    {selected&&<mesh rotation-x={-Math.PI/2} position-y={.06}><ringGeometry args={[.62,.78,32]}/><meshBasicMaterial color={bot.accent} transparent opacity={.85} depthWrite={false}/></mesh>}
    {(selected||bot.speech)&&<Html position={[0,1.85,0]} center distanceFactor={13}><div className={selected?"bot-nameplate":"speech-bubble"}>{selected?bot.name:bot.speech}</div></Html>}
  </group>;
}