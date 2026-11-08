/* PROJECTS-HOVER.JS: THE RIPPLING PICTURE ON THE PROJECTS PAGE
   On a wide screen with a mouse, hovering a project title in the list shows that project's
   chart in the empty strip to the right of the titles. It follows the mouse up and down with a
   soft lag, ripples like water as it appears, bends a little when you move quickly, and wipes
   over to the next chart when you move to another title. Keyboard users get the same chart
   beside the title they Tab to. An open project already shows its chart, so it gets no preview.

   It's drawn with Three.js (a 3D drawing library) on one see-through layer over the page.
   It is decoration only: it never catches clicks, and screen readers skip it.
   Phones, tablets, "reduce motion", or no WebGL: it simply doesn't start, so phones never even
   download Three.js. The list and the projects work the same either way.

   SECTIONS
   1. Settings
   2. Start (only on wide screens with a mouse, motion on)
   3. The picture layer
   4. The shaders (small programs that run on the graphics card)
   5. Go */


/* 1. SETTINGS */

// The largest the picture gets (pixels). Each picture keeps its own shape inside this box,
// and it never gets wider than the empty strip beside the titles (set by --hover-room in style.css).
const IMAGE_MAX_WIDTH = 520;
const IMAGE_MAX_HEIGHT = 400;

// The picture stays in the empty strip on the right. Side to side it only drifts a little with
// the mouse: 0 = stays centered in the strip, 1 = follows the mouse fully (as far as the strip allows).
const SIDEWAYS_FOLLOW = 0.15;

// The dark card behind each chart (the charts themselves are see-through).
const CARD_COLOR = 0x0e1726;

// How quickly the picture catches up with the mouse. Smaller = lazier and floatier (0.05),
// larger = snappier (0.3). This is the share of the gap it closes each frame.
const FOLLOW_SPEED = 0.12;

// Rounded corners of the picture (pixels).
const CORNER_RADIUS = 10;

// The ripple: how far the waves push the picture around (0 = none, 0.06 = strong),
// how many rings fit across it, and how fast they travel outward.
const RIPPLE_STRENGTH = 0.03;
const RIPPLE_RINGS = 3.5;
const RIPPLE_SPEED = 1.2;

// How long a ripple takes to calm down after the picture appears or changes (seconds).
const RIPPLE_CALM_TIME = 1.2;

// Dragging: how much the picture bends when the mouse moves quickly (0 = stays flat),
// and how far the red and blue split apart at the edges while it moves (0 = no split).
const BEND_STRENGTH = 0.35;
const COLOR_SPLIT = 0.012;

// Seconds for the picture to appear or disappear, and to wipe over to another project's picture.
const SHOW_TIME = 0.45;
const SWITCH_TIME = 0.7;

// Sharpness on high-resolution screens. Capped so the graphics card isn't overworked.
const MAX_PIXEL_RATIO = 2;

// The picture only runs on screens at least this wide (pixels) with a mouse or trackpad.
const WIDE_SCREEN = 900;


/* 2. START */

const root = document.documentElement;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const wideWithMouse = window.matchMedia(
  "(min-width: " + WIDE_SCREEN + "px) and (hover: hover) and (pointer: fine)"
);

let THREE = null;      // the Three.js library, once downloaded
let layer = null;      // the running picture layer (null when stopped)
let gaveUp = false;    // true once Three.js or WebGL failed, or reduce motion was turned on

// Starts the picture layer when everything allows it, and stops it when something changes
// (the window gets narrow, or "reduce motion" is switched on).
async function update() {
  const allowed = !gaveUp &&
    root.classList.contains("motion") &&
    !reduceMotion.matches &&
    wideWithMouse.matches;

  if (!allowed) {
    if (layer) {
      layer.stop();
      layer = null;
    }
    return;
  }
  if (layer) {
    return; // already running
  }

  const list = document.querySelector(".project-index");
  if (!list) {
    return;
  }

  // Check quietly that this computer can draw with WebGL, so it never downloads Three.js for nothing.
  if (!canUseWebGL()) {
    gaveUp = true;
    return;
  }

  // Download Three.js now (only wide screens get this far).
  if (!THREE) {
    try {
      THREE = await import("three");
    } catch (error) {
      gaveUp = true; // couldn't download it: the list works fine without the picture
      return;
    }
    // Things may have changed while it downloaded.
    if (layer || reduceMotion.matches || !wideWithMouse.matches) {
      update();
      return;
    }
  }

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "default" });
  } catch (error) {
    gaveUp = true; // no WebGL on this computer
    return;
  }
  layer = startLayer(renderer, list);
}


