/* PROJECT-GLOW.JS: THE GLOWING SMOKE AROUND AN OPEN PROJECT'S CHART
   When a project opens on the Projects page, its chart floats in wisps of drifting blue smoke.
   The smoke gathers around the chart and clings to every bar, dot and line, and the edges of the
   chart's shapes waver softly like they're made of the same air.

   How it works: one small drawing program ("shader") runs on the graphics card, using WebGL2
   directly (no library to download). It reads the chart picture that's already on the page, so
   the chart keeps its place, alt text and print version; the plain picture just turns invisible
   underneath while the glowing one is drawn on top.

   Only the open project is drawn (one at a time), and drawing pauses when it scrolls out of view,
   when the tab is hidden, or when the project closes. Phones get a lighter version. With
   "reduce motion" on, the smoke is drawn once and stays still. Without WebGL2, the page keeps its
   simpler CSS glow (style.css section 22d).

   SECTIONS
   1. Settings
   2. Start
   3. Following the open project
   4. Drawing
   5. The shader */


/* 1. SETTINGS */

// true = the smoke runs; false = always use the simpler CSS glow.
const GLOW_ON = true;

// How thick the smoke is (0 = none, 1 = normal, 1.5 = heavy), and how far it spreads from the
// chart (as a share of the stage: 0.1 = hugs it closely, 0.4 = fills the stage).
const SMOKE_AMOUNT = 0.45;
const SMOKE_REACH = 0.11;

// How fast the smoke drifts (0 = still), and the size of its swirls (bigger number = smaller,
// busier swirls).
const SMOKE_SPEED = 0.05;
const SMOKE_SWIRL_SIZE = 1.6;

// The smoke's two colors: the light glow and the deep blue around it.
const SMOKE_COLOR_LIGHT = "#36cfff";
const SMOKE_COLOR_DEEP = "#2a5bd7";

// The chart: how solid it is (1 = fully solid), how far wisps of glow curl off the edges of its
// shapes (0 = none, 1 = long wisps), and how bright the glow hugging its shapes is.
const CHART_OPACITY = 0.92;
const EDGE_WISPS = 0.8;
const EDGE_GLOW = 0.5;

// The mouse stirs the smoke: how strongly it pushes the smoke aside (0 = not at all), and the
// size of the stirred patch (as a share of the stage).
const SMOKE_STIR = 0.35;
const SMOKE_STIR_SIZE = 0.14;

// Seconds for the smoke to fade in when a project opens.
const FADE_IN_TIME = 1.6;

// Sharpness on high-resolution screens (capped to keep the graphics card relaxed), and the
// lighter phone version: lower sharpness and fewer layers of swirl detail.
const MAX_PIXEL_RATIO = 1.5;
const PHONE_PIXEL_RATIO = 1;
const SMOKE_DETAIL = 5;
const PHONE_SMOKE_DETAIL = 3;
const PHONE_SCREEN = 900;


