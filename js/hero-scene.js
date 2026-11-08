/* HERO-SCENE.JS: THE LIVE PARTICLE SCENE ("DATA IN MOTION")
   A field of glowing particles drifts like ink in water behind the page. The mouse pushes
   them aside, and they ease back. As you scroll through "What I Do", they settle into data
   shapes: a rising line chart, clusters of points, then a network. Chaos to clarity.

   It uses Three.js (a 3D drawing library, loaded through the "import map" in the page's <head>)
   and GSAP ScrollTrigger (already loaded for js/motion.js) to link the shapes to scrolling.
   If WebGL (the browser's 3D graphics) isn't available, animations are off, or Three.js can't
   download, nothing here runs and the page shows its normal picture instead. */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";


/* 1. SETTINGS */

// How many particles. Phones get fewer so they stay smooth and cool.
const PARTICLES_DESKTOP = 60000;
const PARTICLES_PHONE = 15000;

// Colors: the particles, the one "insight" cluster, and the background.
const PARTICLE_COLOR = "#36cfff";   // cyan
const INSIGHT_COLOR = "#ffb547";    // amber: marks "the insight" (keep it a small share)
const BACKGROUND_COLOR = "#070d18"; // matches --color-bg in css/style.css

// Share of particles that are amber "insight" particles (0.02 = 2%).
const INSIGHT_SHARE = 0.02;

// Particle size in pixels (before depth makes far ones smaller), and brightness (0-1).
const POINT_SIZE_DESKTOP = 2.2;
const POINT_SIZE_PHONE = 2.8;
const POINT_BRIGHTNESS = 0.55;

// How brightly the particles shine while they form a shape (lower = less blown-out).
const SHAPE_BRIGHTNESS = 0.6;

// Brightness of the amber "insight" particles. They're packed tightly, so they need less
// to stay clearly amber instead of glowing white.
const INSIGHT_BRIGHTNESS = 0.75;

// The liquid drift. Speed: how fast the currents change. Scale: smaller = bigger, lazier swirls.
// Strength: how far particles wander (in scene units; the screen is about 6 units tall).
const DRIFT_SPEED = 0.06;
const NOISE_SCALE = 0.22;
const NOISE_STRENGTH = 0.55;

// How much drift is left while particles hold a shape (0 = perfectly still, 1 = full drift).
const SHAPE_CALMNESS = 0.03;

// The mouse push. Radius: share of the screen height it reaches. Strength: how far it shoves
// particles (scene units). Return time: seconds for pushed particles to ease back.
const CURSOR_RADIUS = 0.16;
const CURSOR_STRENGTH = 0.9;
const RETURN_TIME = 1.5;

// The camera leans gently toward the mouse for a sense of depth (0 = off).
const PARALLAX = 0.35;

// Glow ("bloom"), desktop only. Strength 0 = none. Radius = how far the glow spreads.
const GLOW_STRENGTH = 0.55;
const GLOW_RADIUS = 0.6;
const GLOW_THRESHOLD = 0.12;

// Sharpness cap: screens with very dense pixels are drawn at most at this ratio (saves power).
// With the glow on, a slightly lower cap keeps laptops smooth (the glow is soft anyway).
const MAX_PIXEL_RATIO = 2;
const MAX_PIXEL_RATIO_GLOW = 1.5;

// Scrolling into the story: how quickly the particles follow the scroll position
// (higher = snappier, lower = more liquid), and how long each step stays pinned on wide screens.
const MORPH_FOLLOW = 3.5;
const PIN_LENGTH = "70%"; // of the screen height

// Shapes: size (share of the half-screen) and how far to the side they sit on wide screens.
const SHAPE_SIZE_WIDE = 0.36;
const SHAPE_SIDE_OFFSET = 0.46;

// Screens narrower than this (pixels) use the phone layout: shape above the text, no pinning.
const WIDE_SCREEN = 900;


/* 2. SHARED VALUES */
const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const isPhone = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

// (The scene starts at the very bottom of this file, in section 8, once everything is defined.)