/* 3. THE PICTURE LAYER */
function startLayer(renderer, list) {
  const rows = Array.from(list.querySelectorAll(".project-row"));
  const cleanups = []; // things to undo when the layer stops

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanups.push(function () {
      target.removeEventListener(type, handler, options);
    });
  }

  // The drawing surface: one see-through canvas over the whole window.
  const canvas = renderer.domElement;
  canvas.className = "project-hover";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  renderer.setClearColor(0x000000, 0);

  // A flat camera that measures in screen pixels, with (0, 0) in the middle of the window.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);

  // One picture card: a flat square split into a grid, so it can bend smoothly.
  const geometry = new THREE.PlaneGeometry(1, 1, 32, 32);
  const blank = new THREE.Texture(); // stand-in until a picture is chosen
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    uniforms: {
      uTextureA: { value: blank },       // the picture showing now
      uTextureB: { value: blank },       // the picture being wiped in
      uAspectA: { value: 1 },            // their shapes (width / height)
      uAspectB: { value: 1 },
      uSwitch: { value: 0 },             // 0 = all A, 1 = all B
      uShow: { value: 0 },               // 0 = hidden, 1 = fully shown
      uRipple: { value: 0 },             // how strong the ripple is right now
      uVelocity: { value: new THREE.Vector2() }, // how fast it's being dragged
      uSize: { value: new THREE.Vector2(1, 1) }, // its size on screen (pixels)
      uTime: { value: 0 },
      uRippleStrength: { value: RIPPLE_STRENGTH },
      uRippleRings: { value: RIPPLE_RINGS },
      uRippleSpeed: { value: RIPPLE_SPEED },
      uBend: { value: BEND_STRENGTH },
      uColorSplit: { value: COLOR_SPLIT },
      uRadius: { value: CORNER_RADIUS },
      uCard: { value: new THREE.Color(CARD_COLOR) }
    }
  });
  const card = new THREE.Mesh(geometry, material);
  const scene = new THREE.Scene();
  scene.add(card);
  const u = material.uniforms;

  // Load every project picture once. "aspect" is its shape, so it's never squashed.
  const loader = new THREE.TextureLoader();
  const pictures = new Map(); // address -> { texture, aspect }
  rows.forEach(function (row) {
    const address = row.dataset.image;
    if (!address || pictures.has(address)) {
      return;
    }
    const picture = { texture: null, aspect: 4 / 3 };
    pictures.set(address, picture);
    loader.load(address, function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      picture.texture = texture;
      picture.aspect = texture.image.width / texture.image.height;
      // If this picture was chosen before it finished loading, show it now.
      if (wanted === address) {
        choose(address);
      }
    });
  });

  // What's happening right now.
  const mouse = { x: 0, y: 0, known: false };   // where the mouse is
  const target = { x: 0, y: 0 };                 // where the picture is heading
  const position = { x: 0, y: 0 };               // where the picture is
  const size = { w: IMAGE_MAX_WIDTH, h: IMAGE_MAX_HEIGHT };   // its current size
  const goalSize = { w: IMAGE_MAX_WIDTH, h: IMAGE_MAX_HEIGHT };
  const velocity = { x: 0, y: 0 };
  let showGoal = 0;          // 1 = should be visible, 0 = should be hidden
  let current = null;        // address of the picture showing (texture A)
  let wanted = null;         // address of the picture the visitor asked for
  let switching = false;     // true while wiping from A to B
  let focusedRow = null;     // the row a keyboard user is on (the picture sits beside it)
  let running = false;
  let lastTime = 0;
  let width = 1;
  let height = 1;

  // Fits a picture's shape inside the largest size allowed.
  function fitSize(aspect) {
    let w = Math.min(IMAGE_MAX_WIDTH, strip().width - 32);
    let h = w / aspect;
    if (h > IMAGE_MAX_HEIGHT) {
      h = IMAGE_MAX_HEIGHT;
      w = h * aspect;
    }
    goalSize.w = w;
    goalSize.h = h;
  }

  // Picks the picture to show. If nothing is showing yet it just appears;
  // otherwise the new one wipes in over the old one.
  function choose(address) {
    wanted = address;
    const picture = pictures.get(address);
    if (!picture || !picture.texture) {
      return; // still downloading: choose() runs again when it's ready
    }
    if (address === current && !switching) {
      return;
    }
    fitSize(picture.aspect);
    if (current === null || u.uShow.value < 0.05) {
      // Nothing visible: show it straight away.
      current = address;
      switching = false;
      u.uTextureA.value = picture.texture;
      u.uAspectA.value = picture.aspect;
      u.uSwitch.value = 0;
      size.w = goalSize.w;
      size.h = goalSize.h;
    } else {
      // Already showing one: if a wipe is halfway, finish it instantly, then start the new one.
      if (switching) {
        u.uTextureA.value = u.uTextureB.value;
        u.uAspectA.value = u.uAspectB.value;
      }
      u.uTextureB.value = picture.texture;
      u.uAspectB.value = picture.aspect;
      u.uSwitch.value = 0;
      switching = true;
      current = address;
    }
    u.uRipple.value = 1; // every new picture arrives with a ripple
    play();
  }

  function show(row) {
    if (!row.dataset.image || row.getAttribute("aria-expanded") === "true") {
      hide(); // no picture (the research paper), or the project is open and already shows its chart
      return;
    }
    const appearing = u.uShow.value < 0.02;
    showGoal = 1;
    choose(row.dataset.image);
    // Aim with this picture's size, and when it first appears, start it right there (no flying in).
    if (focusedRow) {
      aimAtRow(focusedRow);
    } else {
      aimAtMouse();
    }
    if (appearing) {
      position.x = target.x;
      position.y = target.y;
    }
    play();
  }

  function hide() {
    showGoal = 0;
    wanted = null;
    play();
  }

  // The empty strip on the right of the list, where the picture lives (in window pixels).
  function strip() {
    const box = list.getBoundingClientRect();
    const share = parseFloat(getComputedStyle(root).getPropertyValue("--hover-room")) / 100 || 0.36;
    const width = box.width * share;
    return { left: box.right - width, width: width, center: box.right - width / 2 };
  }

  // Where the picture goes: in the strip, level with the mouse (or the keyboard-focused row),
  // drifting only slightly sideways, and never past the edges of the strip or the window.
  function aim(x, y) {
    const room = strip();
    const halfW = goalSize.w / 2;
    const halfH = goalSize.h / 2;
    const header = document.querySelector(".site-header");
    const top = (header ? header.offsetHeight : 0) + 12 + halfH;
    target.x = clamp(room.center + (x - room.center) * SIDEWAYS_FOLLOW, room.left + halfW, room.left + room.width - halfW + 16);
    target.y = clamp(y, top, Math.max(top, height - 12 - halfH));
  }

  function aimAtMouse() {
    aim(mouse.x, mouse.y);
  }

  function aimAtRow(row) {
    const box = row.getBoundingClientRect();
    aim(strip().center, box.top + box.height / 2);
  }

  // Mouse events.
  listen(window, "pointermove", function (event) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
      return;
    }
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.known = true;
    if (!focusedRow) {
      aimAtMouse();
    }
  }, { passive: true });

  rows.forEach(function (row) {
    listen(row, "pointerenter", function (event) {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
        return;
      }
      focusedRow = null;
      mouse.x = event.clientX;
      mouse.y = event.clientY;
      aimAtMouse();
      show(row);
    });

    // Clicking opens the project (which shows its own chart), so the preview gets out of the way.
    listen(row, "click", hide);

    // Keyboard: the picture appears beside the row you Tab to.
    listen(row, "focus", function () {
      if (!row.matches(":focus-visible")) {
        return; // focus from a mouse click, not the keyboard
      }
      focusedRow = row;
      aimAtRow(row);
      show(row);
    });
    listen(row, "blur", function () {
      if (focusedRow === row) {
        focusedRow = null;
        hide();
      }
    });

    // Leaving a line hides the picture (moving straight onto another line shows that one instead).
    listen(row, "pointerleave", function () {
      if (!focusedRow) {
        hide();
      }
    });
  });

  // Hide the picture once the list scrolls off screen.
  const watcher = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) {
      focusedRow = null;
      hide();
    }
  });
  watcher.observe(list);
  cleanups.push(function () {
    watcher.disconnect();
  });

  // Window size.
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false); // "false": the CSS decides the on-screen size
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
    if (!running) {
      renderer.render(scene, camera);
    }
  }
  resize();
  listen(window, "resize", resize);

  // Pause while the tab is hidden.
  listen(document, "visibilitychange", function () {
    if (document.hidden) {
      pause();
    } else if (showGoal > 0 || u.uShow.value > 0) {
      play();
    }
  });

  // Every frame (only while a picture is showing or fading).
  function frame(now) {
    const time = now / 1000;
    const dt = Math.min(time - lastTime, 1 / 20); // seconds since the last frame (capped after a pause)
    lastTime = time;
    u.uTime.value = time;

    // Keep aiming: the page may scroll, and the picture's size changes when it switches.
    if (focusedRow) {
      aimAtRow(focusedRow);
    } else if (mouse.known) {
      aimAtMouse();
    }

    // Glide toward the target. (Adjusted so it feels the same at 60, 120 or 144 frames a second.)
    const follow = 1 - Math.pow(1 - FOLLOW_SPEED, dt * 60);
    const dx = (target.x - position.x) * follow;
    const dy = (target.y - position.y) * follow;
    position.x += dx;
    position.y += dy;
    size.w += (goalSize.w - size.w) * follow;
    size.h += (goalSize.h - size.h) * follow;

    // Speed, measured in picture-widths per frame, smoothed and capped so it never bends too far.
    const settle = 1 - Math.exp(-dt * 10);
    velocity.x += (clamp(dx / size.w * 6, -1, 1) - velocity.x) * settle;
    velocity.y += (clamp(-dy / size.h * 6, -1, 1) - velocity.y) * settle;
    u.uVelocity.value.set(velocity.x, velocity.y);

    // Fade in or out. (It waits to appear until its picture has finished downloading.)
    const showStep = dt / SHOW_TIME;
    const goal = current ? showGoal : 0;
    u.uShow.value = goal > u.uShow.value ?
      Math.min(goal, u.uShow.value + showStep) :
      Math.max(goal, u.uShow.value - showStep);

    // Wipe from the old picture to the new one.
    if (switching) {
      u.uSwitch.value = Math.min(1, u.uSwitch.value + dt / SWITCH_TIME);
      if (u.uSwitch.value >= 1) {
        u.uTextureA.value = u.uTextureB.value;
        u.uAspectA.value = u.uAspectB.value;
        u.uSwitch.value = 0;
        switching = false;
      }
    }

    // The ripple calms down over time.
    u.uRipple.value *= Math.exp(-dt * 3 / RIPPLE_CALM_TIME);

    // Place and size the card (the camera's (0, 0) is the middle of the window, and y points up).
    card.position.set(position.x - width / 2, height / 2 - position.y, 0);
    card.scale.set(size.w, size.h, 1);
    u.uSize.value.set(size.w, size.h);

    renderer.render(scene, camera);

    // Fully hidden and nothing left to animate: stop drawing until it's needed again.
    if (goal === 0 && u.uShow.value === 0 && !(showGoal > 0 && wanted)) {
      current = null;
      switching = false;
      pause();
    }
  }

  function play() {
    if (running || document.hidden) {
      return;
    }
    running = true;
    lastTime = performance.now() / 1000;
    renderer.setAnimationLoop(frame);
  }

  function pause() {
    running = false;
    renderer.setAnimationLoop(null);
  }

  // Remove everything (reduce motion switched on, or the window became narrow).
  function stop() {
    pause();
    cleanups.forEach(function (undo) {
      undo();
    });
    pictures.forEach(function (picture) {
      if (picture.texture) {
        picture.texture.dispose();
      }
    });
    blank.dispose();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }

  return { stop: stop };
}

