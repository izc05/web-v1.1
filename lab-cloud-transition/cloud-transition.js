/**
 * ☁️ Cloud Page Transition — PREMIUM EDITION
 * Language School · Rocío Ruiz
 *
 * Volumetric clouds with procedural Perlin noise shader.
 * Multiple billboard layers, cinematic camera shake, lightning flash.
 *
 * Usage: <script type="module" src="cloud-transition.js"></script>
 */

import * as THREE from "three";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C_DEEP    = new THREE.Color("#c2185b"); // deep magenta core
const C_MID     = new THREE.Color("#e91e8c"); // vivid pink
const C_SOFT    = new THREE.Color("#f8bbd0"); // petal pink
const C_HAZE    = new THREE.Color("#fce4ec"); // almost white blush
const C_WHITE   = new THREE.Color("#ffffff");
const C_BG      = new THREE.Color("#fffcfd");

// ─── Timing ───────────────────────────────────────────────────────────────────
const DURATION  = 2800; // ms — 1 extra second, slower & smoother

// ─── Shaders ─────────────────────────────────────────────────────────────────

/** Simplex-based cloud billboard vertex */
const cloudVert = /* glsl */`
  varying vec2  vUv;
  varying float vDepth;
  varying float vAlpha;
  attribute float aDepth;
  attribute float aAlpha;
  attribute float aRotSpeed;
  attribute float aScale;

  uniform float uTime;
  uniform float uProgress;

  void main() {
    vUv = uv;
    vAlpha = aAlpha;
    vDepth = aDepth;

    vec3 pos = position;
    // Each depth layer moves at different speed — gives parallax feel
    float zShift = uProgress * 22.0 * (0.3 + aDepth * 0.7);
    pos.z += zShift;

    // Very gentle, independent drift per cloud
    float drift = uTime * 0.04 * (0.6 + aDepth * 0.4);
    pos.x += sin(drift + aDepth * 6.28) * 0.25;
    pos.y += cos(drift * 0.8 + aDepth * 2.1) * 0.12;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const cloudFrag = /* glsl */`
  varying vec2  vUv;
  varying float vDepth;
  varying float vAlpha;

  uniform float uTime;
  uniform float uProgress;
  uniform float uFade;
  uniform vec3  uColorA;
  uniform vec3  uColorB;

  // ── Hash & value noise ────────────────────────────────────────────────────
  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }

  // Domain-warped FBM for bumpy cloud texture
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  // ── Cumulus silhouette: 5 overlapping ellipses (top lobes) ──────────────
  float cloudShape(vec2 uv) {
    // Base body — wide, flat ellipse
    float body = length(uv * vec2(1.0, 1.6)) - 0.28;

    // Top lobe — center bump
    float lobe1 = length((uv - vec2( 0.00,  0.14)) * vec2(1.1, 1.0)) - 0.18;
    // Left lobe
    float lobe2 = length((uv - vec2(-0.15,  0.10)) * vec2(1.2, 1.0)) - 0.14;
    // Right lobe
    float lobe3 = length((uv - vec2( 0.15,  0.09)) * vec2(1.2, 1.0)) - 0.13;
    // Far left lobe
    float lobe4 = length((uv - vec2(-0.26,  0.03)) * vec2(1.3, 1.1)) - 0.10;
    // Far right lobe
    float lobe5 = length((uv - vec2( 0.26,  0.02)) * vec2(1.3, 1.1)) - 0.10;

    // Union (smooth min) of all parts
    float d = min(body, min(lobe1, min(lobe2, min(lobe3, min(lobe4, lobe5)))));
    return d; // negative = inside cloud
  }

  void main() {
    vec2 uv = vUv - 0.5; // center

    // Animated domain warp — slow, gentle
    float t = uTime * 0.04 + vDepth * 5.1;
    vec2 warp = vec2(
      fbm(uv * 1.8 + vec2(t,       t * 0.5)),
      fbm(uv * 1.8 + vec2(t * 0.7, t + 3.7))
    ) * 0.14; // small warp keeps edges recognisable

    float sdf = cloudShape(uv + warp);

    // Hard exterior discard
    if (sdf > 0.04) discard;

    // Edge sharpness — tight smoothstep gives crisp defined border
    float edgeFade = 1.0 - smoothstep(-0.04, 0.03, sdf);

    // Interior cloud texture — bumpy highlights toward top
    float tex = fbm(uv * 3.5 + vec2(t * 0.5, -t * 0.3));
    tex = pow(tex, 0.9);

    // Soft shadow at bottom, bright at top
    float shading = smoothstep(-0.3, 0.2, uv.y); // 0=dark bottom, 1=bright top

    float alpha = edgeFade * vAlpha * (1.0 - uFade * 1.3);
    alpha = clamp(alpha, 0.0, 1.0);

    // Color: deep pink in body, bright petal at tops and highlights
    vec3 col = mix(uColorA, uColorB, tex * 0.6 + shading * 0.5);
    col = mix(col, vec3(1.0), uFade * 0.9);

    gl_FragColor = vec4(col, alpha);
  }