/* 2. START (runs at the very end of this file, once the shader text below is defined) */
function startGlow() {
  const root = document.documentElement;
  if (!GLOW_ON || !document.querySelector(".project-stage")) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "project-glow";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
  if (!gl) {
    return; // no WebGL2: the CSS glow stays
  }

  const program = buildProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  if (!program) {
    return;
  }
  const u = {};
  ["uChart", "uHasChart", "uRes", "uRect", "uTime", "uReveal", "uSmoke", "uReach", "uSwirl",
    "uOpacity", "uWisps", "uGlow", "uLight", "uDeep", "uDetail", "uMouse", "uStirSize"].forEach(function (name) {
    u[name] = gl.getUniformLocation(program, name);
  });

  const texture = gl.createTexture();
  const phone = window.matchMedia("(max-width: " + (PHONE_SCREEN - 1) + "px)");

  let stage = null;        // the open project's stage
  let chartImage = null;   // its chart picture (null for the research paper)
  let hasChart = false;    // true once the chart picture is on the graphics card
  let visible = false;     // is the stage on screen?
  let running = false;
  let openedAt = 0;
  let frozenTime = 0;      // the moment to show when "reduce motion" keeps the smoke still
  let broken = false;      // the graphics card dropped the drawing: fall back to CSS for good
  const pointer = { x: -1e4, y: -1e4, stir: 0 }; // the mouse, and how much it's stirring right now

  window.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }
  }, { passive: true });

  const watcher = new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    if (visible) {
      play();
    }
  });
  const resizer = new ResizeObserver(function () {
    if (stage) {
      draw(performance.now());
    }
  });

  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    broken = true;
    detach();
  });


  /* 3. FOLLOWING THE OPEN PROJECT (js/projects.js announces openings and closings) */
  document.addEventListener("project-open", function (event) {
    if (!broken) {
      attach(event.detail.project);
    }
  });
  document.addEventListener("project-close", function (event) {
    if (stage && event.detail.project.contains(stage)) {
      detach();
    }
  });
  // A project that was already open when this file started (a link like portfolio.html#vr2).
  const alreadyOpen = document.querySelector(".project.is-open");
  if (alreadyOpen) {
    attach(alreadyOpen);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      play();
    }
  });

  function attach(project) {
    detach();
    stage = project.querySelector(".project-stage");
    if (!stage) {
      return;
    }
    stage.querySelector(".project-visual").appendChild(canvas);
    stage.classList.add("has-glow");
    openedAt = performance.now();
    frozenTime = 40 + Math.random() * 40;
    hasChart = false;
    chartImage = stage.querySelector(".project-chart");
    if (chartImage) {
      // The picture may still be downloading (it loads only when a project first opens).
      const image = chartImage;
      const upload = function () {
        if (stage && chartImage === image) {
          uploadChart(image);
          draw(performance.now());
        }
      };
      if (image.complete && image.naturalWidth > 0) {
        upload();
      } else {
        image.addEventListener("load", upload, { once: true });
      }
    }
    watcher.observe(stage);
    resizer.observe(stage);
    play();
  }

  function detach() {
    running = false;
    if (stage) {
      watcher.unobserve(stage);
      resizer.unobserve(stage);
      stage.classList.remove("has-glow");
    }
    canvas.remove();
    stage = null;
    chartImage = null;
    hasChart = false;
  }

  function uploadChart(image) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // "Premultiplied" colors blur cleanly at the see-through edges of each shape.
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D); // the shrunken copies the glow is read from
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    hasChart = true;
  }


  /* 4. DRAWING */
  function moving() {
    return root.classList.contains("motion");
  }

  function play() {
    if (running || !stage || broken) {
      return;
    }
    if (!moving()) {
      draw(performance.now()); // reduce motion: one still picture
      return;
    }
    if (!visible || document.hidden) {
      return;
    }
    running = true;
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!running) {
      return;
    }
    if (!stage || !visible || document.hidden || !moving()) {
      running = false;
      if (stage) {
        draw(now); // leave a still picture behind
      }
      return;
    }
    draw(now);
    requestAnimationFrame(frame);
  }

  function draw(now) {
    if (!stage) {
      return;
    }
    // Match the drawing surface to its size on screen.
    const ratio = Math.min(window.devicePixelRatio || 1, phone.matches ? PHONE_PIXEL_RATIO : MAX_PIXEL_RATIO);
    const box = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(box.width * ratio));
    const height = Math.max(1, Math.round(box.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);

    // Where the chart sits inside the drawing surface (pixels, measured from the bottom left).
    let rect = [width * 0.15, height * 0.2, width * 0.7, height * 0.6]; // no chart: smoke in the middle
    if (chartImage) {
      const c = chartImage.getBoundingClientRect();
      rect = [
        (c.left - box.left) * ratio,
        (box.bottom - c.bottom) * ratio,
        c.width * ratio,
        c.height * ratio
      ];
    }

    // The stir eases in while the mouse is over the stage and fades out when it leaves.
    const over = pointer.x >= box.left && pointer.x <= box.right && pointer.y >= box.top && pointer.y <= box.bottom;
    pointer.stir += ((over && moving() ? 1 : 0) - pointer.stir) * 0.08;
    const mouseX = (pointer.x - box.left) * ratio;
    const mouseY = (box.bottom - pointer.y) * ratio;

    const seconds = moving() ? (now - openedAt) / 1000 : frozenTime;
    const reveal = moving() ? Math.min(1, (now - openedAt) / 1000 / FADE_IN_TIME) : 1;

    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u.uChart, 0);
    gl.uniform1f(u.uHasChart, hasChart ? 1 : 0);
    gl.uniform2f(u.uRes, width, height);
    gl.uniform4f(u.uRect, rect[0], rect[1], rect[2], rect[3]);
    gl.uniform1f(u.uTime, seconds * SMOKE_SPEED);
    gl.uniform1f(u.uReveal, reveal * reveal * (3 - 2 * reveal)); // eased
    gl.uniform1f(u.uSmoke, SMOKE_AMOUNT);
    gl.uniform1f(u.uReach, SMOKE_REACH);
    gl.uniform1f(u.uSwirl, SMOKE_SWIRL_SIZE);
    gl.uniform1f(u.uOpacity, CHART_OPACITY);
    gl.uniform1f(u.uWisps, EDGE_WISPS);
    gl.uniform1f(u.uGlow, EDGE_GLOW);
    gl.uniform3fv(u.uLight, hexToRgb(SMOKE_COLOR_LIGHT));
    gl.uniform3fv(u.uDeep, hexToRgb(SMOKE_COLOR_DEEP));
    gl.uniform1i(u.uDetail, phone.matches ? PHONE_SMOKE_DETAIL : SMOKE_DETAIL);
    gl.uniform3f(u.uMouse, mouseX, mouseY, pointer.stir * SMOKE_STIR);
    gl.uniform1f(u.uStirSize, SMOKE_STIR_SIZE);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3); // one big triangle that covers the whole surface
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function buildProgram(gl, vertexSource, fragmentSource) {
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("Project glow shader:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) {
    return null;
  }
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Project glow program:", gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}


/* 5. THE SHADER */

// Draws one triangle big enough to cover the whole surface (no shapes or buffers needed).
const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uChart;   // the chart picture (see-through background)
uniform float uHasChart;    // 1 = there is a chart, 0 = smoke only
uniform vec2 uRes;          // drawing size in pixels
uniform vec4 uRect;         // where the chart sits: x, y (from bottom left), width, height
uniform float uTime;        // drifting time
uniform float uReveal;      // 0 = invisible, 1 = fully faded in
uniform float uSmoke;       // SMOKE_AMOUNT
uniform float uReach;       // SMOKE_REACH
uniform float uSwirl;       // SMOKE_SWIRL_SIZE
uniform float uOpacity;     // CHART_OPACITY
uniform float uWisps;       // EDGE_WISPS
uniform float uGlow;        // EDGE_GLOW
uniform vec3 uLight;        // SMOKE_COLOR_LIGHT
uniform vec3 uDeep;         // SMOKE_COLOR_DEEP
uniform int uDetail;        // layers of swirl detail
uniform vec3 uMouse;        // the mouse (x, y in pixels from bottom left) and how hard it stirs
uniform float uStirSize;    // SMOKE_STIR_SIZE
out vec4 outColor;

// Smooth random "noise" (simplex noise): gentle hills and valleys between -1 and 1.
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float noise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m * m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 a0 = x - floor(x + 0.5);
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
  return 130.0 * dot(m, g);
}