/* 3. THE WHOLE SCENE */
function startScene(renderer, holder) {
  const count = isPhone ? PARTICLES_PHONE : PARTICLES_DESKTOP;
  const insightCount = Math.round(count * INSIGHT_SHARE);
  const useGlow = !isPhone && GLOW_STRENGTH > 0;
  const pixelCap = useGlow ? MAX_PIXEL_RATIO_GLOW : MAX_PIXEL_RATIO;
  let stopped = false;

  // 3a. Renderer, scene and camera
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelCap));
  renderer.setClearColor(BACKGROUND_COLOR, 1);
  holder.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // A 35° lens, 10 units back from the middle of the scene.
  const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);

  // 3b. The particles
  const geometry = buildParticles(count, insightCount);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,                // glowing dots don't hide each other
    blending: THREE.AdditiveBlending, // overlapping dots add up to brighter light
    uniforms: {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uPointSize: { value: isPhone ? POINT_SIZE_PHONE : POINT_SIZE_DESKTOP },
      uBrightness: { value: POINT_BRIGHTNESS },
      uShapeBrightness: { value: SHAPE_BRIGHTNESS },
      uInsightBrightness: { value: INSIGHT_BRIGHTNESS },
      uNoiseScale: { value: NOISE_SCALE },
      uNoiseStrength: { value: NOISE_STRENGTH },
      uDriftSpeed: { value: DRIFT_SPEED },
      uCalmness: { value: SHAPE_CALMNESS },
      uPushStrength: { value: CURSOR_STRENGTH },
      uPushField: { value: null },
      uCloudScale: { value: new THREE.Vector2(1, 1) },
      uShapeScale: { value: 1 },
      uShapeOffset1: { value: new THREE.Vector3() },
      uShapeOffset2: { value: new THREE.Vector3() },
      uShapeOffset3: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Color(PARTICLE_COLOR) },
      uInsightColor: { value: new THREE.Color(INSIGHT_COLOR) }
    }
  });
  // The cyan dots: everything after the amber ones. They glow by adding light together.
  geometry.setDrawRange(insightCount, count - insightCount);
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // the shader moves points, so never skip drawing them
  scene.add(points);

  // The amber "insight" dots: drawn last, painted OVER the cyan instead of added to it,
  // so they stay clearly amber instead of turning white where they overlap.
  const insightGeometry = new THREE.BufferGeometry();
  Object.keys(geometry.attributes).forEach(function (name) {
    insightGeometry.setAttribute(name, geometry.attributes[name]); // shares the same data
  });
  insightGeometry.setDrawRange(0, insightCount);
  const insightMaterial = material.clone();
  insightMaterial.uniforms = material.uniforms; // one set of settings drives both
  insightMaterial.blending = THREE.NormalBlending;
  const insightPoints = new THREE.Points(insightGeometry, insightMaterial);
  insightPoints.frustumCulled = false;
  insightPoints.renderOrder = 1; // draw after the cyan dots
  scene.add(insightPoints);

  // 3c. The "push field": a small picture of where the mouse has pushed (see section 6)
  const push = createPushField(renderer);
  material.uniforms.uPushField.value = push.texture();

  // 3d. Glow (desktop only)
  let composer = null;
  const passes = [];
  if (useGlow) {
    composer = new EffectComposer(renderer);
    passes.push(new RenderPass(scene, camera));
    passes.push(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), GLOW_STRENGTH, GLOW_RADIUS, GLOW_THRESHOLD));
    passes.push(new OutputPass()); // converts colors for the screen
    passes.forEach(function (pass) {
      composer.addPass(pass);
    });
  }

  // 3e. Fit everything to the window
  let lastWidth = 0;
  let lastHeight = 0;
  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Sharpness: changes when the browser is zoomed or the window moves to another screen.
    const ratio = Math.min(window.devicePixelRatio || 1, pixelCap);
    if (ratio !== renderer.getPixelRatio()) {
      renderer.setPixelRatio(ratio);
      if (composer) {
        composer.setPixelRatio(ratio);
      }
      material.uniforms.uPixelRatio.value = ratio;
      lastWidth = 0; // force the full resize below
    }

    // Phones resize a little when the address bar slides; ignore small height-only changes.
    // (The canvas is stretched to the full screen by the CSS, so it still covers it.)
    if (width === lastWidth && Math.abs(height - lastHeight) < 120) {
      return;
    }
    lastWidth = width;
    lastHeight = height;

    // "false" = don't write a fixed pixel size onto the canvas; the CSS keeps it full-screen.
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setSize(width, height);
    }

    // How big the visible area is, in scene units, at the middle of the scene.
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfWidth = halfHeight * camera.aspect;
    const u = material.uniforms;
    u.uCloudScale.value.set(halfWidth * 1.15, halfHeight * 1.15);

    if (width >= WIDE_SCREEN) {
      // Wide: shapes sit beside the text (right, left, right).
      u.uShapeScale.value = Math.min(halfWidth * SHAPE_SIZE_WIDE, halfHeight * 0.62);
      u.uShapeOffset1.value.set(halfWidth * SHAPE_SIDE_OFFSET, 0, 0);
      u.uShapeOffset2.value.set(-halfWidth * SHAPE_SIDE_OFFSET, 0, 0);
      u.uShapeOffset3.value.set(halfWidth * SHAPE_SIDE_OFFSET, 0, 0);
    } else {
      // Narrow: shapes sit in the top part of the screen, above the text.
      u.uShapeScale.value = Math.min(halfWidth * 0.78, halfHeight * 0.34);
      const above = new THREE.Vector3(0, halfHeight * 0.4, 0);
      u.uShapeOffset1.value.copy(above);
      u.uShapeOffset2.value.copy(above);
      u.uShapeOffset3.value.copy(above);
    }
    push.setAspect(width / height);
  }
  resize();
  window.addEventListener("resize", resize);

  // 3f. Mouse / finger position
  const pointer = { x: 0.5, y: 0.5, inside: false, ndcX: 0, ndcY: 0 };
  function onPointerMove(event) {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = 1 - event.clientY / window.innerHeight; // flip: 0 = bottom in WebGL
    pointer.ndcX = pointer.x * 2 - 1;
    pointer.ndcY = pointer.y * 2 - 1;
    pointer.inside = true;
  }
  function onPointerOut(event) {
    if (!event.relatedTarget) {
      pointer.inside = false; // left the window
    }
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerout", onPointerOut);

  // 3g. Tell the CSS the scene is running (hides the backup picture), then link the shapes
  // to scrolling (see section 7). "webgl-story" = the shapes will appear, so the story
  // steps get full-screen room and their small icons can hide.
  root.classList.add("webgl", "scene-settled");
  const morph = { target: 0 };
  const scrollLink = setupScrollShapes(morph);
  if (scrollLink) {
    root.classList.add("webgl-story");
    window.ScrollTrigger.refresh(); // re-measure now that the steps are taller
  }

  // 3h. The "Pause motion" button: freezes the drift (scrolling still forms the shapes,
  // because that movement is under the visitor's control).
  let userPaused = false;
  const pauseButton = document.querySelector(".motion-toggle");
  function onPauseClick() {
    userPaused = !userPaused;
    pauseButton.setAttribute("aria-pressed", userPaused ? "true" : "false");
    pauseButton.textContent = userPaused ? "Play motion" : "Pause motion";
    root.classList.toggle("scene-paused", userPaused);
  }
  if (pauseButton) {
    pauseButton.hidden = false;
    pauseButton.addEventListener("click", onPauseClick);
  }

  // 3i. The animation loop: runs once per screen refresh
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05); // seconds since last frame (capped after a pause)
    const u = material.uniforms;
    if (!userPaused) {
      u.uTime.value += dt; // frozen time = frozen drift
    }

    // Ease the shape toward the scroll position (a smooth, liquid follow).
    u.uMorph.value += (morph.target - u.uMorph.value) * (1 - Math.exp(-dt * MORPH_FOLLOW));

    // Camera leans toward the mouse.
    camera.position.x += (pointer.ndcX * PARALLAX - camera.position.x) * (1 - Math.exp(-dt * 2));
    camera.position.y += (pointer.ndcY * PARALLAX - camera.position.y) * (1 - Math.exp(-dt * 2));
    camera.lookAt(0, 0, 0);

    // Update the push field, then draw.
    push.update(pointer, dt);
    u.uPushField.value = push.texture();
    if (composer) {
      composer.render(dt);
    } else {
      renderer.render(scene, camera);
    }
  }

  // 3j. Start, and pause when the tab is hidden (saves battery)
  let running = false;
  function play() {
    if (!running) {
      running = true;
      clock.getDelta(); // reset the clock so the first frame doesn't jump
      renderer.setAnimationLoop(frame);
    }
  }
  function pause() {
    running = false;
    renderer.setAnimationLoop(null);
  }
  function onVisibility() {
    if (document.hidden) {
      pause();
    } else {
      play();
    }
  }
  document.addEventListener("visibilitychange", onVisibility);
  play();

  // 3k. Switch everything off if "reduce motion" is turned on during the visit
  function stopScene() {
    if (stopped) {
      return;
    }
    stopped = true;
    pause();
    if (scrollLink) {
      scrollLink.revert(); // removes the scroll links and puts pinned sections back to normal
    }
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerout", onPointerOut);
    document.removeEventListener("visibilitychange", onVisibility);
    reduceMotion.removeEventListener("change", onReduceChange);
    if (pauseButton) {
      pauseButton.removeEventListener("click", onPauseClick);
      pauseButton.hidden = true;
    }
    // Free the graphics memory.
    geometry.dispose();
    insightGeometry.dispose();
    material.dispose();
    insightMaterial.dispose();
    push.dispose();
    passes.forEach(function (pass) {
      pass.dispose();
    });
    if (composer) {
      composer.dispose();
    }
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    root.classList.remove("webgl", "webgl-story", "scene-paused");
    if (window.ScrollTrigger) {
      window.ScrollTrigger.refresh();
    }
  }
  function onReduceChange() {
    if (reduceMotion.matches) {
      stopScene();
    }
  }
  reduceMotion.addEventListener("change", onReduceChange);
}


