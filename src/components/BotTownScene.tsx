import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { TownEnvironment } from "./TownEnvironment";
import { TownBuildings } from "./TownBuildings";
import { BotResident3D, botObjectRefs } from "./BotResident3D";
import { getLocation, useTownStore } from "../lib/botSimulation";

export const cameraActions = { reset: () => {} };

function CameraRig() {
  const controls=useRef<OrbitControlsImpl>(null); const followed=useTownStore(s=>s.followedBotId); const focused=useTownStore(s=>s.selectedLocationId); const reduced=useTownStore(s=>s.reducedMotion); const {camera}=useThree(); const lastInteraction=useRef(Date.now());
  const followPosition=useRef(new THREE.Vector3()); const followTarget=useRef(new THREE.Vector3());
  useEffect(()=>{cameraActions.reset=()=>{camera.position.set(38,37,42); controls.current?.target.set(0,0,0); controls.current?.update(); useTownStore.setState({followedBotId:null,selectedLocationId:null});}},[camera]);
  useFrame((_,rawDelta)=>{ const dt=Math.min(rawDelta,.05); const c=controls.current; if(!c)return; c.autoRotate=!reduced&&!followed&&!focused&&Date.now()-lastInteraction.current>9000; if(followed){const target=botObjectRefs.get(followed);if(target){const p=target.position;followTarget.current.set(p.x,.8,p.z);followPosition.current.set(p.x+6,7,p.z+7);c.target.lerp(followTarget.current,1-Math.exp(-5*dt));camera.position.lerp(followPosition.current,1-Math.exp(-3*dt));c.update();}}else if(focused){const loc=getLocation(focused);followTarget.current.set(loc.position[0],1,loc.position[2]);followPosition.current.set(loc.position[0]+11,11,loc.position[2]+13);c.target.lerp(followTarget.current,1-Math.exp(-4*dt));camera.position.lerp(followPosition.current,1-Math.exp(-2.4*dt));c.update();}});
  return <><PerspectiveCamera makeDefault position={[38,37,42]} fov={45}/><OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.075} autoRotateSpeed={.35} minDistance={12} maxDistance={70} minPolarAngle={.48} maxPolarAngle={1.32} onStart={()=>{lastInteraction.current=Date.now()}}/></>;
}

function SceneContents(){ const residents=useTownStore(s=>s.residents); const reduced=useTownStore(s=>s.reducedMotion); return <><CameraRig/><TownEnvironment/><TownBuildings/>{residents.map(bot=><BotResident3D key={bot.id} bot={bot}/>)}{!reduced&&<EffectComposer multisampling={0}><Bloom mipmapBlur intensity={.72} luminanceThreshold={.75} radius={.5}/><Vignette eskil={false} offset={.22} darkness={.55}/></EffectComposer>}</> }

function webglAvailable(){try{const c=document.createElement("canvas");return Boolean(c.getContext("webgl2")||c.getContext("webgl"));}catch{return false}}

export function BotTownScene(){ if(typeof document!=="undefined"&&!webglAvailable())return <div className="webgl-fallback"><strong>Bot Town needs WebGL</strong><span>Enable hardware acceleration or try a modern browser to enter the town.</span></div>;
  return <Canvas shadows dpr={[1,1.5]} gl={{antialias:true,powerPreference:"high-performance"}} onPointerMissed={()=>useTownStore.getState().selectBot(null)}><Suspense fallback={null}><SceneContents/></Suspense></Canvas>;
}