import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import FlightScene from "./FlightScene";
import GlobeScene from "./GlobeScene";

const INTRO_MS = 7600;
const ENTRY_TRANSITION_MS = 1120;

type CloudClusterProps = {
  seed: number;
  position: [number, number, number];
  scale: [number, number, number];
  opacity: number;
};

function PearlCloudCluster({ seed, position, scale, opacity }: CloudClusterProps) {
  const puffs = useMemo(() => {
    let value = seed >>> 0;
    const random = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };

    return Array.from({ length: 9 }, (_, index) => ({
      position: [(random() - 0.5) * 2.75, (random() - 0.5) * 0.9, (random() - 0.5) * 1.15] as [number, number, number],
      scale: [0.78 + random() * 0.9, 0.48 + random() * 0.5, 0.62 + random() * 0.66] as [number, number, number],
      color: index % 3 === 0 ? "#f8dce8" : index % 4 === 0 ? "#fff0f6" : "#ffffff",
      opacity: opacity * (0.72 + random() * 0.28),
    }));
  }, [opacity, seed]);

  return (
    <group position={position} scale={scale}>
      {puffs.map((puff, index) => (
        <mesh key={index} position={puff.position} scale={puff.scale}>
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial
            color={puff.color}
            emissive="#fff7fb"
            emissiveIntensity={0.12}
            roughness={0.94}
            metalness={0}
            transparent
            opacity={puff.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function PearlCloudField({
  reducedMotion,
  settled,
  transitioning,
}: {
  reducedMotion: boolean;
  settled: boolean;
  transitioning: boolean;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;

    const interaction = settled && !reducedMotion && !transitioning ? 1 : 0.35;
    const targetX = state.pointer.x * -0.48 * interaction;
    const targetY = state.pointer.y * -0.3 * interaction;
    const targetZ = (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.22) * 0.14) + (transitioning ? 0.62 : 0);
    const targetScale = transitioning ? 1.14 : 1;

    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, targetX, 2.4, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetY, 2.4, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, targetZ, transitioning ? 4.2 : 1.8, delta);
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      state.pointer.x * 0.016 * interaction,
      2.2,
      delta,
    );
    group.current.scale.setScalar(THREE.MathUtils.damp(group.current.scale.x, targetScale, 3.8, delta));
  });

  return (
    <group ref={group}>
      <PearlCloudCluster seed={11} position={[-5.3, 2.35, -5.3]} scale={[1.55, 1.0, 1.15]} opacity={0.34} />
      <PearlCloudCluster seed={17} position={[5.2, 2.55, -4.4]} scale={[1.45, 0.92, 1.08]} opacity={0.31} />
      <PearlCloudCluster seed={23} position={[-5.2, -2.15, -1.1]} scale={[1.5, 1.08, 1.18]} opacity={0.42} />
      <PearlCloudCluster seed={29} position={[5.4, -1.95, -0.45]} scale={[1.55, 1.02, 1.18]} opacity={0.42} />
      <PearlCloudCluster seed={31} position={[-7.0, 0.35, 2.25]} scale={[1.25, 0.9, 0.95]} opacity={0.25} />
      <PearlCloudCluster seed={37} position={[6.9, 0.6, 2.45]} scale={[1.2, 0.85, 0.95]} opacity={0.25} />
    </group>
  );
}

function AtmosphereScene({
  reducedMotion,
  settled,
  transitioning,
}: {
  reducedMotion: boolean;
  settled: boolean;
  transitioning: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8.5], fov: 46, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
    >
      <color attach="background" args={["#fffafc"]} />
      <fog attach="fog" args={["#fff7fb", 9, 30]} />
      <ambientLight intensity={2.1} />
      <hemisphereLight args={["#ffffff", "#f2b3cf", 1.55]} />
      <directionalLight position={[4, 8, 7]} intensity={2.4} color="#ffffff" />
      <pointLight position={[-5, 2, 5]} intensity={25} color="#f7c3dc" distance={18} />
      <pointLight position={[6, -2, 3]} intensity={18} color="#e869a6" distance={16} />
      <PearlCloudField reducedMotion={reducedMotion} settled={settled} transitioning={transitioning} />
      <GlobeScene reducedMotion={reducedMotion} interactive={settled && !transitioning} transitioning={transitioning} />
      <FlightScene reducedMotion={reducedMotion} settled={settled} />
    </Canvas>
  );
}

export default function App() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [settled, setSettled] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [entered, setEntered] = useState(false);
  const [sceneVersion, setSceneVersion] = useState(0);
  const entryTimer = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setSettled(true);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(
    () => () => {
      if (entryTimer.current !== null) window.clearTimeout(entryTimer.current);
    },
    [],
  );

  const enterExperience = () => {
    if (!settled || transitioning || entered) return;

    if (reducedMotion) {
      setEntered(true);
      return;
    }

    setTransitioning(true);
    entryTimer.current = window.setTimeout(() => {
      setEntered(true);
      entryTimer.current = null;
    }, ENTRY_TRANSITION_MS);
  };

  const returnToIntro = () => {
    if (entryTimer.current !== null) {
      window.clearTimeout(entryTimer.current);
      entryTimer.current = null;
    }
    setEntered(false);
    setTransitioning(false);
    setSettled(true);
    setSceneVersion((value) => value + 1);
  };

  return (
    <main
      className={`intro-lab${reducedMotion ? " reduced-motion" : ""}${settled ? " intro-settled" : ""}${transitioning ? " enter-transition" : ""}${entered ? " entered" : ""}`}
    >
      <div className="canvas-wrap" aria-hidden="true" key={sceneVersion}>
        <AtmosphereScene reducedMotion={reducedMotion} settled={settled} transitioning={transitioning} />
      </div>
      <div className="soft-glow glow-a" aria-hidden="true" />
      <div className="soft-glow glow-b" aria-hidden="true" />

      <section className="brand-lockup" aria-label="Language School Rocío Ruiz">
        <span className="brand-language">LANGUAGE</span>
        <strong className="brand-school">School</strong>
        <span className="brand-rocio">ROCÍO RUIZ</span>
      </section>

      {!settled && !reducedMotion && (
        <button className="skip-intro" type="button" onClick={() => setSettled(true)}>
          Saltar intro
        </button>
      )}

      <div className="entry-actions" aria-hidden={!settled || transitioning}>
        <button
          className="enter-button"
          type="button"
          onClick={enterExperience}
          disabled={!settled || transitioning}
        >
          <span>ENTRAR</span>
          <span aria-hidden="true" className="enter-arrow">↗</span>
        </button>
        <p>Mueve el cursor sobre el mundo</p>
      </div>

      <div className="phase-chip" aria-hidden="true">FASE 7 · TRANSICIÓN</div>
      <div className="corner-note" aria-hidden="true">
        <span className="dot" />
        {transitioning ? "ATRAVESANDO EL MUNDO" : settled ? "MUNDO VIVO · LISTO PARA ENTRAR" : "AVIÓN · ÓRBITA · IDENTIDAD"}
      </div>

      <div className="transition-glass" aria-hidden="true" />

      <section className="home-placeholder" aria-hidden={!entered}>
        <p>LANGUAGE SCHOOL</p>
        <strong>HOME · PLACEHOLDER</strong>
        <span>La entrada ya termina atravesando el globo de cristal. Aquí conectaremos la Home real cuando la intro quede aprobada.</span>
        <button type="button" onClick={returnToIntro}>Volver a la entrada</button>
      </section>
    </main>
  );
}
