import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const FLIGHT_SECONDS = 7.2;
const HOLD_SECONDS = 1.3;
const CYCLE_SECONDS = FLIGHT_SECONDS + HOLD_SECONDS;

function BrandPlane() {
  return (
    <group>
      <mesh scale={[0.18, 0.18, 0.86]}>
        <sphereGeometry args={[1, 28, 28]} />
        <meshPhysicalMaterial
          color="#d62974"
          roughness={0.19}
          metalness={0.04}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>

      <mesh position={[0, 0, -0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.42, 28]} />
        <meshPhysicalMaterial color="#d62974" roughness={0.18} clearcoat={1} />
      </mesh>

      <mesh position={[0, -0.015, -0.02]} rotation={[0, 0, -0.035]}>
        <boxGeometry args={[1.55, 0.055, 0.42]} />
        <meshPhysicalMaterial color="#f7c3da" roughness={0.2} clearcoat={1} />
      </mesh>

      <mesh position={[0, 0.005, 0.58]} rotation={[0, 0, 0.025]}>
        <boxGeometry args={[0.72, 0.045, 0.24]} />
        <meshStandardMaterial color="#cf1f68" roughness={0.24} />
      </mesh>

      <mesh position={[0, 0.19, 0.68]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[0.045, 0.38, 0.24]} />
        <meshStandardMaterial color="#cf1f68" roughness={0.24} />
      </mesh>

      <pointLight position={[0, 0, 0.25]} intensity={4.5} distance={2.7} color="#ef7caf" />
    </group>
  );
}

export default function FlightScene({ reducedMotion }: { reducedMotion: boolean }) {
  const plane = useRef<THREE.Group>(null);
  const bank = useMemo(() => new THREE.Quaternion(), []);
  const orientation = useMemo(() => new THREE.Quaternion(), []);
  const forward = useMemo(() => new THREE.Vector3(0, 0, -1), []);

  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-5.8, -2.35, 5.7),
          new THREE.Vector3(-4.15, -1.35, 4.55),
          new THREE.Vector3(-2.65, -0.25, 3.05),
          new THREE.Vector3(-1.15, 0.5, 1.5),
          new THREE.Vector3(0.2, 0.2, -0.2),
          new THREE.Vector3(0.35, 0.05, -3.7),
        ],
        false,
        "catmullrom",
        0.45,
      ),
    [],
  );

  const trailGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(180));
    geometry.setDrawRange(0, 1);
    return geometry;
  }, [curve]);

  const trailMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#d62974",
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    [],
  );

  const trail = useMemo(() => new THREE.Line(trailGeometry, trailMaterial), [trailGeometry, trailMaterial]);

  useEffect(
    () => () => {
      trailGeometry.dispose();
      trailMaterial.dispose();
    },
    [trailGeometry, trailMaterial],
  );

  useFrame((state, delta) => {
    if (!plane.current) return;

    const cycle = reducedMotion ? 0.58 : (state.clock.elapsedTime % CYCLE_SECONDS) / CYCLE_SECONDS;
    const rawTravel = reducedMotion ? 0.58 : Math.min(cycle / (FLIGHT_SECONDS / CYCLE_SECONDS), 1);
    const travel = THREE.MathUtils.smoothstep(rawTravel, 0, 1);
    const point = curve.getPointAt(Math.min(travel, 0.999));
    const tangent = curve.getTangentAt(Math.min(travel, 0.998)).normalize();

    plane.current.position.copy(point);
    orientation.setFromUnitVectors(forward, tangent);
    bank.setFromAxisAngle(tangent, reducedMotion ? 0.02 : Math.sin(travel * Math.PI * 1.35) * 0.075);
    orientation.multiply(bank);
    plane.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 10));

    const nearCamera = THREE.MathUtils.clamp((point.z + 4) / 10, 0, 1);
    plane.current.scale.setScalar(0.72 + nearCamera * 0.16);

    const visible = reducedMotion || cycle < 0.94;
    plane.current.visible = visible;
    trail.visible = visible;
    trail.geometry.setDrawRange(0, Math.max(2, Math.floor(travel * 181)));
    trailMaterial.opacity = reducedMotion ? 0.12 : 0.1 + Math.sin(Math.min(travel, 1) * Math.PI) * 0.16;
  });

  return (
    <group>
      <primitive object={trail} />
      <group ref={plane}>
        <BrandPlane />
      </group>
    </group>
  );
}
