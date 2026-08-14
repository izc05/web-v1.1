import { Canvas } from "@react-three/fiber";
import { Environment, Preload } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";

import Atmosphere from "./components/Atmosphere";
import PremiumGlobe from "./components/PremiumGlobe";
import Airplane from "./components/Airplane";

const INTRO_DURATION = 8; // seconds

export default function App() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [entered, setEntered] = useState(false);

  // Animation values
  const planeProgress = useRef(0);
  const cameraZ = useRef(15);
  const globeScale = useRef(0);
  const uiOpacity = useRef(0);

  // Refs for HTML elements
  const lockupRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      planeProgress.current = 1;
      cameraZ.current = 5;
      globeScale.current = 1;
      uiOpacity.current = 1;
      setIntroComplete(true);
      if (lockupRef.current) gsap.set(lockupRef.current, { opacity: 1, y: 0 });
      if (actionsRef.current) gsap.set(actionsRef.current, { opacity: 1 });
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => setIntroComplete(true)
    });

    // Animate Airplane Path (0 to 1)
    tl.to(planeProgress, {
      current: 1,
      duration: INTRO_DURATION,
      ease: "power2.inOut"
    }, 0);

    // Camera moves forward through clouds
    tl.to(cameraZ, {
      current: 5,
      duration: INTRO_DURATION * 0.7,
      ease: "power1.inOut"
    }, 0);

    // Globe scales up smoothly as clouds clear
    tl.to(globeScale, {
      current: 1,
      duration: 3,
      ease: "back.out(1.2)"
    }, INTRO_DURATION * 0.4);

    // Reveal UI lockup
    if (lockupRef.current) {
      tl.to(lockupRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.5,
        ease: "power2.out"
      }, INTRO_DURATION * 0.75);
    }

    // Reveal Actions
    if (actionsRef.current) {
      tl.to(actionsRef.current, {
        opacity: 1,
        duration: 1,
        ease: "power2.out"
      }, INTRO_DURATION * 0.85);
    }

    return () => { tl.kill(); };
  }, [reducedMotion]);

  const handleSkip = () => {
    gsap.killTweensOf([planeProgress, cameraZ, globeScale]);
    gsap.to(planeProgress, { current: 1, duration: 0.5 });
    gsap.to(cameraZ, { current: 5, duration: 0.5 });
    gsap.to(globeScale, { current: 1, duration: 0.5 });
    
    if (lockupRef.current) gsap.to(lockupRef.current, { opacity: 1, y: 0, duration: 0.5 });
    if (actionsRef.current) gsap.to(actionsRef.current, { opacity: 1, duration: 0.5 });
    
    setTimeout(() => setIntroComplete(true), 500);
  };

  return (
    <main className={`canvas-container ${reducedMotion ? "reduced-motion" : ""}`}>
      {/* 3D Scene */}
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 15], fov: 40 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          // A tiny useFrame to update camera manually based on our GSAP value
          gsap.ticker.add(() => {
            if (camera && cameraZ.current) {
              camera.position.z = cameraZ.current;
            }
          });
        }}
      >
        <color attach="background" args={["#fffcfd"]} />
        <fog attach="fog" args={["#fffcfd", 5, 20]} />
        
        <ambientLight intensity={1.5} color="#ffffff" />
        <directionalLight position={[5, 5, 5]} intensity={2} color="#ffffff" />
        <directionalLight position={[-5, 5, -5]} intensity={1} color="#f4a7c8" />

        <Atmosphere />
        
        <group scale={globeScale.current}>
          <PremiumGlobe introComplete={introComplete} />
        </group>

        <Airplane progressRef={planeProgress} />

        <Environment preset="studio" />
        <Preload all />
      </Canvas>

      <div className="vignette" />

      {/* HTML Overlay */}
      <div className="ui-overlay">
        <section ref={lockupRef} className="brand-lockup" aria-label="Language School Rocío Ruiz">
          <span className="brand-language">LANGUAGE</span>
          <h1 className="brand-school">School</h1>
          <div className="divider" />
          <span className="brand-rocio">ROCÍO RUIZ</span>
        </section>

        <div ref={actionsRef} className="actions-container">
          {!entered ? (
            <>
              <p className="instruction">Mueve el cursor sobre el mundo</p>
              <button 
                className="btn-enter" 
                onClick={() => setEntered(true)}
                disabled={!introComplete}
              >
                ENTRAR <span className="arrow">→</span>
              </button>
            </>
          ) : (
            <div style={{ pointerEvents: 'auto', textAlign: 'center', background: 'rgba(255,255,255,0.8)', padding: '20px', borderRadius: '10px' }}>
              <h2>HOME PLACEHOLDER</h2>
              <p>Esperando transición de la FASE 7</p>
              <button onClick={() => setEntered(false)} style={{marginTop: 10, padding: 8}}>Volver</button>
            </div>
          )}
        </div>

        {!introComplete && !reducedMotion && (
          <button className="skip-btn" onClick={handleSkip}>
            Saltar intro
          </button>
        )}
      </div>
    </main>
  );
}