// Layers of noise, each smaller and fainter than the last: the look of smoke and clouds.
float layers(vec2 p) {
  float total = 0.0;
  float strength = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= uDetail) break;
    total += strength * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    strength *= 0.5;
  }
  return total;
}

void main() {
  vec2 pixel = gl_FragCoord.xy;
  vec2 place = pixel / uRes;                  // 0 to 1 across the drawing
  float unit = min(uRes.x, uRes.y);
  vec2 p = pixel / unit * uSwirl;
  float t = uTime;

  // THE STIR: near the mouse, the smoke is pushed aside, leaving a soft clearing that follows it.
  vec2 fromMouse = (pixel - uMouse.xy) / unit;
  float stir = uMouse.z * exp(-dot(fromMouse, fromMouse) / (uStirSize * uStirSize));
  p += normalize(fromMouse + 1e-5) * stir * 0.6;

  // THE SMOKE: soft noise, gently bent by more noise ("domain warping") so it curls into wisps.
  vec2 bend = vec2(layers(p + vec2(0.0, t)), layers(p + vec2(5.2, -0.8 * t)));
  float swirl = layers(p * 1.3 + 1.1 * bend + vec2(1.7, 9.2) + 0.4 * t);
  float wisps = smoothstep(0.0, 0.75, swirl);          // thin bright strands
  float haze = smoothstep(-0.6, 0.6, layers(p * 0.6 - 0.3 * t)); // a broad soft mist

  // Where this pixel is on the chart (0 to 1 across it; the picture's top is 0).
  vec2 onChart = (pixel - uRect.xy) / uRect.zw;
  vec2 pictureSpot = vec2(onChart.x, 1.0 - onChart.y);
  bool insideChart = all(greaterThanEqual(onChart, vec2(0.0))) && all(lessThanEqual(onChart, vec2(1.0)));

  // How close this pixel is to the chart: 1 on it, fading away outside it.
  vec2 gap = max(max(uRect.xy - pixel, pixel - (uRect.xy + uRect.zw)), 0.0);
  float near = exp(-length(gap) / unit / uReach);

  // The smoke fades out before the edges of the drawing, so it never ends in a hard line.
  float edges = smoothstep(0.0, 0.14, min(place.x, 1.0 - place.x)) *
                smoothstep(0.0, 0.14, min(place.y, 1.0 - place.y));

  // How close it is to the chart's shapes, read from blurry shrunken copies of the picture.
  // The spot is nudged by the smoke, so the glow curls off the shapes in wisps.
  float closeToShapes = 0.0;
  vec3 glowColor = vec3(0.0);
  if (uHasChart > 0.5) {
    vec2 curl = (bend + vec2(swirl)) * 0.012 * uWisps;
    vec2 spot = pictureSpot + curl;
    // Past the chart's edges, fade the reading out softly. (Otherwise the edge row of pixels,
    // like a solid axis line, would smear outward as a band.)
    vec2 beyond = max(-spot, spot - 1.0);
    float within = 1.0 - smoothstep(0.0, 0.06, max(beyond.x, beyond.y));
    spot = clamp(spot, 0.0, 1.0);
    vec4 soft = textureLod(uChart, spot, 3.0) * within;
    vec4 softer = textureLod(uChart, spot, 5.5) * within;
    closeToShapes = clamp(soft.a * 1.3 + softer.a * 0.9, 0.0, 1.0) * near;
    glowColor = (soft.rgb / max(soft.a, 0.001)) * soft.a * (0.5 + 0.8 * wisps);
  }

  // The smoke: a faint mist around the chart, with brighter strands where it clings to the shapes.
  float density = (0.10 * haze + 0.30 * wisps) * near + 0.35 * wisps * closeToShapes;
  // Thinner where the mouse stirs it, with a faint bright rim of wisps around the clearing.
  density = (density * (1.0 - 0.7 * stir) + 0.12 * stir * wisps * near) * uSmoke * edges;
  vec3 smokeColor = mix(uDeep, uLight, clamp(wisps * 0.8 + closeToShapes * 0.5, 0.0, 1.0));

  // THE CHART: its shapes made solid (some charts come with faint, see-through marks).
  vec4 chart = vec4(0.0);
  if (uHasChart > 0.5 && insideChart) {
    vec4 texel = texture(uChart, pictureSpot);
    float solid = smoothstep(0.0, 0.6, texel.a);
    vec3 ink = texel.rgb / max(texel.a, 0.001);
    chart = vec4(ink * solid, solid) * uOpacity;
  }

  // A glow that hugs every bar, dot and line.
  vec3 glow = glowColor * uGlow * edges;

  // Stack them: smoke at the back, then the glow, then the chart on top.
  float behind = 1.0 - chart.a;
  vec3 color = (smokeColor * density + glow) * behind + chart.rgb;
  float alpha = clamp((density + dot(glow, vec3(0.4))) * behind + chart.a, 0.0, 1.0);
  outColor = vec4(color, alpha) * uReveal;
}`;


/* GO */
startGlow();
