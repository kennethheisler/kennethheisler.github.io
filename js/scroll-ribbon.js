/* SCROLL-RIBBON.JS: A SPARK OF LIGHT THAT LEADS YOU DOWN THE PAGE
   Far behind the page, a warm amber spark glides along a long, gentle path as you scroll,
   leading the way. Behind it trails a soft ribbon of light that cools from gold into pale
   blue, periwinkle and violet, then fades away. The spark sheds tiny embers as it goes.
   The trail moves at only part of your scrolling speed ("parallax"), so it feels far away.

   Around the edges of the screen, a light dust of violet-blue wisps and a few golden embers
   drifts and dances, like the home page's particles spilling over onto the other pages.
   On the Projects page, both go quieter while a project is open.

   It sits behind all the text (section backgrounds are slightly see-through so it shows).
   Decoration only: it never catches clicks and screen readers skip it. It pauses while the
   tab is hidden, is lighter on phones, and is off with "reduce motion".

   SECTIONS
   1. Settings
   2. Start
   3. The path and the spark
   4. The edge dust
   5. Drawing */


/* 1. SETTINGS */

// true = the spark, its trail and the edge dust run; false = off.
const RIBBON_ON = true;

// How far away the trail feels: the share of your scrolling speed it moves at (1 = with the page,
// 0.5 = half speed, far behind; smaller = further away).
const RIBBON_DEPTH = 0.5;

// Where the spark rides on the screen, from the top (0 = top, 1 = bottom).
const RIBBON_SPARK_HEIGHT = 0.6;

// How smoothly the spark catches up with your scrolling (smaller = a slower, more graceful glide).
const RIBBON_GLIDE = 0.05;

// How wide the path sweeps from side to side (share of the screen width), and how far down the
// page each sweep lasts (in screen heights).
const RIBBON_SWEEP = 0.34;
const RIBBON_SWEEP_LENGTH = 1.6;

// The trail: how long it is (in screen heights of path behind the spark), how wide its soft glow
// is (pixels), and how bright it is overall (0 = invisible, 1 = full). Soft and dim = far away.
const RIBBON_TRAIL_LENGTH = 1.5;
const RIBBON_WIDTH = 30;
const RIBBON_BRIGHTNESS = 0.42;

// The trail's colors, from the spark back to the tail: gold, pale glowing blue, periwinkle,
// violet, deep indigo.
const RIBBON_COLORS = ["#ffcf7a", "#d8f4ff", "#7f9cff", "#8b5cff", "#4b3fd6"];

// The soft violet haze around the whole trail.
const RIBBON_HALO = "#6a4cff";

// The spark: its size (pixels), and how many embers it sheds per second.
const SPARK_SIZE = 9;
const SPARK_EMBERS = 6;

// The edge dust: how many motes, how far in from the edges they mostly stay (share of the
// screen width), how bright they are, and the share that are golden embers.
const DUST_COUNT = 70;
const DUST_EDGE = 0.16;
const DUST_BRIGHTNESS = 0.55;
const DUST_EMBER_SHARE = 0.12;

// Lighter on phones: fewer motes and lower sharpness.
const DUST_PHONE_COUNT = 28;
const RIBBON_PIXEL_RATIO = 1.5;
const RIBBON_PHONE_SCREEN = 900;


