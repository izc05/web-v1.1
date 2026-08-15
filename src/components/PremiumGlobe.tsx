import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Ring, useTexture } from "@react-three/drei";
import * as THREE from "three";

const MAGENTA = "#d62974";
const MAGENTA_LIGHT = "#f4a7c8";

export default function PremiumGlobe({ introComplete, globeScaleRef }: { introComplete: boolean; globeScaleRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Load the earth texture we downloaded
  const earthMap = useTexture("/web-v1.1/earth.jpg");

  // Smooth dampening values
  const targetScale = useRef(1);
  const pointer = useRef(new THREE.Vector2());

  useFrame((state, delta) => {
    if (!groupRef.current || !coreRef.current || !haloRef.current) return;

    // Apply scale dynamically from GSAP intro animation
    if (!introComplete) {
      groupRef.current.scale.setScalar(globeScaleRef.current);
    }

    // Gentle rotation
    groupRef.current.rotation.y += delta * 0.015;
    
    // Parallax on hover
    if (introComplete) {
      pointer.current.x = THREE.MathUtils.lerp(pointer.current.x, state.pointer.x, 0.1);
      pointer.current.y = THREE.MathUtils.lerp(pointer.current.y, state.pointer.y, 0.1);
      
      groupRef.current.rotation.x = pointer.current.y * 0.6;
      groupRef.current.rotation.z = pointer.current.x * -0.4;
      
      targetScale.current = hovered ? 1.05 : 1;
      const currentScale = groupRef.current.scale.x;
      groupRef.current.scale.setScalar(THREE.MathUtils.damp(currentScale, targetScale.current, 4, delta));
      
      haloRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      {/* Outer Halo */}
      <group ref={haloRef}>
        <Ring args={[2.3, 2.32, 64]} rotation={[Math.PI / 2.5, 0.2, 0]}>
          <meshBasicMaterial color={MAGENTA} transparent opacity={0.3} side={THREE.DoubleSide} />
        </Ring>
        <Ring args={[2.1, 2.11, 64]} rotation={[Math.PI / 3, -0.1, 0]}>
          <meshBasicMaterial color={MAGENTA_LIGHT} transparent opacity={0.2} side={THREE.DoubleSide} />
        </Ring>
      </group>

      {/* Latitudes / Meridians (Wireframe illusion) */}
      <mesh>
        <sphereGeometry args={[1.52, 32, 32]} />
        <meshBasicMaterial color={MAGENTA} wireframe transparent opacity={0.015} />
      </mesh>

      {/* Main Glass Body - Transparent shell */}
      <mesh
        ref={coreRef}
        onPointerOver={() => introComplete && setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.1}
          thickness={0.2}
          color="#ffffff"
          roughness={0.0}
          chromaticAberration={0.01}
          anisotropicBlur={0.0}
          clearcoat={1}
          clearcoatRoughness={0.0}
          envMapIntensity={0.8}
          resolution={1024}
        />
      </mesh>

      {/* Inner Core (The Earth Model) */}
      {/* Rotation Y near 0 correctly places London/Europe at the front (+Z) */}
      <mesh scale={1.44} rotation={[0.45, -0.1, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          color={MAGENTA}
          transparent
          opacity={0.85}
          alphaMap={earthMap}
          alphaTest={0.05}
          emissive={MAGENTA}
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>

      {/* Inner lighting to pop the earth */}
      <pointLight position={[0, 0, 1.5]} color={MAGENTA_LIGHT} intensity={2} distance={6} />
    </group>
  );
}
