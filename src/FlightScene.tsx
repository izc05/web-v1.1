import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const INTRO_SECONDS = 7.6;
const APPROACH_END = 0.47;
const ORBIT_END = 0.84;
const GLOBE_CENTER = new THREE.Vector3(0.35, 0.08, -1.45);

function makeShapeGeometry(points: Array<[number, number]>, rotation: "horizontal" | "vertical") {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 2);
  if (rotation === "horizontal") geometry.rotateX(Math.PI / 2);
  if (rotation === "vertical") geometry.rotateY(Math.PI / 2);
  return geometry;
}

function BrandPlane() {
  const fuselage = useMemo(() => {
    const geometry = new THREE.CapsuleGeometry(0.115, 1.42, 8, 20);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }, []);

  const wings = useMemo(
    () =>
      makeShapeGeometry(
        [
          [-0.08, -0.22],
          [-1.26, 0.12],
          [-0.78, 0.42],
          [-0.12, 0.2],
          [0.12, 0.2],
          [0.78, 0.42],
          [1.26, 0.12],
          [0.08, -0.22],
        ],
        "horizontal",
      ),
    [],
  );

  const tail = useMemo(
    () =>
      makeShapeGeometry(
        [
          [-0.05, -0.08],
          [-0.52, 0.08],
          [-0.36, 0.24],
          [-0.06, 0.14],
          [0.06, 0.14],
          [0.36, 0.24],
          [0.52, 0.08],
          [0.05, -0.08],
        ],
        "horizontal",
      ),
    [],
  );

  const fin = useMemo(
    () =>
      makeShapeGeometry(
        [
          [-0.03, 0],
          [0.1, 0.06],
          [0.42, 0.34],
          [0.38, 0.06],
        ],
        "vertical",
      ),
    [],
  );

  useEffect(
    () => () => {
      fuselage.dispose();
      wings.dispose();
      tail.dispose();
      fin.dispose();
    },
    [fin, fuselage, tail, wings],
  );

  return (
    <group scale={0.9}>
      <mesh geometry={fuselage} position={[0, 0.015, -0.05]}>
        <meshPhysicalMaterial
          color="#d62974"
          roughness={0.16}
          metalness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>

      <mesh position={[0, 0.015, -0.88]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.115, 0.34, 28]} />
        <meshPhysicalMaterial color="#cf1f69" roughness={0.14} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>

      <mesh geometry={wings} position={[0, -0.015, -0.08]}>
        <meshPhysicalMaterial
          color="#f6bfd6"
          roughness={0.16}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh geometry={tail} position={[0, 0.005, 0.62]}>
        <meshPhysicalMaterial
          color="#e76ca3"
          roughness={0.17}
          clearcoat={1}
          clearcoatRoughness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh geometry={fin} position={[0, 0.03, 0.56]}>
        <meshPhysicalMaterial
          color="#c91f66"
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.07}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.095, -0.43]} scale={[0.105, 0.055, 0.26]}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshPhysicalMaterial
          color="#7d3c59"
          roughness={0.08}
          metalness={0.03}
          transmission={0.22}
          transparent
          opacity={0.82}
          clearcoat={1}
        />
      </mesh>

      <mesh position={[0, -0.005, -0.3]} scale={[0.22, 0.018, 0.42]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color="#fff6fa" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      <pointLight position={[0, 0.05, -0.55]} intensity={5.3} distance={2.6} color="#ff8cbc" />
    </group>
  );
}