/* 4. BUILD THE PARTICLES AND THEIR SHAPES
   Every particle gets one position per state: the drifting cloud ("position"), the line chart,
   the scatter plot, and the network (a start and end point, so it can travel along a link).
   Shapes are made in a box from -1 to 1; the shader scales and places them on screen. */
function buildParticles(count, insightCount) {
  const random = seededRandom(20261107); // same "random" layout on every visit
  const gauss = function () {
    // A bell-curve random number (most values near 0).
    return Math.sqrt(-2 * Math.log(random() + 1e-9)) * Math.cos(2 * Math.PI * random());
  };

  const cloud = new Float32Array(count * 3);
  const chart = new Float32Array(count * 3);
  const scatter = new Float32Array(count * 3);
  const netStart = new Float32Array(count * 3);
  const netEnd = new Float32Array(count * 3);
  const extra = new Float32Array(count * 4); // size, delay/phase, speed, insight (1 or 0)

  const network = makeNetwork(random);

  for (let i = 0; i < count; i++) {
    const insight = i < insightCount; // the first few particles are the amber "insight"
    const k3 = i * 3;

    // 4a. Cloud: soft blobs of "ink" plus an even haze across the screen (x and y from -1 to 1).
    let cx;
    let cy;
    if (insight) {
      cx = 0.55 + gauss() * 0.025; // a small amber clump to the right of center
      cy = 0.12 + gauss() * 0.04;
    } else if (random() < 0.82) {
      const blob = CLOUD_BLOBS[Math.floor(random() * CLOUD_BLOBS.length)];
      cx = blob[0] + gauss() * blob[2];
      cy = blob[1] + gauss() * blob[2] * 0.8;
    } else {
      cx = random() * 2 - 1;
      cy = random() * 2 - 1;
    }
    // Depth: the amber clump stays thin so it reads as one cluster; the rest spreads out.
    setXYZ(cloud, k3, cx, cy, insight ? gauss() * 0.15 : (random() - 0.5) * 1.6);

    // 4b. Line chart
    setXYZ(chart, k3, ...chartPoint(random, gauss, insight));

    // 4c. Scatter plot
    setXYZ(scatter, k3, ...scatterPoint(random, gauss, insight));

    // 4d. Network: a start and end point (the same for particles sitting on a node)
    const [a, b] = networkPoint(network, random, gauss, insight);
    setXYZ(netStart, k3, a[0], a[1], a[2]);
    setXYZ(netEnd, k3, b[0], b[1], b[2]);

    // 4e. Per-particle extras
    extra[i * 4] = random();          // size and brightness variety
    extra[i * 4 + 1] = random();      // arrival delay, and where it starts along a link
    extra[i * 4 + 2] = random();      // speed variety
    extra[i * 4 + 3] = insight ? 1 : 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(cloud, 3));
  geometry.setAttribute("aChart", new THREE.BufferAttribute(chart, 3));
  geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
  geometry.setAttribute("aNetwork", new THREE.BufferAttribute(netStart, 3));
  geometry.setAttribute("aNetEnd", new THREE.BufferAttribute(netEnd, 3));
  geometry.setAttribute("aRandom", new THREE.BufferAttribute(extra, 4));
  return geometry;
}

