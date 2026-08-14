import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function FoundationMark({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector2(), []);

  useFrame((state, delta) => {
    if (!group.current) return;

    target.set(state.pointer.y * 0.12, state.pointer.x * 0.16);
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      reducedMotion ? 0 : target.x,
      4,
      delta,
    );
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      reducedMotion ? 0 : target.y + state.clock.elapsedTime * 0.08,
      3,
      delta,
    );
  });

  return (
    <Float speed={reducedMotion ? 0 : 1.2} rotationIntensity={0.08} floatIntensity={0.16}>
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[1.02, 64, 64]} />
          <meshPhysicalMaterial
            color="#f7c7db"
            roughness={0.16}
            metalness={0.03}
            clearcoat={1}
            clearcoatRoughness={0.08}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2.7, 0.22, 0.12]}>
          <torusGeometry args={[1.35, 0.018, 16, 160]} />
          <meshStandardMaterial color="#d62974" roughness={0.25} metalness={0.08} />
        </mesh>

        <mesh position={[1.18, 0.46, 0.52]}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshStandardMaterial color="#d62974" emissive="#d62974" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </Float>
  );
}

function Scene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5.4], fov: 35, near: 0.1, far: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#fff9fc"]} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[4, 5, 6]} intensity={2.8} color="#ffffff" />
      <pointLight position={[-4, -1, 3]} intensity={32} color="#f1a8ca" distance={12} />
      <FoundationMark reducedMotion={reducedMotion} />
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
        <Scene reducedMotion={reducedMotion} />
      </div>

      <section className="identity" aria-label="Language School Rocío Ruiz">
        <p className="phase">FASE 0 · FOUNDATION</p>
        <div className="wordmark">
          <span className="language">LANGUAGE</span>
          <span className="school">School</span>
          <span className="rocio">ROCÍO RUIZ</span>
        </div>
        <p className="status">Laboratorio 3D activo · WebGL / R3F / Drei</p>
      </section>

      <div className="corner-note" aria-hidden="true">
        <span className="dot" />
        FOUNDATION ONLINE
      </div>
    </main>
  );
}
