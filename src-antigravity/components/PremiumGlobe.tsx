import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Ring, Line } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

const MAGENTA = "#d62974";
const MAGENTA_LIGHT = "#f4a7c8";

export default function PremiumGlobe({ introComplete }: { introComplete: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Smooth dampening values
  const targetScale = useRef(1);
  const pointer = useRef(new THREE.Vector2());

  useFrame((state, delta) => {
    if (!groupRef.current || !coreRef.current || !haloRef.current) return;

    // Gentle rotation
    groupRef.current.rotation.y += delta * 0.05;
    
    // Parallax on hover
    if (introComplete) {
      pointer.current.x = THREE.MathUtils.lerp(pointer.current.x, state.pointer.x, 0.1);
      pointer.current.y = THREE.MathUtils.lerp(pointer.current.y, state.pointer.y, 0.1);
      
      groupRef.current.rotation.x = pointer.current.y * 0.2;
      groupRef.current.rotation.z = pointer.current.x * -0.1;
      
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
        <meshBasicMaterial color={MAGENTA} wireframe transparent opacity={0.06} />
      </mesh>

      {/* Main Glass Body */}
      <mesh
        ref={coreRef}
        onPointerOver={() => introComplete && setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1.5, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          backsideThickness={0.5}
          thickness={1.2}
          color="#ffffff"
          roughness={0.05}
          chromaticAberration={0.04}
          anisotropicBlur={0.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.5}
          resolution={512}
        />
      </mesh>

      {/* Inner Core (Pearl/Magenta Glow) */}
      <mesh scale={0.9}>
        <sphereGeometry args={[1.4, 64, 64]} />
        <meshPhysicalMaterial
          color="#fff0f5"
          emissive={MAGENTA}
          emissiveIntensity={0.1}
          roughness={0.2}
          transmission={0.5}
          thickness={0.5}
        />
      </mesh>

      {/* Inner lighting */}
      <pointLight position={[0, 0, 0]} color={MAGENTA} intensity={2} distance={3} />
    </group>
  );
}