// Where the ink blobs sit in the cloud: [x, y, spread]. The first one is the main mass,
// on the side away from the headline; the others are smaller wisps.
const CLOUD_BLOBS = [
  [0.5, 0.05, 0.24],
  [-0.55, 0.45, 0.2],
  [0.1, -0.55, 0.42],
  [0.85, -0.45, 0.28],
  [-0.2, 0.05, 0.5]
];

// The rising line: [x, y] corners from left to right (the last one is the peak = the insight).
const CHART_LINE = [[-1, -0.55], [-0.67, -0.3], [-0.33, -0.42], [0, -0.02], [0.33, -0.14], [0.67, 0.3], [1, 0.65]];
const CHART_BASE = -0.85; // where the x-axis sits

function lineHeightAt(x) {
  // Straight segments between the corners, like a real line chart.
  for (let i = 0; i < CHART_LINE.length - 1; i++) {
    const [x1, y1] = CHART_LINE[i];
    const [x2, y2] = CHART_LINE[i + 1];
    if (x <= x2) {
      return y1 + (y2 - y1) * ((x - x1) / (x2 - x1));
    }
  }
  return CHART_LINE[CHART_LINE.length - 1][1];
}

function chartPoint(random, gauss, insight) {
  if (insight) {
    // The peak: a bright amber point.
    const peak = CHART_LINE[CHART_LINE.length - 1];
    return [peak[0] + gauss() * 0.03, peak[1] + gauss() * 0.03, gauss() * 0.03];
  }
  const r = random();
  if (r < 0.48) {
    // On the line itself.
    const x = random() * 2 - 1;
    return [x, lineHeightAt(x) + gauss() * 0.012, gauss() * 0.03];
  }
  if (r < 0.72) {
    // The shaded area under the line (thicker near the line).
    const x = random() * 2 - 1;
    const top = lineHeightAt(x);
    return [x, top - (top - CHART_BASE) * Math.pow(random(), 2.2), gauss() * 0.05];
  }
  if (r < 0.82) {
    // The two axes.
    if (random() < 0.6) {
      return [random() * 2.1 - 1.05, CHART_BASE + gauss() * 0.006, 0];
    }
    return [-1.05 + gauss() * 0.006, CHART_BASE + random() * 1.7, 0];
  }
  if (r < 0.91) {
    // Dashed grid lines.
    const rows = [-0.4, 0.05, 0.5];
    const x = -1 + (Math.floor(random() * 24) + random() * 0.5) / 12;
    return [x, rows[Math.floor(random() * rows.length)], 0];
  }
  // Small rings around each data point.
  const corner = CHART_LINE[Math.floor(random() * (CHART_LINE.length - 1))];
  const angle = random() * Math.PI * 2;
  return [corner[0] + Math.cos(angle) * 0.035, corner[1] + Math.sin(angle) * 0.035, 0];
}

