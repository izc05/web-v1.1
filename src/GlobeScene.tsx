import { MeshDistortMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const CYCLE_SECONDS = 8.5;
const GLOBE_POSITION: [number, number, number] = [0.35, 0.08, -1.45];

function LatitudeRing({ y, radius }: { y: number; radius: number }) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.012, 10, 96]} />
      <meshBasicMaterial color="#d62974" transparent opacity={0.34} depthWrite={false} />
    </mesh>
  );
}

function GlobeGrid() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.47, 64, 64]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.16} wireframe depthWrite={false} />
      </mesh>

      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[1.5, 0.014, 10, 128]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.44} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 3, 0]}>
        <torusGeometry args={[1.5, 0.014, 10, 128]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 3, 0]}>
        <torusGeometry args={[1.5, 0.014, 10, 128]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.34} depthWrite={false} />
      </mesh>

      <LatitudeRing y={0.72} radius={1.31} />
      <LatitudeRing y={0} radius={1.5} />
      <LatitudeRing y={-0.72} radius={1.31} />
    </group>
  );
}

export default function GlobeScene({ reducedMotion }: { reducedMotion: boolean }) {
  const globe = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const pointerTarget = useMemo(() => new THREE.Vector2(), []);

  useFrame((state, delta) => {
    if (!globe.current) return;

    const cycleTime = reducedMotion ? CYCLE_SECONDS : state.clock.elapsedTime % CYCLE_SECONDS;
    const reveal = reducedMotion ? 1 : THREE.MathUtils.smoothstep(cycleTime, 2.6, 4.65);
    const easedScale = THREE.MathUtils.lerp(0.02, 1, reveal);

    globe.current.visible = reveal > 0.01;
    globe.current.scale.setScalar(easedScale);

    pointerTarget.set(reducedMotion ? 0 : state.pointer.y * 0.075, reducedMotion ? 0 : state.pointer.x * 0.1);
    globe.current.rotation.x = THREE.MathUtils.damp(globe.current.rotation.x, pointerTarget.x, 3.5, delta);
    globe.current.rotation.y += reducedMotion ? 0 : delta * 0.08;
    globe.current.rotation.z = THREE.MathUtils.damp(
      globe.current.rotation.z,
      reducedMotion ? -0.06 : -0.06 + state.pointer.x * 0.025,
      3,
      delta,
    );

    globe.current.position.y = GLOBE_POSITION[1] + (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.055);

    if (light.current) {
      light.current.position.x = state.pointer.x * 1.8;
      light.current.position.y = state.pointer.y * 1.2;
      light.current.intensity = 7 + reveal * 9;
    }

    if (core.current) {
      const hoverBias = reducedMotion ? 0 : Math.abs(state.pointer.x) * 0.018 + Math.abs(state.pointer.y) * 0.012;
      core.current.scale.setScalar(1 + hoverBias);
    }
  });

  return (
    <group ref={globe} position={GLOBE_POSITION}>
      <mesh ref={core}>
        <sphereGeometry args={[1.36, 96, 96]} />
        <MeshDistortMaterial
          color="#f9d7e6"
          roughness={0.16}
          metalness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.08}
          distort={reducedMotion ? 0 : 0.12}
          speed={reducedMotion ? 0 : 0.72}
        />
      </mesh>

      <GlobeGrid />

      <mesh rotation={[Math.PI / 2.6, 0.22, -0.08]}>
        <torusGeometry args={[1.82, 0.018, 12, 180]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      <pointLight ref={light} position={[-0.7, 0.6, 2]} color="#ef72aa" intensity={9} distance={6} />
    </group>
  );
}
