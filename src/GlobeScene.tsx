import { MeshDistortMaterial, MeshTransmissionMaterial } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const INTRO_SECONDS = 7.6;
const TRANSITION_SECONDS = 1.15;
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
      <mesh><torusGeometry args={[1.5, 0.014, 10, 128]} /><meshBasicMaterial color="#d62974" transparent opacity={0.52} depthWrite={false} /></mesh>
      <mesh rotation={[0, Math.PI / 3, 0]}><torusGeometry args={[1.5, 0.014, 10, 128]} /><meshBasicMaterial color="#d62974" transparent opacity={0.37} depthWrite={false} /></mesh>
      <mesh rotation={[0, -Math.PI / 3, 0]}><torusGeometry args={[1.5, 0.014, 10, 128]} /><meshBasicMaterial color="#d62974" transparent opacity={0.37} depthWrite={false} /></mesh>
      <LatitudeRing y={0.72} radius={1.31} />
      <LatitudeRing y={0} radius={1.5} />
      <LatitudeRing y={-0.72} radius={1.31} />
    </group>
  );
}

function CrystalHalo() {
  return (
    <group position={[0, 0, -0.55]} rotation={[0.12, 0.18, 0]}>
      <mesh>
        <ringGeometry args={[1.72, 2.2, 96]} />
        <meshBasicMaterial color="#ef8fba" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 3.8]}>
        <torusGeometry args={[2.05, 0.022, 10, 160]} />
        <meshBasicMaterial color="#f4a9c8" transparent opacity={0.11} depthWrite={false} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4.5]}>
        <torusGeometry args={[1.9, 0.01, 8, 160]} />
        <meshBasicMaterial color="#fff1f7" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function GlobeScene({
  reducedMotion,
  interactive,
  transitioning,
}: {
  reducedMotion: boolean;
  interactive: boolean;
  transitioning: boolean;
}) {
  const globe = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const pointerTarget = useMemo(() => new THREE.Vector2(), []);
  const transitionStartedAt = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!interactive || reducedMotion || transitioning) {
      document.body.style.cursor = "";
      return;
    }
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => { document.body.style.cursor = ""; };
  }, [hovered, interactive, reducedMotion, transitioning]);

  useEffect(() => {
    if (!transitioning) transitionStartedAt.current = null;
    if (transitioning) {
      setHovered(false);
      setPressed(false);
      document.body.style.cursor = "";
    }
  }, [transitioning]);

  useFrame((state, delta) => {
    if (!globe.current) return;

    if (transitioning && transitionStartedAt.current === null) {
      transitionStartedAt.current = state.clock.elapsedTime;
    }

    const transitionProgress = transitioning && transitionStartedAt.current !== null
      ? THREE.MathUtils.clamp((state.clock.elapsedTime - transitionStartedAt.current) / TRANSITION_SECONDS, 0, 1)
      : 0;

    const reveal = reducedMotion || interactive || transitioning
      ? 1
      : THREE.MathUtils.smoothstep(Math.min(state.clock.elapsedTime / INTRO_SECONDS, 1), 0.3, 0.68);

    globe.current.visible = reveal > 0.01;

    let targetScale = THREE.MathUtils.lerp(0.02, pressed ? 0.965 : hovered && interactive ? 1.045 : 1, reveal);

    if (transitioning) {
      if (transitionProgress < 0.16) {
        const local = THREE.MathUtils.smoothstep(transitionProgress / 0.16, 0, 1);
        targetScale = THREE.MathUtils.lerp(1, 0.9, local);
      } else if (transitionProgress < 0.3) {
        const local = THREE.MathUtils.smoothstep((transitionProgress - 0.16) / 0.14, 0, 1);
        targetScale = THREE.MathUtils.lerp(0.9, 1.12, local);
      } else {
        const local = THREE.MathUtils.smoothstep((transitionProgress - 0.3) / 0.7, 0, 1);
        targetScale = THREE.MathUtils.lerp(1.12, 11.8, local * local);
      }
      globe.current.scale.setScalar(targetScale);
    } else {
      const currentScale = globe.current.scale.x || 0.02;
      globe.current.scale.setScalar(THREE.MathUtils.damp(currentScale, targetScale, 5.8, delta));
    }

    const interaction = interactive && !reducedMotion && !transitioning ? 1 : 0.32;
    pointerTarget.set(state.pointer.y * 0.085 * interaction, state.pointer.x * 0.11 * interaction);
    globe.current.rotation.x = THREE.MathUtils.damp(globe.current.rotation.x, transitioning ? 0 : pointerTarget.x, 3.5, delta);
    globe.current.rotation.y += reducedMotion ? 0 : delta * (transitioning ? 0.55 + transitionProgress * 1.65 : interactive ? 0.09 : 0.055);
    globe.current.rotation.z = THREE.MathUtils.damp(
      globe.current.rotation.z,
      transitioning ? -0.02 : -0.06 + state.pointer.x * 0.03 * interaction,
      3,
      delta,
    );

    const floatingY = GLOBE_POSITION[1] + (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.055);

    if (transitioning) {
      const fly = THREE.MathUtils.smoothstep(transitionProgress, 0.27, 1);
      globe.current.position.x = THREE.MathUtils.lerp(GLOBE_POSITION[0], 0, fly);
      globe.current.position.y = THREE.MathUtils.lerp(floatingY, 0, fly);
      globe.current.position.z = THREE.MathUtils.lerp(GLOBE_POSITION[2], 5.85, fly);
    } else {
      globe.current.position.x = THREE.MathUtils.damp(globe.current.position.x, GLOBE_POSITION[0], 5, delta);
      globe.current.position.y = THREE.MathUtils.damp(globe.current.position.y, floatingY, 5, delta);
      globe.current.position.z = THREE.MathUtils.damp(globe.current.position.z, GLOBE_POSITION[2], 5, delta);
    }

    if (light.current) {
      light.current.position.x = transitioning ? 0 : state.pointer.x * (interactive ? 2.3 : 1.2);
      light.current.position.y = transitioning ? 0.25 : 0.35 + state.pointer.y * (interactive ? 1.6 : 0.7);
      light.current.intensity = 8 + reveal * 11 + (hovered && interactive ? 4 : 0) + transitionProgress * 28;
    }

    if (core.current) {
      const pointerBias = interactive && !reducedMotion && !transitioning
        ? Math.abs(state.pointer.x) * 0.009 + Math.abs(state.pointer.y) * 0.008
        : 0;
      core.current.rotation.z = THREE.MathUtils.damp(
        core.current.rotation.z,
        transitioning ? transitionProgress * -0.12 : state.pointer.x * -0.025 * interaction,
        4,
        delta,
      );
      core.current.scale.setScalar(1 + pointerBias);
    }

    if (inner.current) {
      const pulse = reducedMotion
        ? 1
        : 1 + Math.sin(state.clock.elapsedTime * (interactive ? 1.35 : 1.15)) * (interactive ? 0.024 : 0.018);
      inner.current.scale.setScalar(pulse + transitionProgress * 0.08);
    }
  });

  return (
    <group ref={globe} position={GLOBE_POSITION}>
      <CrystalHalo />
      <mesh position={[0, 0, -0.32]} scale={1.13}>
        <sphereGeometry args={[1.46, 64, 64]} />
        <meshBasicMaterial color="#f5a8ca" transparent opacity={0.055} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh ref={inner}>
        <sphereGeometry args={[1.04, 72, 72]} />
        <MeshDistortMaterial
          color="#f6a9c9"
          emissive="#d62974"
          emissiveIntensity={transitioning ? 0.16 : 0.08}
          roughness={0.46}
          metalness={0}
          transparent
          opacity={transitioning ? 0.44 : 0.34}
          depthWrite={false}
          distort={reducedMotion ? 0 : transitioning ? 0.16 : interactive ? 0.095 : 0.07}
          speed={reducedMotion ? 0 : transitioning ? 1.5 : interactive ? 0.58 : 0.4}
        />
      </mesh>
      <mesh
        ref={core}
        onPointerEnter={(event) => { event.stopPropagation(); if (interactive && !transitioning) setHovered(true); }}
        onPointerLeave={() => { setHovered(false); setPressed(false); }}
        onPointerDown={(event) => { event.stopPropagation(); if (interactive && !transitioning) setPressed(true); }}
        onPointerUp={(event) => { event.stopPropagation(); setPressed(false); }}
      >
        <sphereGeometry args={[1.37, 96, 96]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={transitioning ? 0.34 : 0.2}
          thickness={transitioning ? 0.78 : 0.48}
          color={transitioning ? "#ffd0e3" : "#ffd9e8"}
          roughness={transitioning ? 0.025 : hovered && interactive ? 0.045 : 0.07}
          chromaticAberration={transitioning ? 0.045 : hovered && interactive ? 0.028 : 0.018}
          anisotropicBlur={transitioning ? 0.24 : 0.16}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={transitioning ? 1.55 : 1.25}
        />
      </mesh>
      <GlobeGrid />
      <mesh rotation={[Math.PI / 2.6, 0.22, -0.08]}><torusGeometry args={[1.82, 0.018, 12, 180]} /><meshBasicMaterial color="#d62974" transparent opacity={transitioning ? 0.46 : 0.31} depthWrite={false} /></mesh>
      <mesh rotation={[Math.PI / 2.75, 0.22, -0.08]}><torusGeometry args={[1.92, 0.006, 8, 180]} /><meshBasicMaterial color="#ffb9d4" transparent opacity={transitioning ? 0.58 : 0.38} depthWrite={false} /></mesh>
      <pointLight ref={light} position={[-0.7, 0.6, 2]} color="#ef72aa" intensity={10} distance={6} />
      <pointLight position={[0.35, -0.15, -0.3]} color="#fff4f8" intensity={transitioning ? 11 : 5.5} distance={3.8} />
    </group>
  );
}
