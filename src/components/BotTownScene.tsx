import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Bloom, EffectComposer, TiltShift2, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { TownEnvironment } from "./TownEnvironment";
import { TownBuildings } from "./TownBuildings";
import { TownBus } from "./TownBus";
import { BotResident3D, botObjectRefs } from "./BotResident3D";
import { getLocation, useTownStore } from "../lib/botSimulation";

export const cameraActions = { reset: () => {} };

const HOME_POSITION = new THREE.Vector3(8.5, 19, 43);
const HOME_TARGET = new THREE.Vector3(0.4, 0, 1.6);

/** Tall (phone) screens aim a little further north so the plaza sits below the top cards. */
function homeTarget(aspect: number, out = new THREE.Vector3()) {
  out.copy(HOME_TARGET);
  if (aspect < 1) out.z -= 4.5;
  return out;
}

/** Tall (phone) screens also pull the camera back so the whole town square still fits. */
function homePosition(aspect: number, out = new THREE.Vector3()) {
  const zoom = aspect < 1 ? Math.min(1.8, Math.pow(1 / aspect, 0.6)) : 1;
  const target = homeTarget(aspect);
  return out.copy(HOME_POSITION).sub(HOME_TARGET).multiplyScalar(zoom).add(target);
}

function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const followed = useTownStore((s) => s.followedBotId);
  const focused = useTownStore((s) => s.selectedLocationId);
  const autoRotate = useTownStore((s) => s.autoRotate);
  const reduced = useTownStore((s) => s.reducedMotion);
  const { camera } = useThree();
  const size = useThree((s) => s.size);
  const initialHome = useRef(homePosition(size.width / Math.max(1, size.height)));
  const initialTarget = useRef(homeTarget(size.width / Math.max(1, size.height)));
  const homeAim = useRef(new THREE.Vector3());
  const home = useRef(new THREE.Vector3());
  const homing = useRef(false);
  const followPosition = useRef(new THREE.Vector3());
  const followTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    cameraActions.reset = () => {
      homing.current = true;
      useTownStore.setState({ followedBotId: null, selectedLocationId: null });
    };
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const c = controls.current;
    if (!c) return;
    c.autoRotate = autoRotate && !reduced && !followed && !focused;
    if (followed) {
      const target = botObjectRefs.get(followed);
      if (target) {
        const p = target.position;
        followTarget.current.set(p.x, 0.9, p.z);
        followPosition.current.set(p.x + 5, 8, p.z + 10);
        c.target.lerp(followTarget.current, 1 - Math.exp(-5 * dt));
        camera.position.lerp(followPosition.current, 1 - Math.exp(-3 * dt));
        c.update();
      }
    } else if (focused) {
      const loc = getLocation(focused);
      followTarget.current.set(loc.position[0], 1.2, loc.position[2]);
      followPosition.current.set(loc.position[0] + 7, 15, loc.position[2] + 19);
      c.target.lerp(followTarget.current, 1 - Math.exp(-4 * dt));
      camera.position.lerp(followPosition.current, 1 - Math.exp(-2.4 * dt));
      c.update();
    } else if (homing.current) {
      homeTarget(size.width / Math.max(1, size.height), homeAim.current);
      c.target.lerp(homeAim.current, 1 - Math.exp(-4 * dt));
      homePosition(size.width / Math.max(1, size.height), home.current);
      camera.position.lerp(home.current, 1 - Math.exp(-3 * dt));
      c.update();
      if (camera.position.distanceTo(home.current) < 0.2) homing.current = false;
    }
  });

  return <>
    <PerspectiveCamera makeDefault position={initialHome.current.toArray()} fov={36} near={0.5} far={900} />
    <OrbitControls
      ref={controls} makeDefault target={initialTarget.current.toArray()} enableDamping dampingFactor={0.08} autoRotateSpeed={0.3}
      minDistance={10} maxDistance={95} minPolarAngle={0.25} maxPolarAngle={1.18}
      onStart={() => { homing.current = false; }}
    />
  </>;
}

function SceneContents() {
  const residents = useTownStore((s) => s.residents);
  const reduced = useTownStore((s) => s.reducedMotion);
  return <>
    <CameraRig />
    <TownEnvironment />
    <TownBuildings />
    <TownBus />
    {residents.map((bot) => <BotResident3D key={bot.id} bot={bot} />)}
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.92} luminanceSmoothing={0.2} radius={0.55} />
      <TiltShift2 blur={reduced ? 0 : 0.09} taper={0.55} start={[0.5, 0.05]} end={[0.5, 0.95]} samples={8} />
      <Vignette eskil={false} offset={0.3} darkness={0.28} />
    </EffectComposer>
  </>;
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function BotTownScene() {
  if (typeof document !== "undefined" && !webglAvailable()) {
    return <div className="webgl-fallback"><strong>Bot Town needs WebGL</strong><span>Turn on hardware acceleration or open the town in a recent version of Chrome, Safari, Firefox or Edge.</span></div>;
  }
  return <Canvas
    shadows dpr={[1, 1.75]}
    gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
    onPointerMissed={() => useTownStore.getState().selectBot(null)}
  >
    <Suspense fallback={null}><SceneContents /></Suspense>
  </Canvas>;
}
