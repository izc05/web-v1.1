import {
  Caustics,
  Environment,
  Lightformer,
  MeshDistortMaterial,
  MeshTransmissionMaterial,
} from "@react-three/drei";
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
        <meshBasicMaterial color="#d62974" transparent opacity={0.11} wireframe depthWrite={false} />
      </mesh>

      <mesh>
        <torusGeometry args={[1.5, 0.014, 10, 128]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.52} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 3, 0]}>
        <torusGeometry args={[1.5, 0.014, 10, 128]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.37} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, -Math.PI / 3, 0]}>
        <torusGeometry args={[1.5, 0.014, 10, 128]} />
        <meshBasicMaterial color="#d62974" transparent opacity={0.37} depthWrite={false} />
      </mesh>

      <LatitudeRing y={0.72} radius={1.31} />
      <LatitudeRing y={0} radius={1.5} />
      <LatitudeRing y={-0.72} radius={1.31} />
    </group>
  );
}

function CrystalEnvironment() {
  return (
    <Environment frames={1} resolution={128}>
      <Lightformer
        intensity={3.2}
        color="#ffffff"
        position={[0, 4, 4]}
        scale={[8, 3, 1]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <Lightformer
        intensity={2.4}
        color="#ffd7e8"
        position={[-4, 1.5, 1]}
        scale={[3, 7, 1]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <Lightformer
        intensity={2.1}
        color="#d62974"
        position={[4, -0.5, 0]}
        scale={[2, 6, 1]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Lightformer
        form="ring"
        intensity={1.9}
        color="#fff1f7"
        position={[0, 0, -4]}
        scale={[5, 5, 1]}
      />
    </Environment>
  );
}

export default function GlobeScene({ reducedMotion }: { reducedMotion: boolean }) {
  const globe = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const pointerTarget = useMemo(() => new THREE.Vector2(), []);

  useFrame((state, delta) => {
    if (!globe.current) return;

    const cycleTime = reducedMotion ? CYCLE_SECONDS : state.clock.elapsedTime % CYCLE_SECONDS;
    const reveal = reducedMotion ? 1 : THREE.MathUtils.smoothstep(cycleTime, 2.6, 4.65);
    const easedScale = THREE.MathUtils.lerp(0.02, 1, reveal);

    globe.current.visible = reveal > 0.01;
    globe.current.scale.setScalar(easedScale);

    pointerTarget.set(
      reducedMotion ? 0 : state.pointer.y * 0.075,
      reducedMotion ? 0 : state.pointer.x * 0.1,
    );
    globe.current.rotation.x = THREE.MathUtils.damp(globe.current.rotation.x, pointerTarget.x, 3.5, delta);
    globe.current.rotation.y += reducedMotion ? 0 : delta * 0.075;
    globe.current.rotation.z = THREE.MathUtils.damp(
      globe.current.rotation.z,
      reducedMotion ? -0.06 : -0.06 + state.pointer.x * 0.025,
      3,
      delta,
    );

    globe.current.position.y =
      GLOBE_POSITION[1] + (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.055);

    if (light.current) {
      light.current.position.x = state.pointer.x * 1.9;
      light.current.position.y = 0.35 + state.pointer.y * 1.35;
      light.current.intensity = 8 + reveal * 11;
    }

    if (core.current) {
      const hoverBias = reducedMotion
        ? 0
        : Math.abs(state.pointer.x) * 0.012 + Math.abs(state.pointer.y) * 0.01;
      core.current.scale.setScalar(1 + hoverBias);
    }

    if (inner.current) {
      const pulse = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * 1.15) * 0.018;
      inner.current.scale.setScalar(pulse);
    }
  });

  return (
    <>
      <CrystalEnvironment />

      <group ref={globe} position={GLOBE_POSITION}>
        <mesh position={[0, 0, -0.32]} scale={1.13}>
          <sphereGeometry args={[1.46, 64, 64]} />
          <meshBasicMaterial
            color="#f5a8ca"
            transparent
            opacity={0.055}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={inner}>
          <sphereGeometry args={[1.04, 72, 72]} />
          <MeshDistortMaterial
            color="#f6a9c9"
            emissive="#d62974"
            emissiveIntensity={0.08}
            roughness={0.46}
            metalness={0}
            transparent
            opacity={0.34}
            depthWrite={false}
            distort={reducedMotion ? 0 : 0.075}
            speed={reducedMotion ? 0 : 0.45}
          />
        </mesh>

        <Caustics
          causticsOnly={false}
          backside={false}
          color={[1, 0.77, 0.86]}
          lightSource={[-2.2, 3.8, 4.2]}
          intensity={0.0035}
          worldRadius={0.045}
          ior={1.16}
        >
          <mesh ref={core}>
            <sphereGeometry args={[1.37, 96, 96]} />
            <MeshTransmissionMaterial
              backside
              backsideThickness={0.2}
              thickness={0.48}
              color="#ffd9e8"
              roughness={0.07}
              chromaticAberration={0.018}
              anisotropicBlur={0.16}
              clearcoat={1}
              clearcoatRoughness={0.05}
              envMapIntensity={1.9}
            />
          </mesh>
        </Caustics>

        <GlobeGrid />

        <mesh rotation={[Math.PI / 2.6, 0.22, -0.08]}>
          <torusGeometry args={[1.82, 0.018, 12, 180]} />
          <meshBasicMaterial color="#d62974" transparent opacity={0.31} depthWrite={false} />
        </mesh>

        <mesh rotation={[Math.PI / 2.75, 0.22, -0.08]}>
          <torusGeometry args={[1.92, 0.006, 8, 180]} />
          <meshBasicMaterial color="#ffb9d4" transparent opacity={0.38} depthWrite={false} />
        </mesh>

        <pointLight
          ref={light}
          position={[-0.7, 0.6, 2]}
          color="#ef72aa"
          intensity={10}
          distance={6}
        />
        <pointLight position={[0.35, -0.15, -0.3]} color="#fff4f8" intensity={5.5} distance={3.8} />
      </group>
    </>
  );
}