`;

/** Full-screen quad for final white flash */
const flashVert = /* glsl */`
  void main() { gl_Position = vec4(position, 1.0); }
`;
const flashFrag = /* glsl */`
  uniform float uOpacity;
  uniform vec3  uColor;
  void main() { gl_FragColor = vec4(uColor, uOpacity); }
`;

// ─── Build scene ──────────────────────────────────────────────────────────────
function buildScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = C_BG.clone();
  scene.fog = new THREE.FogExp2(C_HAZE, 0.055);

  // ── Cloud billboards ───────────────────────────────────────────────────────
  const COUNT   = 80; // billboarded planes
  const LAYERS  = 5;

  const cloudMat = new THREE.ShaderMaterial({
    vertexShader:   cloudVert,
    fragmentShader: cloudFrag,
    uniforms: {
      uTime:    { value: 0 },
      uProgress:{ value: 0 },
      uFade:    { value: 0 },
      uColorA:  { value: C_MID.clone() },
      uColorB:  { value: C_HAZE.clone() },
    },
    transparent:  true,
    depthWrite:   false,
    blending:     THREE.NormalBlending,
    side:         THREE.DoubleSide,
  });

  const baseGeo = new THREE.PlaneGeometry(1, 1, 1, 1);

  for (let i = 0; i < COUNT; i++) {
    const mat  = cloudMat.clone();
    const mesh = new THREE.Mesh(baseGeo, mat);

    const layer = i % LAYERS;
    const depth  = layer / (LAYERS - 1); // 0 (far) → 1 (near)

    // Position: spread across a tunnel
    const angle  = (i / COUNT) * Math.PI * 2 * 3.7;
    const radius = THREE.MathUtils.randFloat(1.5, 6.5) * (1 - depth * 0.3);
    const zPos   = -depth * 22 - Math.random() * 6;

    mesh.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.7,
      zPos
    );

    // Scale varies by layer (nearer = bigger)
    const scale = THREE.MathUtils.randFloat(3, 8) * (0.5 + depth * 0.8);
    mesh.scale.set(scale, scale * THREE.MathUtils.randFloat(0.7, 1.1), 1);

    // Random rotation
    mesh.rotation.z = Math.random() * Math.PI * 2;

    // Per-instance uniforms via vertex attributes (shared across 4 verts)
    const depths = new Float32Array(4).fill(depth);
    const alphas = new Float32Array(4).fill(THREE.MathUtils.randFloat(0.55, 0.9));
    const geo    = baseGeo.clone();
    geo.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute("aRotSpeed", new THREE.BufferAttribute(new Float32Array(4).fill(0), 1));
    geo.setAttribute("aScale",    new THREE.BufferAttribute(new Float32Array(4).fill(scale), 1));
    mesh.geometry = geo;

    // Store depth for sorting
    mesh.userData.depth = depth;
    mesh.userData.mat   = mat;

    scene.add(mesh);
  }

  // ── Center bright core (glowing heart of the storm) ───────────────────────
  const coreMat = new THREE.ShaderMaterial({
    vertexShader:   cloudVert,
    fragmentShader: cloudFrag,
    uniforms: {
      uTime:     { value: 0 },
      uProgress: { value: 0 },
      uFade:     { value: 0 },
      uColorA:   { value: C_DEEP.clone() },
      uColorB:   { value: C_SOFT.clone() },
    },
    transparent: true,
    depthWrite:  false,
    blending:    THREE.AdditiveBlending,
    side:        THREE.DoubleSide,
  });
  for (let i = 0; i < 12; i++) {
    const mesh = new THREE.Mesh(baseGeo.clone(), coreMat.clone());
    mesh.position.set(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 1.5,
      -2 - Math.random() * 8
    );
    const s = THREE.MathUtils.randFloat(1.5, 4);
    mesh.scale.set(s, s, 1);
    mesh.rotation.z = Math.random() * Math.PI * 2;
    const depths = new Float32Array(4).fill(0.8);
    const alphas = new Float32Array(4).fill(THREE.MathUtils.randFloat(0.3, 0.6));
    mesh.geometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
    mesh.geometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    mesh.geometry.setAttribute("aRotSpeed", new THREE.BufferAttribute(new Float32Array(4), 1));
    mesh.geometry.setAttribute("aScale",    new THREE.BufferAttribute(new Float32Array(4).fill(s), 1));
    mesh.userData.mat = coreMat.clone();
    scene.add(mesh);
  }

  // ── Lightning point light ──────────────────────────────────────────────────
  const flashLight = new THREE.PointLight(C_MID, 0, 40);
  flashLight.position.set(0, 3, -6);
  scene.add(flashLight);
  const flashLight2 = new THREE.PointLight(C_SOFT, 0, 25);
  flashLight2.position.set(-4, -2, -10);
  scene.add(flashLight2);

  // Ambient warm glow
  scene.add(new THREE.AmbientLight(C_HAZE, 1.2));
  const dir = new THREE.DirectionalLight(C_SOFT, 1.5);
  dir.position.set(5, 5, 5);
  scene.add(dir);

  // ── Full-screen flash quad ─────────────────────────────────────────────────
  const fsGeo = new THREE.PlaneGeometry(2, 2);
  const fsMat = new THREE.ShaderMaterial({
    vertexShader:   flashVert,
    fragmentShader: flashFrag,
    uniforms: {
      uOpacity: { value: 0 },
      uColor:   { value: C_WHITE.clone() },
    },
    transparent: true,
    depthTest:   false,
    depthWrite:  false,
  });
  const fsQuad = new THREE.Mesh(fsGeo, fsMat);

  const fsScene  = new THREE.Scene();
  const fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  fsScene.add(fsQuad);

  return { scene, cloudMat, coreMat, flashLight, flashLight2, fsMat, fsQuad, fsScene, fsCamera };
}

// ─── Overlay canvas ───────────────────────────────────────────────────────────
function createOverlay() {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position:      "fixed",
    inset:         "0",
    zIndex:        "99999",
    opacity:       "0",
    transition:    "opacity 0.1s ease",
    pointerEvents: "none",
    width:         "100vw",
    height:        "100vh",
    display:       "block",
  });
  document.body.appendChild(canvas);
  return canvas;
}

// ─── Run the transition ───────────────────────────────────────────────────────
function runTransition(hrefOrCallback) {
  const canvas = createOverlay();
  const W = window.innerWidth, H = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.sortObjects = true;

  const camera = new THREE.PerspectiveCamera(72, W / H, 0.01, 60);
  camera.position.set(0, 0, 8);

  const { scene, cloudMat, coreMat, flashLight, flashLight2, fsMat, fsQuad, fsScene, fsCamera } =
    buildScene(renderer);

  // Fade in
  requestAnimationFrame(() => { canvas.style.opacity = "1"; });

  const startTime   = performance.now();
  let rafId;
  let nextFlash     = 0.18;
  let shakeDecay    = 0;
  const shake       = new THREE.Vector3();

  function tick(now) {
    rafId = requestAnimationFrame(tick);

    const elapsed  = (now - startTime) * 0.001;
    const progress = Math.min(elapsed / (DURATION * 0.001), 1);
    const t        = elapsed;

    // ── Update all cloud meshes ──────────────────────────────────────────────
    scene.traverse((obj) => {
      if (obj.isMesh && obj.userData.mat) {
        const m = obj.material;
        if (m.uniforms) {
          m.uniforms.uTime.value     = t;
          m.uniforms.uProgress.value = progress;
          m.uniforms.uFade.value     = Math.max(0, (progress - 0.78) / 0.22);
        }
        // Billboard: face camera
        obj.quaternion.copy(camera.quaternion);
      }
    });

    // ── Camera: slow, dreamy glide ──────────────────────────────────────────
    const flyP = Math.min(progress / 0.9, 1);
    // Gentle ease-in-out — no hard acceleration
    const ease = flyP < 0.5
      ? 2 * flyP * flyP
      : 1 - Math.pow(-2 * flyP + 2, 2) / 2; // softer ease-in-out-quad

    camera.position.z = 8 - ease * 10.0;   // less aggressive dive
    camera.position.y = Math.sin(ease * Math.PI) * 0.4; // gentler vertical drift

    // Very subtle spiral — barely perceptible
    const spiral = ease * Math.PI * 0.15;
    camera.position.x = Math.sin(spiral) * ease * 0.2;
    camera.rotation.z = Math.sin(ease * Math.PI) * 0.015; // minimal tilt

    // ── Camera shake on lightning ────────────────────────────────────────────
    if (shakeDecay > 0) {
      shakeDecay -= 0.03; // slower shake decay = smoother
      shake.set(
        (Math.random() - 0.5) * 0.025 * shakeDecay, // much gentler shake
        (Math.random() - 0.5) * 0.018 * shakeDecay,
        0
      );
      camera.position.add(shake);
    }

    // ── Colour shift: deep magenta → petal pink as we exit ──────────────────
    const exitP = Math.max(0, (progress - 0.55) / 0.45);
    const curA  = C_MID.clone().lerp(C_HAZE,  exitP);
    const curB  = C_SOFT.clone().lerp(C_WHITE, exitP);
    scene.traverse((obj) => {
      if (obj.isMesh && obj.material?.uniforms?.uColorA) {
        obj.material.uniforms.uColorA.value.copy(curA);
        obj.material.uniforms.uColorB.value.copy(curB);
      }
    });

    // Fog brightens
    scene.fog.color.lerpColors(C_HAZE, C_WHITE, exitP);
    scene.background.lerpColors(C_BG, C_WHITE, Math.max(0, (progress - 0.82) / 0.18));

    // ── Lightning flash ──────────────────────────────────────────────────────
    if (progress > nextFlash && progress < 0.72) {
      const intensity = THREE.MathUtils.randFloat(5, 14); // softer light
      flashLight.intensity  = intensity;
      flashLight2.intensity = intensity * 0.4;
      flashLight.color.copy(Math.random() > 0.4 ? C_MID : C_SOFT);

      // Camera shake — very subtle
      shakeDecay = 0.5;

      // Quick full-screen flash (white/rose)
      fsMat.uniforms.uColor.value.copy(Math.random() > 0.5 ? C_WHITE : C_SOFT);
      fsMat.uniforms.uOpacity.value = THREE.MathUtils.randFloat(0.1, 0.3); // much softer flash

      // Schedule fade-off — longer decay = smoother
      const decayTime = THREE.MathUtils.randInt(120, 250);
      setTimeout(() => {
        flashLight.intensity  = 0;
        flashLight2.intensity = 0;
        fsMat.uniforms.uOpacity.value = 0;
      }, decayTime);

      nextFlash = progress + THREE.MathUtils.randFloat(0.14, 0.28); // less frequent flashes
    }

    // Final white out
    const finalFade = Math.max(0, (progress - 0.85) / 0.15);
    fsMat.uniforms.uColor.value.copy(C_WHITE);
    fsMat.uniforms.uOpacity.value = Math.max(fsMat.uniforms.uOpacity.value, finalFade);

    // ── Render ───────────────────────────────────────────────────────────────
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.render(fsScene, fsCamera);

    // ── Done ─────────────────────────────────────────────────────────────────
    if (progress >= 1) {
      cancelAnimationFrame(rafId);
      
      // Clean up resources to prevent WebGL memory leaks
      scene.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        }
      });
      
      // Dispose shader materials and orthographic scene assets
      cloudMat.dispose();
      coreMat.dispose();
      fsMat.dispose();
      fsQuad.geometry.dispose();
      fsQuad.material.dispose();
      
      renderer.dispose();
      canvas.remove();

      if (typeof hrefOrCallback === "function") {
        hrefOrCallback();
      } else {
        window.location.href = hrefOrCallback;
      }
    }
  }

  requestAnimationFrame(tick);
}

// Expose globally
window.triggerCloudTransition = (callback) => {
  runTransition(callback);
};

// ─── Interceptor ─────────────────────────────────────────────────────────────
document.addEventListener("click", (e) => {
  const anchor = e.target.closest("a[href], [data-cloud-link]");
  if (!anchor) return;

  const href = anchor.getAttribute("href") || anchor.dataset.cloudLink;
  if (!href) return;

  // Skip external, mailto, tel, hash-only
  const isExternal = /^https?:\/\//.test(href) &&
    !href.includes("localhost") && !href.includes("127.0.0.1");
  if (isExternal || /^(mailto:|tel:|#)/.test(href)) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (anchor.target === "_blank") return;

  e.preventDefault();
  runTransition(href);
}, { capture: true });

console.log("☁️ Cloud Transition [PREMIUM] ready — Language School Rocío Ruiz");