// Scatter clusters: [x, y, spread, share of the cyan dots]. The last one is "the insight":
// it gets only amber dots (share 0), so it reads clearly as the one that stands out.
const SCATTER_CLUSTERS = [
  [-0.55, -0.35, 0.16, 0.28],
  [-0.1, 0.32, 0.2, 0.33],
  [0.45, -0.12, 0.14, 0.27],
  [-0.62, 0.52, 0.09, 0.12],
  [0.62, 0.55, 0.06, 0]
];

function scatterPoint(random, gauss, insight) {
  if (insight) {
    const c = SCATTER_CLUSTERS[SCATTER_CLUSTERS.length - 1];
    return [c[0] + gauss() * 0.05, c[1] + gauss() * 0.05, gauss() * 0.05];
  }
  const r = random();
  if (r < 0.08) {
    // Axes, so it reads as a chart.
    if (random() < 0.5) {
      return [random() * 2.1 - 1.05, -0.95 + gauss() * 0.006, 0];
    }
    return [-1.05 + gauss() * 0.006, -0.95 + random() * 1.9, 0];
  }
  if (r < 0.18) {
    // A few stray points.
    return [random() * 2 - 1, random() * 1.8 - 0.9, gauss() * 0.15];
  }
  // Pick a cluster by its share.
  let pick = random();
  for (const c of SCATTER_CLUSTERS) {
    pick -= c[3];
    if (pick <= 0) {
      return [c[0] + gauss() * c[2], c[1] + gauss() * c[2], gauss() * 0.15];
    }
  }
  const c = SCATTER_CLUSTERS[0];
  return [c[0] + gauss() * c[2], c[1] + gauss() * c[2], gauss() * 0.15];
}

// Build a small network: one central hub plus nodes around it, each linked to its nearest neighbors.
function makeNetwork(random) {
  const NODE_COUNT = 22;
  const nodes = [[0.05, 0.02, 0]]; // node 0 = the hub (the insight)
  let tries = 0;
  while (nodes.length < NODE_COUNT && tries < 4000) {
    tries++;
    // Spread evenly over a disc (the square root keeps the middle from getting crowded).
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 0.95;
    const n = [Math.cos(angle) * radius, Math.sin(angle) * radius * 0.85, (random() - 0.5) * 0.4];
    // Keep nodes apart.
    if (nodes.every((m) => Math.hypot(m[0] - n[0], m[1] - n[1]) > 0.27)) {
      nodes.push(n);
    }
  }
  const edges = [];
  const has = new Set();
  const addEdge = (a, b) => {
    const key = Math.min(a, b) + "-" + Math.max(a, b);
    if (a !== b && !has.has(key)) {
      has.add(key);
      edges.push([a, b]);
    }
  };
  // The hub links to its 6 nearest nodes; every node links to its 2 nearest.
  const nearest = (i, k) => nodes
    .map((n, j) => [j, Math.hypot(n[0] - nodes[i][0], n[1] - nodes[i][1], n[2] - nodes[i][2])])
    .filter((pair) => pair[0] !== i)
    .sort((a, b) => a[1] - b[1])
    .slice(0, k)
    .map((pair) => pair[0]);
  nearest(0, 6).forEach((j) => addEdge(0, j));
  nodes.forEach((n, i) => nearest(i, 2).forEach((j) => addEdge(i, j)));
  return { nodes, edges };
}