/* 2. START */
function startScrollRibbon() {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!RIBBON_ON || !root.classList.contains("motion") || reduceMotion.matches) {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.className = "scroll-ribbon";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  document.body.insertBefore(canvas, document.body.firstChild);
  root.classList.add("has-ribbon"); // style.css lets it show through section backgrounds

  const phone = window.matchMedia("(max-width: " + (RIBBON_PHONE_SCREEN - 1) + "px)");
  let width = 0;
  let height = 0;
  let ratio = 1;
  let running = false;
  let stopped = false;
  let quiet = 0;          // eases to 1 while a project is open
  let openProjects = 0;
  let lastScroll = window.scrollY;
  const mouse = { x: -1e4, y: -1e4 };

  // Every page gets its own path (seeded from its address), so each one is its own journey.
  let seed = 0;
  for (const ch of location.pathname) {
    seed = (seed * 31 + ch.charCodeAt(0)) % 1000;
  }

  // Soft glowing dots, drawn once and stamped for the spark, embers and dust.
  function makeDot(inner, outer) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const d = c.getContext("2d");
    const g = d.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, inner);
    g.addColorStop(0.25, outer);
    g.addColorStop(1, "rgba(0,0,0,0)");
    d.fillStyle = g;
    d.fillRect(0, 0, 64, 64);
    return c;
  }
  const goldDot = makeDot("rgba(255,246,220,1)", "rgba(255,181,71,0.55)");
  const blueDot = makeDot("rgba(216,244,255,1)", "rgba(127,156,255,0.45)");
  const violetDot = makeDot("rgba(230,220,255,1)", "rgba(139,92,255,0.45)");

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, phone.matches ? 1 : RIBBON_PIXEL_RATIO);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    placeDust();
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  }, { passive: true });
  document.addEventListener("project-open", function () {
    openProjects += 1;
  });
  document.addEventListener("project-close", function () {
    openProjects = Math.max(0, openProjects - 1);
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      play();
    }
  });
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", function () {
      if (reduceMotion.matches) {
        stop();
      }
    });
  }

  function stop() {
    stopped = true;
    canvas.remove();
    root.classList.remove("has-ribbon");
  }


  /* 3. THE PATH AND THE SPARK
     The path runs down the whole page. "distance" is measured in pixels of page height.
     Its side-to-side position is a mix of two slow waves, so it sweeps gracefully and never zigzags. */
  function pathX(distance) {
    const u = distance / (height * RIBBON_SWEEP_LENGTH);
    const wave = Math.sin(u * Math.PI * 2 + seed) * 0.75 + Math.sin(u * Math.PI * 0.9 + seed * 1.7) * 0.25;
    return width * (0.5 + RIBBON_SWEEP * wave);
  }

  let sparkAt = window.scrollY + height * RIBBON_SPARK_HEIGHT; // where the spark is along the path
  const embers = [];


  /* 4. THE EDGE DUST */
  const dust = [];
  function placeDust() {
    dust.length = 0;
    const count = phone.matches ? DUST_PHONE_COUNT : DUST_COUNT;
    for (let i = 0; i < count; i++) {
      dust.push(newMote(Math.random() * height));
    }
  }

  function newMote(y) {
    // Mostly near the left or right edge; now and then one strays a little further in.
    const fromEdge = Math.pow(Math.random(), 1.8) * DUST_EDGE * (Math.random() < 0.15 ? 2 : 1);
    const left = Math.random() < 0.5;
    const ember = Math.random() < DUST_EMBER_SHARE;
    return {
      x: (left ? fromEdge : 1 - fromEdge) * width,
      y: y,
      ember: ember,
      violet: !ember && Math.random() < 0.45,
      size: (ember ? 3 : 4) + Math.random() * (ember ? 4 : 7),
      // Embers rise; wisps drift slowly down, like dust falling through the cracks.
      fall: ember ? -(8 + Math.random() * 14) : 4 + Math.random() * 10,
      phase: Math.random() * 1000,
      pushX: 0,
      pushY: 0
    };
  }


  /* 5. DRAWING */
  function play() {
    if (running || stopped || document.hidden) {
      return;
    }
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  let lastTime = performance.now();
  function frame(now) {
    if (stopped || document.hidden) {
      running = false;
      return;
    }
    if (!root.classList.contains("motion")) {
      stop();
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;
    const time = now / 1000;
    quiet += ((openProjects > 0 ? 1 : 0) - quiet) * 0.05;
    const scrolled = window.scrollY - lastScroll;
    lastScroll = window.scrollY;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    // The spark glides toward its spot (a little below the middle of what you're reading).
    const target = window.scrollY + height * RIBBON_SPARK_HEIGHT;
    sparkAt += (target - sparkAt) * (1 - Math.pow(1 - RIBBON_GLIDE, dt * 60));
    const fade = RIBBON_BRIGHTNESS * (1 - quiet * 0.5);
    const sway = Math.sin(time * 0.6) * 10;

    // Where a point of the path shows on screen: the spark rides at RIBBON_SPARK_HEIGHT, and the
    // path behind it is squeezed by RIBBON_DEPTH, so it trails slowly, far behind the page.
    function onScreen(distance) {
      return {
        x: pathX(distance) + sway * Math.sin(distance * 0.002),
        y: height * RIBBON_SPARK_HEIGHT + (distance - sparkAt) * RIBBON_DEPTH
      };
    }

    // THE TRAIL: soft, wide and dim at the back; a thin brighter core near the spark.
    const trailLength = height * RIBBON_TRAIL_LENGTH / RIBBON_DEPTH;
    const pieces = phone.matches ? 60 : 110;
    const points = [];
    for (let i = 0; i <= pieces; i++) {
      const along = i / pieces; // 0 = at the spark, 1 = the end of the tail
      points.push({ p: onScreen(sparkAt - along * trailLength), along: along });
    }
    // The wide outer haze is always violet (the mythical glow around the whole trail); the inner
    // passes cool from gold to blue along the trail.
    const passes = [
      { width: RIBBON_WIDTH * 1.6, alpha: 0.1, halo: true },
      { width: RIBBON_WIDTH, alpha: 0.13 },
      { width: RIBBON_WIDTH * 0.45, alpha: 0.2 },
      { width: RIBBON_WIDTH * 0.12, alpha: 0.45 }
    ];
    ctx.lineCap = "butt";
    passes.forEach(function (pass) {
      ctx.lineWidth = pass.width;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        const along = b.along;
        ctx.strokeStyle = pass.halo ? RIBBON_HALO : trailColor(along);
        // Bright near the spark, fading out along the tail; the tail also thins.
        const tail = pass.halo ? Math.pow(1 - along, 0.8) : Math.pow(1 - along, 1.15);
        ctx.globalAlpha = pass.alpha * fade * tail * Math.min(1, along * 30 + 0.3);
        ctx.lineWidth = pass.width * (0.35 + 0.65 * (1 - along));
        ctx.beginPath();
        ctx.moveTo(a.p.x, a.p.y);
        ctx.lineTo(b.p.x, b.p.y);
        ctx.stroke();
      }
    });

    // THE SPARK: a warm glow that breathes, with a bright core.
    const spark = onScreen(sparkAt);
    const breathe = 1 + Math.sin(time * 2.4) * 0.12;
    const glowSize = SPARK_SIZE * 9 * breathe;
    ctx.globalAlpha = 0.5 * (1 - quiet * 0.4);
    ctx.drawImage(goldDot, spark.x - glowSize / 2, spark.y - glowSize / 2, glowSize, glowSize);
    const coreSize = SPARK_SIZE * 2.4;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(goldDot, spark.x - coreSize / 2, spark.y - coreSize / 2, coreSize, coreSize);

    // EMBERS shed by the spark: they drift off, sink a little and fade.
    if (Math.random() < SPARK_EMBERS * dt * (1 + Math.min(3, Math.abs(scrolled) * 0.05))) {
      embers.push({
        x: spark.x, y: spark.y,
        vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.2) * 30,
        life: 1.2 + Math.random() * 1.2, age: 0, size: 3 + Math.random() * 4
      });
    }
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i];
      e.age += dt;
      if (e.age > e.life) {
        embers.splice(i, 1);
        continue;
      }
      e.vx *= 0.98;
      e.vy += 12 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt - scrolled * RIBBON_DEPTH;
      ctx.globalAlpha = (1 - e.age / e.life) * 0.8;
      ctx.drawImage(goldDot, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }

    // THE EDGE DUST: dancing on a gentle swirl, nudged by your scrolling, parting around the mouse.
    const dustFade = DUST_BRIGHTNESS * (1 - quiet * 0.4);
    dust.forEach(function (m, i) {
      m.y += m.fall * dt - scrolled * 0.25;
      m.x += Math.sin(time * 0.7 + m.phase) * 14 * dt + Math.cos(time * 0.31 + m.phase * 2) * 6 * dt;
      const dx = m.x - mouse.x;
      const dy = m.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 90 && dist > 0) {
        m.pushX += (dx / dist * (1 - dist / 90) * 30 - m.pushX) * 0.15;
        m.pushY += (dy / dist * (1 - dist / 90) * 30 - m.pushY) * 0.15;
      } else {
        m.pushX *= 0.95;
        m.pushY *= 0.95;
      }
      // Drifted off the top or bottom: come back in from the other end.
      if (m.y > height + 20) {
        dust[i] = newMote(-20);
        return;
      }
      if (m.y < -20) {
        dust[i] = newMote(height + 20);
        return;
      }
      const twinkle = 0.55 + 0.45 * Math.sin(time * (m.ember ? 3 : 1.6) + m.phase);
      ctx.globalAlpha = twinkle * dustFade * (m.ember ? 1 : 0.8);
      const img = m.ember ? goldDot : (m.violet ? violetDot : blueDot);
      ctx.drawImage(img, m.x + m.pushX - m.size / 2, m.y + m.pushY - m.size / 2, m.size, m.size);
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  // The trail's color at a point along it: gold at the spark, cooling to violet and indigo.
  const stops = RIBBON_COLORS.map(function (hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  function trailColor(along) {
    const pos = Math.min(0.999, Math.pow(along, 0.7)) * (stops.length - 1);
    const i = Math.floor(pos);
    const f = pos - i;
    const a = stops[i];
    const b = stops[i + 1];
    return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * f) + "," +
      Math.round(a[1] + (b[1] - a[1]) * f) + "," + Math.round(a[2] + (b[2] - a[2]) * f) + ")";
  }

  resize();
  play();
}

startScrollRibbon();
