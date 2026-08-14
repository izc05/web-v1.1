import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, Ring, useTexture } from "@react-three/drei";
import * as THREE from "three";

const MAGENTA = "#d62974";
const MAGENTA_LIGHT = "#f4a7c8";

export default function PremiumGlobe({ introComplete }: { introComplete: boolean }) {
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

    // Gentle rotation
    groupRef.current.rotation.y += delta * 0.015;
    
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
          backsideThickness={0.5}
          thickness={0.8}
          color="#ffffff"
          roughness={0.02}
          chromaticAberration={0.04}
          anisotropicBlur={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.5}
          resolution={512}
        />
      </mesh>

      {/* Inner Core (The Earth Model) */}
      {/* Tilted for axial realism, and rotated Y to show London initially at +Z */}
      <mesh scale={1.42} rotation={[0.4, Math.PI / 1.1, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhysicalMaterial
          map={earthMap}
          color="#ffd6e8"
          emissive={MAGENTA}
          emissiveIntensity={0.05}
          roughness={0.4}
          metalness={0.1}
          clearcoat={0.5}
        />
      </mesh>

      {/* Inner lighting */}
      <pointLight position={[0, 0, 0]} color={MAGENTA} intensity={2} distance={3} />
    </group>
  );
}