export default function FlightScene({ reducedMotion, settled }: { reducedMotion: boolean; settled: boolean }) {
  const plane = useRef<THREE.Group>(null);
  const orientation = useMemo(() => new THREE.Quaternion(), []);
  const bank = useMemo(() => new THREE.Quaternion(), []);
  const forward = useMemo(() => new THREE.Vector3(0, 0, -1), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const nextPoint = useMemo(() => new THREE.Vector3(), []);

  const approach = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-5.8, -2.35, 5.7),
          new THREE.Vector3(-4.1, -1.4, 4.5),
          new THREE.Vector3(-2.6, -0.35, 2.9),
          new THREE.Vector3(-1.25, 0.45, 1.15),
          new THREE.Vector3(0.1, 0.55, -0.25),
          new THREE.Vector3(2.0, 0.48, -1.15),
        ],
        false,
        "catmullrom",
        0.42,
      ),
    [],
  );

  const pathPoints = useMemo(() => {
    const points = approach.getPoints(100);
    for (let i = 0; i <= 120; i += 1) {
      const t = i / 120;
      const angle = 0.15 + t * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          GLOBE_CENTER.x + Math.cos(angle) * 2.02,
          GLOBE_CENTER.y + 0.34 + Math.sin(angle * 1.2) * 0.38,
          GLOBE_CENTER.z + Math.sin(angle) * 1.5,
        ),
      );
    }
    points.push(new THREE.Vector3(1.95, 1.35, -0.92));
    points.push(new THREE.Vector3(1.72, 1.52, -0.72));
    return points;
  }, [approach]);

  const trailGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    geometry.setDrawRange(0, 1);
    return geometry;
  }, [pathPoints]);

  const trailMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: "#d62974",
        transparent: true,
        opacity: 0.16,
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

    const cycle = reducedMotion || settled ? 0.985 : Math.min(state.clock.elapsedTime / INTRO_SECONDS, 0.985);
    let progress = 0;
    let bankAmount = 0;

    if (cycle <= APPROACH_END) {
      const local = THREE.MathUtils.smoothstep(cycle / APPROACH_END, 0, 1);
      point.copy(approach.getPointAt(Math.min(local, 0.998)));
      nextPoint.copy(approach.getPointAt(Math.min(local + 0.008, 0.999)));
      progress = local * 0.42;
      bankAmount = Math.sin(local * Math.PI) * 0.08;
    } else if (cycle <= ORBIT_END) {
      const local = THREE.MathUtils.smoothstep((cycle - APPROACH_END) / (ORBIT_END - APPROACH_END), 0, 1);
      const angle = 0.15 + local * Math.PI * 2;
      const nextAngle = angle + 0.025;
      point.set(
        GLOBE_CENTER.x + Math.cos(angle) * 2.02,
        GLOBE_CENTER.y + 0.34 + Math.sin(angle * 1.2) * 0.38,
        GLOBE_CENTER.z + Math.sin(angle) * 1.5,
      );
      nextPoint.set(
        GLOBE_CENTER.x + Math.cos(nextAngle) * 2.02,
        GLOBE_CENTER.y + 0.34 + Math.sin(nextAngle * 1.2) * 0.38,
        GLOBE_CENTER.z + Math.sin(nextAngle) * 1.5,
      );
      progress = 0.42 + local * 0.5;
      bankAmount = -0.14;
    } else {
      const local = THREE.MathUtils.smoothstep((cycle - ORBIT_END) / (1 - ORBIT_END), 0, 1);
      point.set(1.95 - local * 0.23, 1.35 + local * 0.17, -0.92 + local * 0.2);
      nextPoint.set(1.72, 1.53, -0.7);
      progress = 0.92 + local * 0.08;
      bankAmount = -0.025;
    }

    tangent.copy(nextPoint).sub(point).normalize();
    orientation.setFromUnitVectors(forward, tangent);
    bank.setFromAxisAngle(tangent, reducedMotion ? 0 : bankAmount);
    orientation.multiply(bank);

    plane.current.position.copy(point);
    plane.current.quaternion.slerp(orientation, 1 - Math.exp(-delta * 11));

    const nearCamera = THREE.MathUtils.clamp((point.z + 3.5) / 9, 0, 1);
    plane.current.scale.setScalar(0.69 + nearCamera * 0.19);
    plane.current.visible = true;

    trail.visible = !settled && !reducedMotion;
    trail.geometry.setDrawRange(0, Math.max(2, Math.floor(progress * pathPoints.length)));
    trailMaterial.opacity = 0.055 + Math.sin(Math.min(progress, 1) * Math.PI) * 0.14;
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
