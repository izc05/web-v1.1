import { Canvas, useFrame } from "@react-three/fiber";
import { Cloud, Clouds } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import FlightScene from "./FlightScene";
import GlobeScene from "./GlobeScene";

function PearlCloudField({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!group.current) return;

    const targetX = reducedMotion ? 0 : state.pointer.x * -0.55;
    const targetY = reducedMotion ? 0 : state.pointer.y * -0.34;
    const targetZ = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.22) * 0.16;

    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, targetX, 2.4, delta);
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetY, 2.4, delta);
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, targetZ, 1.8, delta);
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      reducedMotion ? 0 : state.pointer.x * 0.018,
      2.2,
      delta,
    );
  });

  const cloudSpeed = reducedMotion ? 0 : 0.08;

  return (
    <group ref={group}>
      <Clouds limit={220} material={THREE.MeshLambertMaterial}>
        <Cloud seed={11} position={[-5.2, 2.25, -5.4]} bounds={[5.8, 2.1, 2.5]} segments={28} volume={7} growth={6} fade={24} opacity={0.32} speed={cloudSpeed} />
        <Cloud seed={17} position={[5.4, 2.5, -4.5]} bounds={[5, 2, 2.2]} segments={26} volume={6} growth={5.5} fade={22} opacity={0.29} speed={cloudSpeed * 0.8} />
        <Cloud seed={23} position={[-5.3, -2.05, -1.2]} bounds={[5.4, 2.4, 2.6]} segments={30} volume={7} growth={6} fade={20} opacity={0.38} speed={cloudSpeed * 1.15} />
        <Cloud seed={29} position={[5.5, -1.9, -0.5]} bounds={[5.6, 2.25, 2.6]} segments={30} volume={7} growth={6.2} fade={20} opacity={0.38} speed={cloudSpeed} />
        <Cloud seed={31} position={[-7.2, 0.3, 2.4]} bounds={[4.4, 2, 1.8]} segments={24} volume={5} growth={5} fade={18} opacity={0.22} speed={cloudSpeed * 0.7} />
        <Cloud seed={37} position={[7.1, 0.55, 2.6]} bounds={[4.2, 1.9, 1.8]} segments={24} volume={5} growth={5} fade={18} opacity={0.22} speed={cloudSpeed * 0.7} />
      </Clouds>
    </group>
  );
}

function AtmosphereScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8.5], fov: 46, near: 0.1, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
    >
      <color attach="background" args={["#fffafc"]} />
      <fog attach="fog" args={["#fff7fb", 9, 30]} />

      <ambientLight intensity={2.4} />
      <hemisphereLight args={["#ffffff", "#f2b3cf", 1.7]} />
      <directionalLight position={[4, 8, 7]} intensity={2.7} color="#ffffff" />
      <pointLight position={[-5, 2, 5]} intensity={28} color="#f7c3dc" distance={18} />
      <pointLight position={[6, -2, 3]} intensity={20} color="#e869a6" distance={16} />

      <PearlCloudField reducedMotion={reducedMotion} />
      <GlobeScene reducedMotion={reducedMotion} />
      <FlightScene reducedMotion={reducedMotion} />
    </Canvas>
  );
}

export default function App() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return (
    <main className="intro-lab">
      <div className="canvas-wrap" aria-hidden="true">
        <AtmosphereScene reducedMotion={reducedMotion} />
      </div>

      <div className="soft-glow glow-a" aria-hidden="true" />
      <div className="soft-glow glow-b" aria-hidden="true" />

      <section className="lab-panel" aria-label="Estado del laboratorio 3D">
        <p className="phase">FASE 3 · DESCUBRIMIENTO</p>
        <p className="phase-title">Globo 3D vivo</p>
        <p className="phase-copy">El avión abre el recorrido y descubre un planeta perla con líneas magenta, deformación orgánica mínima y respuesta suave al cursor.</p>
      </section>

      <div className="corner-note" aria-hidden="true">
        <span className="dot" />
        MUEVE EL CURSOR · GLOBO VIVO · VIAJE EN LOOP
      </div>

      <div className="brand-whisper" aria-hidden="true">
        <span>LANGUAGE</span>
        <strong>WORLD</strong>
      </div>
    </main>
  );
}
