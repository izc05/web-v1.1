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
      {/* Main Fuselage */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.15, 0.9, 32, 32]} />
        <meshPhysicalMaterial color={MAGENTA} clearcoat={1} clearcoatRoughness={0.05} roughness={0.1} metalness={0.1} />
      </mesh>
      
      {/* Cockpit Window */}
      <mesh position={[0, 0.12, 0.3]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.14, 0.08, 0.15]} />
        <meshPhysicalMaterial color="#222222" roughness={0} metalness={0.8} clearcoat={1} />
      </mesh>
      
      {/* Main Wings */}
      <mesh position={[0, -0.02, 0.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[1.4, 0.03, 0.3]} />
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} clearcoatRoughness={0.05} roughness={0.1} />
      </mesh>

      {/* Engines */}
      <mesh position={[-0.35, -0.08, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.25, 16]} />
        <meshPhysicalMaterial color="#dddddd" metalness={0.5} roughness={0.2} />
      </mesh>
      <mesh position={[0.35, -0.08, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.25, 16]} />
        <meshPhysicalMaterial color="#dddddd" metalness={0.5} roughness={0.2} />
      </mesh>
      
      {/* Tail (Vertical Stabilizer) */}
      <mesh position={[0, 0.15, -0.35]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.03, 0.3, 0.15]} />
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.1} />
      </mesh>
      
      {/* Horizontal Stabilizers */}
      <mesh position={[0, 0.02, -0.38]}>
        <boxGeometry args={[0.5, 0.03, 0.15]} />
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.1} />
      </mesh>
      
      {/* Lights */}
      <pointLight position={[-0.7, 0, 0.1]} color="#ff0000" intensity={0.8} distance={1.5} />
      <pointLight position={[0.7, 0, 0.1]} color="#00ff00" intensity={0.8} distance={1.5} />
    </group>
  );
}
