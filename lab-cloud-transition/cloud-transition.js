/**
 * ☁️ Cloud Page Transition
 * Language School · Rocío Ruiz
 *
 * Drop-in module: <script type="module" src="cloud-transition.js"></script>
 * Intercepts <a> clicks and [data-cloud-link] buttons,
 * plays a volumetric pink cloud flythrough, then navigates.
 */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

// ─── Config ───────────────────────────────────────────────────────────────────
const DURATION    = 1600; // ms total
const FLY_START   = 0.15; // fraction when camera starts flying in
const FADE_START  = 0.80; // fraction when white fade starts
const MAGENTA     = new THREE.Color("#d62974");
const MAGENTA_MID = new THREE.Color("#f4a7c8");
const WHITE       = new THREE.Color("#fffcfd");
const BG          = new THREE.Color("#fffcfd");

// ─── Cloud particle shader ────────────────────────────────────────────────────
const cloudVert = /* glsl */`
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  uniform float uTime;
  uniform float uProgress;

  void main() {
    vAlpha = aAlpha;
    vec3 pos = position;
    // Drift forward
    pos.z += uProgress * 18.0;
    // Gentle swirl
    float angle = uTime * 0.15 + pos.x * 0.3;
    pos.x += sin(angle) * 0.4;
    pos.y += cos(angle * 0.7) * 0.2;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const cloudFrag = /* glsl */`
  varying float vAlpha;
  uniform vec3  uColor;
  uniform float uFade;

  void main() {
    // Soft circle
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = 1.0 - smoothstep(0.2, 0.5, d);
    float alpha = soft * vAlpha * (1.0 - uFade);
    gl_FragColor = vec4(mix(uColor, vec3(1.0), uFade), alpha);
  }
`;

// ─── Scene builder ────────────────────────────────────────────────────────────
function buildScene() {
  const scene    = new THREE.Scene();
  scene.background = BG.clone();
  scene.fog      = new THREE.Fog(BG, 1, 22);

  // ── Cloud layers ──────────────────────────────────────────────────────────
  const COUNT     = 1200;
  const positions = new Float32Array(COUNT * 3);
  const sizes     = new Float32Array(COUNT);
  const alphas    = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const spread = 14;
    const depth  = 20; // z spread behind camera
    positions[i * 3 + 0] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6;
    positions[i * 3 + 2] = -(Math.random() * depth);

    // Larger particles toward center
    const distFromCenter = Math.sqrt(
      positions[i * 3] ** 2 + positions[i * 3 + 1] ** 2
    );
    sizes[i]  = THREE.MathUtils.randFloat(20, 90) * Math.max(0.1, 1 - distFromCenter / 14);
    alphas[i] = THREE.MathUtils.randFloat(0.3, 0.85);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSize",    new THREE.BufferAttribute(sizes,     1));
  geo.setAttribute("aAlpha",   new THREE.BufferAttribute(alphas,    1));

  const mat = new THREE.ShaderMaterial({
    vertexShader:   cloudVert,
    fragmentShader: cloudFrag,
    uniforms: {
      uTime:     { value: 0 },
      uProgress: { value: 0 },
      uColor:    { value: MAGENTA_MID.clone() },
      uFade:     { value: 0 },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // ── Lightning flash light ─────────────────────────────────────────────────
  const flash = new THREE.PointLight(MAGENTA, 0, 30);
  flash.position.set(0, 2, -8);
  scene.add(flash);

  // ── Ambient ───────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(WHITE, 0.5));

  return { scene, mat, flash };
}

// ─── Overlay canvas ───────────────────────────────────────────────────────────
function createOverlay() {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position:      "fixed",
    inset:         "0",
    zIndex:        "99999",
    opacity:       "0",
    transition:    "opacity 0.12s ease",
    pointerEvents: "none",
    width:         "100%",
    height:        "100%",
  });
  document.body.appendChild(canvas);
  return canvas;
}

// ─── Main transition runner ───────────────────────────────────────────────────
function runTransition(href) {
  const canvas = createOverlay();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 0, 6);

  const { scene, mat, flash } = buildScene();

  // Show canvas
  requestAnimationFrame(() => { canvas.style.opacity = "1"; });

  const startTime = performance.now();
  let rafId;
  let nextFlash = 0.3;

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / DURATION, 1);

    mat.uniforms.uTime.value     = elapsed * 0.001;
    mat.uniforms.uProgress.value = progress;

    // Color shifts pink → white as we exit
    const col = MAGENTA_MID.clone().lerp(WHITE, Math.max(0, (progress - 0.6) / 0.4));
    mat.uniforms.uColor.value.copy(col);

    // Fade overlay to white
    const fade = Math.max(0, (progress - FADE_START) / (1 - FADE_START));
    mat.uniforms.uFade.value = fade;
    scene.background.lerpColors(BG, WHITE, fade);

    // Camera flies forward into clouds
    const flyProgress = Math.max(0, (progress - FLY_START) / (1 - FLY_START));
    camera.position.z = 6 - flyProgress * 9;
    camera.position.y = Math.sin(flyProgress * Math.PI) * 0.5;

    // Lightning flash
    if (progress > nextFlash && progress < 0.75) {
      flash.intensity = THREE.MathUtils.randFloat(8, 18);
      flash.color.copy(Math.random() > 0.5 ? MAGENTA : WHITE);
      nextFlash = progress + THREE.MathUtils.randFloat(0.08, 0.2);
      setTimeout(() => { flash.intensity = 0; }, 60);
    }

    renderer.render(scene, camera);

    // Navigate when done
    if (progress >= 1) {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      window.location.href = href;
    }
  }

  requestAnimationFrame(tick);
}

// ─── Click interceptor ────────────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  const anchor = e.target.closest("a[href], [data-cloud-link]");
  if (!anchor) return;

  const href = anchor.getAttribute("href") || anchor.dataset.cloudLink;
  if (!href) return;

  // Skip: external, mailto, tel, hash-only anchors
  const isExternal = /^https?:\/\//.test(href) && !href.includes("localhost") && !href.includes("127.0.0.1");
  if (isExternal) return;
  if (/^(mailto:|tel:|#)/.test(href)) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (anchor.target === "_blank") return;

  e.preventDefault();
  runTransition(href);
}, { capture: true });

console.log("☁️ Cloud Transition ready — Language School Rocío Ruiz");