function canUseWebGL() {
  try {
    const gl = window.WebGL2RenderingContext && document.createElement("canvas").getContext("webgl2");
    if (!gl) {
      return false;
    }
    const tidy = gl.getExtension("WEBGL_lose_context"); // hand the test drawing surface straight back
    if (tidy) {
      tidy.loseContext();
    }
    return true;
  } catch (error) {
    return false;
  }
}

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}


/* 4. THE SHADERS
   The vertex shader moves the corners of the grid (the bend); the fragment shader colors each
   pixel (the picture, the ripple, the wipe, the rounded corners and the fade). */

const VERTEX_SHADER = /* glsl */ `
  uniform vec2 uVelocity;  // how fast the picture is being dragged (-1 to 1)
  uniform float uBend;     // BEND_STRENGTH
  varying vec2 vUv;        // where on the picture this point is (0 to 1), passed on below

  void main() {
    vUv = uv;
    vec3 p = position; // from -0.5 to 0.5 across the card

    // The middle of the card trails behind its edges, like a cloth being pulled:
    // the further from the edges, the more it lags.
    float acrossY = 1.0 - pow(p.y * 2.0, 2.0); // 1 in the middle row, 0 at the top and bottom
    float acrossX = 1.0 - pow(p.x * 2.0, 2.0); // 1 in the middle column, 0 at the sides
    p.x -= uVelocity.x * uBend * 0.25 * acrossY;
    p.y -= uVelocity.y * uBend * 0.25 * acrossX;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTextureA;
  uniform sampler2D uTextureB;
  uniform float uAspectA;
  uniform float uAspectB;
  uniform float uSwitch;
  uniform float uShow;
  uniform float uRipple;
  uniform vec2 uVelocity;
  uniform vec2 uSize;
  uniform float uTime;
  uniform float uRippleStrength;
  uniform float uRippleRings;
  uniform float uRippleSpeed;
  uniform float uColorSplit;
  uniform float uRadius;
  uniform vec3 uCard;      // the dark card color behind the see-through chart
  varying vec2 vUv;

  // Fits a picture of one shape into a card of another shape without squashing it
  // (like CSS "object-fit: cover": the picture fills the card and the extra edge is trimmed).
  vec2 coverUv(vec2 uv, float cardAspect, float pictureAspect) {
    vec2 scale = vec2(1.0);
    if (cardAspect > pictureAspect) {
      scale.y = pictureAspect / cardAspect;
    } else {
      scale.x = cardAspect / pictureAspect;
    }
    return (uv - 0.5) * scale + 0.5;
  }

  // Reads a see-through chart laid on the dark card, with its red and blue pulled slightly apart
  // in the direction of movement.
  vec3 onCard(vec4 texel) {
    return mix(uCard, texel.rgb, texel.a);
  }

  vec3 readSplit(sampler2D picture, vec2 uv, vec2 shift) {
    float r = onCard(texture2D(picture, uv + shift)).r;
    float g = onCard(texture2D(picture, uv)).g;
    float b = onCard(texture2D(picture, uv - shift)).b;
    return vec3(r, g, b);
  }

  void main() {
    vec2 uv = vUv;
    vec2 fromCenter = uv - 0.5;
    float distance = length(fromCenter);

    // THE RIPPLE: rings that travel outward from the middle and fade toward the edges.
    // Stronger right after a picture appears or changes, and while the mouse moves.
    float energy = uRipple + length(uVelocity) * 0.5;
    float wave = sin(distance * uRippleRings * 6.2832 - uTime * uRippleSpeed * 6.2832);
    float fade = smoothstep(0.75, 0.0, distance);
    vec2 direction = fromCenter / max(distance, 0.0001);
    uv += direction * wave * fade * energy * uRippleStrength;

    // THE COLOR SPLIT while dragging.
    vec2 shift = uVelocity * uColorSplit;

    // THE PICTURE: the old one (A), the new one (B), and a wavy wipe between them.
    float cardAspect = uSize.x / uSize.y;
    vec3 colorA = readSplit(uTextureA, coverUv(uv, cardAspect, uAspectA), shift);
    vec3 colorB = readSplit(uTextureB, coverUv(uv, cardAspect, uAspectB), shift);
    float edge = vUv.x * 0.75 + vUv.y * 0.25 + 0.04 * sin(vUv.y * 14.0 + uTime * 5.0);
    float front = uSwitch * 1.4 - 0.2;
    float stillA = smoothstep(front - 0.12, front + 0.12, edge);
    vec3 color = mix(colorB, colorA, stillA);

    // THE APPEARANCE: a circle grows from the middle with a softly wobbling edge until it fills the card.
    float angle = atan(fromCenter.y, fromCenter.x);
    // (The wobble is strongest halfway through and fades to nothing at the start and end.)
    float wobble = 0.03 * sin(angle * 5.0 + uTime * 3.0) * uShow * (1.0 - uShow) * 4.0;
    float radius = uShow * 0.9 + wobble * 0.25;
    float alpha = smoothstep(radius, radius - 0.08, distance);

    // ROUNDED CORNERS (measured in screen pixels so they stay round at any size).
    vec2 pixel = (vUv - 0.5) * uSize;
    vec2 corner = abs(pixel) - (uSize * 0.5 - uRadius);
    float outside = length(max(corner, 0.0)) - uRadius;
    alpha *= 1.0 - smoothstep(-1.0, 0.5, outside);

    // A gentle overall fade on top of the growing circle.
    alpha *= smoothstep(0.0, 0.35, uShow);

    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;


/* 5. GO */
function go() {
  update();
  // Start or stop when the window size changes or "reduce motion" is switched.
  if (wideWithMouse.addEventListener) {
    wideWithMouse.addEventListener("change", update);
  }
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", function () {
      if (reduceMotion.matches) {
        gaveUp = true; // stays off for the rest of the visit, like the rest of the site's motion
      }
      update();
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", go, { once: true });
} else {
  go();
}
