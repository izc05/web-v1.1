import { useMemo, useRef } from "react";
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
  const up = useRef(new THREE.Vector3(0, 1, 0));

  // 1. Aerodynamic Fuselage
  const fuselageGeo = useMemo(() => {
    const points = [];
    for (let i = 0; i <= 40; i++) {
      const x = i / 40; // 0 (tail) to 1 (nose)
      let r = 0.12; 
      if (x < 0.25) {
        // Tail taper
        const t = x / 0.25;
        r = 0.12 * (0.15 + 0.85 * t); // from 0.018 to 0.12
      } else if (x > 0.8) {
        // Nose curve
        const t = (x - 0.8) / 0.2;
        r = 0.12 * Math.cos(t * Math.PI / 2); // from 0.12 down to 0
      }
      // Y axis is length. (0.5 - x) * 1.8 goes from 0.9 (tail) to -0.9 (nose).
      points.push(new THREE.Vector2(r, (0.5 - x) * 1.8)); 
    }
    const geo = new THREE.LatheGeometry(points, 32);
    // Rotate so length goes along Z
    geo.rotateX(Math.PI / 2); 
    return geo;
  }, []);

  // 2. Swept-back Wings
  const wingGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.25); // Root leading edge
    shape.lineTo(1.4, 0.3); // Tip leading edge
    shape.lineTo(1.4, 0.55); // Tip trailing edge
    shape.lineTo(0, 0.3); // Root trailing edge
    shape.lineTo(0, -0.25);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.025, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.015, bevelThickness: 0.01
    });
    // Flatten onto XZ plane
    geo.rotateX(Math.PI / 2); 
    return geo;
  }, []);

  // 3. Vertical Stabilizer (Tail)
  const tailGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.65, 0); // root leading
    shape.lineTo(0.9, 0.35); // tip leading
    shape.lineTo(1.05, 0.35); // tip trailing
    shape.lineTo(0.95, 0); // root trailing
    shape.lineTo(0.65, 0);

    const geo = new THREE.ExtrudeGeometry(shape, { 
      depth: 0.02, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.005, bevelThickness: 0.005 
    });
    // Rotate to YZ plane
    geo.rotateY(Math.PI / 2);
    return geo;
  }, []);

  // 4. Jet Engines
  const engineGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.065, 0.05, 0.32, 24);
    geo.rotateX(Math.PI / 2); // Length along Z
    return geo;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    
    const t = Math.max(0, Math.min(progressRef.current, 0.999));
    flightPath.getPointAt(t, point.current);
    groupRef.current.position.copy(point.current);
    flightPath.getTangentAt(t, tangent.current);
    
    const bankAmount = Math.sin(t * Math.PI * 4) * 0.35;
    
    const matrix = new THREE.Matrix4();
    up.current.set(0, 1, 0).applyAxisAngle(tangent.current, bankAmount);
    matrix.lookAt(point.current, point.current.clone().add(tangent.current), up.current);
    groupRef.current.quaternion.setFromRotationMatrix(matrix);
    
    const scale = 0.6 + (1 - t) * 0.5;
    groupRef.current.scale.setScalar(scale);
    groupRef.current.visible = t < 0.99;
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh geometry={fuselageGeo}>
        <meshPhysicalMaterial color={MAGENTA} clearcoat={1} clearcoatRoughness={0.05} roughness={0.15} metalness={0.2} />
      </mesh>

      {/* Wings */}
      <mesh geometry={wingGeo} position={[0, -0.05, 0]}>
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.15} />
      </mesh>
      <mesh geometry={wingGeo} position={[0, -0.05, 0]} scale={[-1, 1, 1]}>
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.15} />
      </mesh>

      {/* Vertical Tail */}
      <mesh geometry={tailGeo} position={[0, 0.08, -0.05]}>
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.1} />
      </mesh>

      {/* Horizontal Stabilizers (reusing wing geometry, scaled and shifted) */}
      <mesh geometry={wingGeo} position={[0, 0.02, 0.8]} scale={[0.3, 0.3, 0.3]}>
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.1} />
      </mesh>
      <mesh geometry={wingGeo} position={[0, 0.02, 0.8]} scale={[-0.3, 0.3, 0.3]}>
        <meshPhysicalMaterial color="#ffffff" clearcoat={1} roughness={0.1} />
      </mesh>

      {/* Nav Lights */}
      <pointLight position={[-1.4, -0.05, 0.2]} color="#ff0000" intensity={1} distance={2} />
      <pointLight position={[1.4, -0.05, 0.2]} color="#00ff00" intensity={1} distance={2} />
    </group>
  );
}
