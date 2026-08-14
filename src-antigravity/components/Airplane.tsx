import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAGENTA = "#d62974";

// The path the airplane will follow
export const flightPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-8, -2, 6),
  new THREE.Vector3(-4, -0.5, 4),
  new THREE.Vector3(-1, 0.5, 1.5),
  new THREE.Vector3(1, 0.5, 0),
  new THREE.Vector3(2.5, 0, -1.5),
  new THREE.Vector3(1, -0.5, -3),
  new THREE.Vector3(-1, 0, -2.5),
  new THREE.Vector3(-1.5, 0.5, -1),
  new THREE.Vector3(0, 0.8, -0.5),
  new THREE.Vector3(1.5, 1, 1),
], false, "catmullrom", 0.5);

export default function Airplane({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Helpers for path calculation
  const point = useRef(new THREE.Vector3());
  const tangent = useRef(new THREE.Vector3());
  const axis = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Progress goes from 0 to 1
    const t = Math.max(0, Math.min(progressRef.current, 0.999));
    
    // Position
    flightPath.getPointAt(t, point.current);
    groupRef.current.position.copy(point.current);
    
    // Rotation (look at path)
    flightPath.getTangentAt(t, tangent.current);
    
    // Bank angle (roll)
    // We bank more when tangent is changing rapidly in X/Z
    // For simplicity, we add a generic bank based on progress
    const bankAmount = Math.sin(t * Math.PI * 4) * 0.3;
    
    // Construct orientation matrix
    const matrix = new THREE.Matrix4();
    up.current.set(0, 1, 0).applyAxisAngle(tangent.current, bankAmount);
    matrix.lookAt(point.current, point.current.clone().add(tangent.current), up.current);
    groupRef.current.quaternion.setFromRotationMatrix(matrix);
    
    // Scale: plane appears smaller as it goes further
    const scale = 0.6 + (1 - t) * 0.4;
    groupRef.current.scale.setScalar(scale);
    
    // Hide when finished
    groupRef.current.visible = t < 0.99;
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.12, 0.8, 16, 16]} />
        <meshPhysicalMaterial color={MAGENTA} clearcoat={1} clearcoatRoughness={0.1} roughness={0.2} />
      </mesh>
      
      {/* Wings */}
      <mesh position={[0, -0.05, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.2, 0.04, 0.25]} />
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} clearcoatRoughness={0.1} roughness={0.2} />
      </mesh>
      
      {/* Tail */}
      <mesh position={[0, 0.1, 0.35]} rotation={[0.1, 0, 0]}>
        <boxGeometry args={[0.04, 0.25, 0.15]} />
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.38]}>
        <boxGeometry args={[0.4, 0.04, 0.1]} />
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.2} />
      </mesh>
      
      {/* Lights */}
      <pointLight position={[-0.6, 0, 0]} color="#ff0000" intensity={0.5} distance={1} />
      <pointLight position={[0.6, 0, 0]} color="#00ff00" intensity={0.5} distance={1} />
    </group>
  );
}