function networkPoint(network, random, gauss, insight) {
  const { nodes, edges } = network;
  if (insight) {
    // The amber hub.
    const hub = nodes[0];
    const p = [hub[0] + gauss() * 0.04, hub[1] + gauss() * 0.04, hub[2] + gauss() * 0.04];
    return [p, p];
  }
  if (random() < 0.4) {
    // Sitting on a node (a small, tight glowing ball).
    const n = nodes[1 + Math.floor(random() * (nodes.length - 1))];
    const p = [n[0] + gauss() * 0.018, n[1] + gauss() * 0.018, n[2] + gauss() * 0.018];
    return [p, p];
  }
  // Travelling along a link from one node to another.
  const [a, b] = edges[Math.floor(random() * edges.length)];
  const jx = gauss() * 0.004;
  const jy = gauss() * 0.004;
  const forward = random() < 0.5; // half travel each way
  const from = forward ? nodes[a] : nodes[b];
  const to = forward ? nodes[b] : nodes[a];
  return [[from[0] + jx, from[1] + jy, from[2]], [to[0] + jx, to[1] + jy, to[2]]];
}

function setXYZ(array, k, x, y, z) {
  array[k] = x;
  array[k + 1] = y;
  array[k + 2] = z;
}

// A tiny random-number maker that always gives the same sequence for the same seed.
function seededRandom(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


/* 5. THE SHADERS (small programs that run on the graphics card)
   The vertex shader runs once per particle, every frame: it decides where the particle is
   and how big it looks. The fragment shader runs once per pixel of each particle: it paints
   the soft round glow. */

// "Simplex noise": smooth random values that change gently from place to place.
// (A standard public-domain recipe by Ashima Arts and Stefan Gustavson.)
const NOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // Three noise values at once (one per direction), each from a shifted spot.
  vec3 noise3(vec3 p) {
    return vec3(
      snoise(p),
      snoise(vec3(p.y - 19.1, p.z + 33.4, p.x + 47.2)),
      snoise(vec3(p.z + 74.2, p.x - 124.5, p.y + 99.4))
    );
  }

  // "Curl noise": turns noise into swirling currents that never bunch up or empty out,
  // which is what makes the drift look like ink in water.
  vec3 curlNoise(vec3 p) {
    const float e = 0.1;                       // a small step for measuring change
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    vec3 px0 = noise3(p - dx);                 // noise just left of the point...
    vec3 px1 = noise3(p + dx);                 // ...and just right of it (same for up/down, near/far)
    vec3 py0 = noise3(p - dy);
    vec3 py1 = noise3(p + dy);
    vec3 pz0 = noise3(p - dz);
    vec3 pz1 = noise3(p + dz);
    float x = (py1.z - py0.z) - (pz1.y - pz0.y); // how the currents twist around each axis
    float y = (pz1.x - pz0.x) - (px1.z - px0.z);
    float z = (px1.y - px0.y) - (py1.x - py0.x);
    return vec3(x, y, z) / (2.0 * e);
  }
`;

const VERTEX_SHADER = /* glsl */ `
  uniform float uTime;           // seconds since the scene started
  uniform float uMorph;          // 0 = cloud, 1 = chart, 2 = scatter, 3 = network, 4 = cloud again
  uniform float uPixelRatio;     // screen sharpness (so dots are the same size on every screen)
  uniform float uPointSize;      // dot size in pixels
  uniform float uBrightness;     // overall dot brightness
  uniform float uShapeBrightness;// brightness while holding a shape
  uniform float uInsightBrightness; // brightness of the amber dots
  uniform float uNoiseScale;     // size of the swirls
  uniform float uNoiseStrength;  // how far the swirls carry the dots
  uniform float uDriftSpeed;     // how fast the swirls change
  uniform float uCalmness;       // drift left over while in a shape
  uniform float uPushStrength;   // how far the mouse shoves dots
  uniform sampler2D uPushField;  // the picture of where the mouse has pushed
  uniform vec2 uCloudScale;      // the cloud's size (half the screen, in scene units)
  uniform float uShapeScale;     // the shapes' size
  uniform vec3 uShapeOffset1;    // where each shape sits on screen
  uniform vec3 uShapeOffset2;
  uniform vec3 uShapeOffset3;

  attribute vec3 aChart;         // this dot's spot in the line chart
  attribute vec3 aScatter;       // ...in the scatter plot
  attribute vec3 aNetwork;       // ...in the network (start of its link)
  attribute vec3 aNetEnd;        // ...in the network (end of its link)
  attribute vec4 aRandom;        // size, delay, speed, insight (1 = amber)

  varying float vInsight;        // passed on to the fragment shader: amber or cyan
  varying float vAlpha;          // passed on: how bright this dot is

  ${NOISE_GLSL}

  // Turn a point around the up-down axis (used to slowly spin the network).
  vec3 rotateY(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    // 1. The cloud: stretch the -1..1 layout to fill the screen.
    vec3 cloud = vec3(position.xy * uCloudScale, position.z);

    // 2. How much of each shape to show right now (each peaks at its own number).
    float w1 = clamp(1.0 - abs(uMorph - 1.0), 0.0, 1.0); // line chart
    float w2 = clamp(1.0 - abs(uMorph - 2.0), 0.0, 1.0); // scatter
    float w3 = clamp(1.0 - abs(uMorph - 3.0), 0.0, 1.0); // network
    float shapeAmount = w1 + w2 + w3;                     // 0 = pure cloud, 1 = pure shapes
    float safe = max(shapeAmount, 0.0001);                // avoids dividing by zero

    // 3. The network: dots on links slide from one node to the next, over and over.
    float travel = fract(aRandom.y + uTime * 0.06 * (0.5 + aRandom.z));
    vec3 net = rotateY(mix(aNetwork, aNetEnd, travel), sin(uTime * 0.25) * 0.45); // and the whole web gently sways

    // 4. Blend the shapes, then size and place them on screen.
    vec3 shape = (aChart * w1 + aScatter * w2 + net * w3) / safe;
    vec3 offset = (uShapeOffset1 * w1 + uShapeOffset2 * w2 + uShapeOffset3 * w3) / safe;
    vec3 shapeSpot = shape * uShapeScale + offset;

    // 5. Each dot arrives at its own moment (a staggered, flowing arrival instead of a jump).
    float arrive = clamp(shapeAmount * 1.6 - aRandom.y * 0.6, 0.0, 1.0);
    arrive = arrive * arrive * (3.0 - 2.0 * arrive);       // smooth start and finish
    vec3 pos = mix(cloud, shapeSpot, arrive);

    // 6. The liquid drift: strong in the cloud, almost still once a shape has formed.
    float drift = mix(1.0, uCalmness, arrive);
    vec3 flow = curlNoise(pos * uNoiseScale + vec3(0.0, 0.0, uTime * uDriftSpeed));
    pos += flow * uNoiseStrength * drift * (0.75 + 0.5 * aRandom.z);

    // 7. The mouse push: find where this dot is on screen and read the push picture there.
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 screenSpot = clip.xy / clip.w * 0.5 + 0.5;         // 0..1 across the screen
    vec2 pushed = texture2D(uPushField, screenSpot).rg;     // which way, and how hard
    pos.xy += pushed * uPushStrength * (0.6 + 0.4 * aRandom.z);

    // 8. Final position on screen.
    vec4 viewSpot = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * viewSpot;

    // 9. Size: varied per dot, amber dots a little bigger, far dots smaller.
    float size = uPointSize * (0.5 + aRandom.x) * mix(1.0, 1.6, aRandom.w);
    gl_PointSize = size * uPixelRatio * (10.0 / -viewSpot.z);

    // 10. Color and brightness for the fragment shader.
    vInsight = aRandom.w;
    float base = mix(uBrightness, uInsightBrightness, aRandom.w);          // amber dots are dimmer (they're packed tight)
    vAlpha = base * (0.35 + 0.65 * aRandom.x) * mix(1.0, uShapeBrightness, arrive); // and all dots soften inside a shape
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;           // cyan
  uniform vec3 uInsightColor;    // amber

  varying float vInsight;
  varying float vAlpha;

  void main() {
    // gl_PointCoord runs 0..1 across the dot; measure the distance from its center.
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;                         // outside the circle: draw nothing
    float glow = pow(1.0 - d * 2.0, 1.8);         // bright center, soft fading edge
    vec3 color = mix(uColor, uInsightColor, vInsight);
    gl_FragColor = vec4(color, glow * vAlpha);
    #include <colorspace_fragment>
  }
`;


/* 6. THE PUSH FIELD
   A small 128 x 128 picture, redrawn every frame, that remembers where the mouse has pushed.
   Each pixel stores a direction (away from the mouse) and a strength. Every frame the old
   picture fades a little, so pushed particles ease back over RETURN_TIME seconds. */
function createPushField(renderer) {
  const SIZE = 128;
  const options = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let read = new THREE.WebGLRenderTarget(SIZE, SIZE, options);
  let write = new THREE.WebGLRenderTarget(SIZE, SIZE, options);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPrevious: { value: read.texture },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uFade: { value: 1 },
      uRadius: { value: CURSOR_RADIUS },
      uAmount: { value: 0 },
      uAspect: { value: 1 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;                       // where this pixel is in the picture (0..1)
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0); // a square that covers the whole picture
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uPrevious;  // last frame's picture
      uniform vec2 uPointer;        // mouse position (0..1)
      uniform float uFade;          // how much of the old push survives this frame
      uniform float uRadius;        // reach of the push
      uniform float uAmount;        // 1 = mouse on the page, 0 = away
      uniform float uAspect;        // screen width / height (keeps the push round)
      varying vec2 vUv;

      void main() {
        vec2 previous = texture2D(uPrevious, vUv).rg * uFade;  // the old push, a bit weaker
        vec2 away = vUv - uPointer;                            // from the mouse to this pixel
        away.x *= uAspect;                                     // measure in a round way
        float distance = length(away);
        float strength = smoothstep(uRadius, 0.0, distance) * uAmount; // 1 at the mouse, 0 at the edge
        vec2 direction = distance > 0.0001 ? away / distance : vec2(0.0);
        vec2 fresh = direction * strength;                     // the push right now
        // Keep whichever is stronger: the fresh push or the fading old one (leaves a soft wake).
        vec2 result = length(fresh) > length(previous) ? fresh : previous;
        gl_FragColor = vec4(result, 0.0, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false
  });

  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fadeRate = Math.log(20) / RETURN_TIME; // after RETURN_TIME, only 5% of a push is left
  let amount = 0;

  return {
    texture: function () {
      return read.texture;
    },
    setAspect: function (aspect) {
      material.uniforms.uAspect.value = aspect;
    },
    update: function (pointer, dt) {
      // Fade the push in and out smoothly when the mouse enters or leaves the page.
      amount += ((pointer.inside ? 1 : 0) - amount) * (1 - Math.exp(-dt * 8));
      material.uniforms.uPrevious.value = read.texture;
      material.uniforms.uPointer.value.set(pointer.x, pointer.y);
      material.uniforms.uFade.value = Math.exp(-dt * fadeRate);
      material.uniforms.uAmount.value = amount;
      renderer.setRenderTarget(write);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      const swap = read; // the new picture becomes "last frame's" for next time
      read = write;
      write = swap;
    },
    dispose: function () {
      read.dispose();
      write.dispose();
      material.dispose();
      quad.geometry.dispose();
    }
  };
}


/* 7. LINK THE SHAPES TO SCROLLING
   As each story step scrolls up into view, "morph.target" moves from one shape number
   to the next. On wide screens each step is also pinned (held in place) for a moment so
   the shape can be enjoyed. "matchMedia" rebuilds everything automatically if the window
   crosses the WIDE_SCREEN width (for example, a tablet turned sideways).
   Returns an object whose revert() removes it all, or null if GSAP didn't load. */
function setupScrollShapes(morph) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!ScrollTrigger || !gsap) {
    return null; // no scroll library: the cloud just keeps drifting
  }
  gsap.registerPlugin(ScrollTrigger);

  const media = gsap.matchMedia();
  media.add({
    wide: "(min-width: " + WIDE_SCREEN + "px)",
    narrow: "(max-width: " + (WIDE_SCREEN - 0.02) + "px)"
  }, function (context) {
    linkSteps(context.conditions.wide);
  });
  return media;

  function linkSteps(wide) {
    const steps = document.querySelectorAll(".story-step");

    steps.forEach(function (step, i) {
      // Morph from shape i to shape i + 1 while the step slides up into place.
      ScrollTrigger.create({
        trigger: step,
        start: "top bottom",
        end: wide ? "top top" : "center center",
        onUpdate: function (self) {
          morph.target = i + self.progress;
        },
        onLeave: function () {
          morph.target = i + 1;
        },
        onLeaveBack: function () {
          morph.target = i;
        }
      });

      // Wide screens: hold the step in place for a while.
      if (wide) {
        ScrollTrigger.create({
          trigger: step,
          start: "top top",
          end: "+=" + PIN_LENGTH,
          pin: true
        });
      }
    });

    // The closing panel: the shapes dissolve back into a drifting cloud.
    const end = document.querySelector(".story-end");
    if (end) {
      ScrollTrigger.create({
        trigger: end,
        start: "top bottom",
        end: "center center",
        onUpdate: function (self) {
          morph.target = steps.length + self.progress;
        },
        onLeaveBack: function () {
          morph.target = steps.length;
        }
      });
    }

    // Put all scroll triggers (including the ones js/motion.js made) in page order, then measure.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }
}


/* 8. GO
   This file loads "async" (it never holds up the rest of the page), so it may run before
   the page has finished loading. Wait for that, then check that animations are allowed
   and that the browser can draw 3D (WebGL). If not, the backup picture stays. */
function go() {
  const holder = document.querySelector(".scene");
  if (!holder || !root.classList.contains("motion") || reduceMotion.matches) {
    root.classList.add("scene-settled"); // show the backup picture now
    return;
  }
  let renderer = null;
  try {
    // "default" lets laptops with two graphics chips keep using the power-saving one.
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "default" });
  } catch (error) {
    root.classList.add("scene-settled"); // no WebGL: keep the backup picture
    return;
  }
  startScene(renderer, holder);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", go, { once: true });
} else {
  go();
}
