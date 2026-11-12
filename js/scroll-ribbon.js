/* SCROLL-RIBBON.JS: A SPARK OF LIGHT THAT LEADS YOU DOWN THE PAGE
   Far behind the page, a warm amber spark leads the way as you scroll. It travels mostly down
   the side margins, curling into loops there, and now and then swoops across the page to the
   other side. Behind it trails a soft ribbon of light that cools from gold into pale blue,
   periwinkle and violet, then fades away. The spark sheds tiny embers, and keeps drifting gently
   even when you stop scrolling. The trail moves at only part of your scrolling speed
   ("parallax"), so it feels far away.

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

// Where the path mostly travels: how far from the middle its two lanes are (share of the screen
// width: 0.43 = in the side margins), and how often it swoops across to the other side (in screen
// heights of scrolling between crossings).
const RIBBON_LANE = 0.43;
const RIBBON_CROSSING_EVERY = 2.2;

// The loops: their size (share of the screen width), how much scrolling one turn takes (screen
// heights), and how often the path curls into a run of loops (screen heights between runs).
const RIBBON_LOOP_SIZE = 0.07;
const RIBBON_LOOP_TURN = 0.45;
const RIBBON_LOOP_EVERY = 1.3;

// Even when you're not scrolling, the spark keeps drifting along its path (pixels per second).
const RIBBON_IDLE_DRIFT = 18;

// The trail: how long it is (in screen heights of path behind the spark), how wide its soft glow
// is (pixels), and how bright it is overall (0 = invisible, 1 = full). Soft and dim = far away.
const RIBBON_TRAIL_LENGTH = 1.4;
const RIBBON_WIDTH = 34;
const RIBBON_BRIGHTNESS = 0.5;

// How strongly each of the trail's glowing dots shows (they overlap, so small numbers add up).
const RIBBON_GLOW_STRENGTH = 0.22;

// How many glowing dots make up the trail (more = smoother but more work; phones use fewer).
const RIBBON_DOTS = 420;
const RIBBON_PHONE_DOTS = 200;

// The trail's colors, from the spark back to the tail: gold, pale glowing blue, periwinkle,
// violet, deep indigo.
const RIBBON_COLORS = ["#ffcf7a", "#d8f4ff", "#7f9cff", "#8b5cff", "#4b3fd6"];

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
  // Soft dots in each of the trail's colors (no bright core, so they melt together).
  const tints = RIBBON_COLORS.map(function (hex) {
    const n = parseInt(hex.slice(1), 16);
    const rgb = ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
    return makeDot("rgba(" + rgb + ",1)", "rgba(" + rgb + ",0.7)");
  });
  function hash(i) {
    const x = Math.sin(i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

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
     The path runs down the whole page; "d" is how far along it is, in pixels of scrolling.
     - Its lane: which side margin it's in. A smoothed on/off switch holds it on one side for a
       long stretch, then flips quickly, so it crosses the middle in a brief swoop.
     - Its loops: it also circles around that lane. Where the circle is big, it swings back on
       itself and draws a loop; where the circle shrinks away, it flows straight. */
  // Each page starts with the trail settled in one margin (which one depends on the page), and
  // the crossings are quick swoops.
  const startSide = seed % 2 === 0 ? 1 : -1;
  function lane(d) {
    const wave = Math.cos(d / (height * RIBBON_CROSSING_EVERY) * Math.PI);
    return startSide * Math.tanh(wave * 6); // close to -1 (left) or +1 (right) most of the time
  }
  function loopSize(d) {
    const wave = Math.max(0, Math.sin(d / (height * RIBBON_LOOP_EVERY) * Math.PI * 2 + seed * 1.9));
    return wave * wave * width * RIBBON_LOOP_SIZE;
  }
  // Where a point of the path shows on screen. The spark rides near RIBBON_SPARK_HEIGHT; the rest
  // of the path is squeezed by RIBBON_DEPTH, so the trail moves slowly, far behind the page.
  function onScreen(d, sparkD) {
    const turn = d / (height * RIBBON_LOOP_TURN) * Math.PI * 2;
    const r = loopSize(d);
    return {
      x: width * (0.5 + RIBBON_LANE * lane(d)) + r * Math.cos(turn) + width * 0.015 * Math.sin(d / height * 2.3),
      y: height * RIBBON_SPARK_HEIGHT + (d - sparkD) * RIBBON_DEPTH + r * Math.sin(turn)
    };
  }

  let sparkAt = window.scrollY + height * RIBBON_SPARK_HEIGHT; // where the spark is along the path
  let drift = 0;                                                // the idle drift so far
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

    // The spark glides toward its spot (a little below the middle of what you're reading),
    // and keeps drifting gently along its path even when you stop scrolling.
    drift += RIBBON_IDLE_DRIFT * dt;
    const target = window.scrollY + height * RIBBON_SPARK_HEIGHT + drift;
    sparkAt += (target - sparkAt) * (1 - Math.pow(1 - RIBBON_GLIDE, dt * 60));
    const fade = RIBBON_BRIGHTNESS * (1 - quiet * 0.5);

    // THE TRAIL, drawn as many soft glowing dots overlapping like an airbrush: no hard edges, so no
    // seams on the curves, and the colors blend smoothly from gold to violet along it.
    const trailSpan = height * RIBBON_TRAIL_LENGTH / RIBBON_DEPTH;
    const dots = phone.matches ? RIBBON_PHONE_DOTS : RIBBON_DOTS;
    const glowSize = RIBBON_WIDTH * 1.7;
    const midSize = RIBBON_WIDTH * 0.55;
    const corePoints = [];
    for (let i = 0; i <= dots; i++) {
      const along = i / dots; // 0 = at the spark, 1 = the end of the tail
      const p = onScreen(sparkAt - along * trailSpan, sparkAt);
      corePoints.push(p);
      if (p.y < -glowSize || p.y > height + glowSize) {
        continue;
      }
      const strength = fade * Math.pow(1 - along, 1.2) * Math.min(1, along * 40 + 0.25);
      if (strength < 0.003) {
        continue;
      }
      // This dot's color from the gradient, with a little scatter so neighbors blend.
      const pos = Math.pow(along, 0.75) * (tints.length - 1) + (hash(i) - 0.5) * 0.9;
      const tint = tints[Math.max(0, Math.min(tints.length - 1, Math.round(pos)))];
      const taper = 0.45 + 0.55 * (1 - along);
      ctx.globalAlpha = strength * RIBBON_GLOW_STRENGTH;
      ctx.drawImage(tint, p.x - glowSize * taper / 2, p.y - glowSize * taper / 2, glowSize * taper, glowSize * taper);
      ctx.globalAlpha = strength * RIBBON_GLOW_STRENGTH * 1.6;
      ctx.drawImage(tint, p.x - midSize * taper / 2, p.y - midSize * taper / 2, midSize * taper, midSize * taper);
    }
    // The thin bright core: a few long continuous lines, each dimmer than the last.
    if (corePoints.length > 2) {
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const parts = 8;
      const per = Math.ceil(corePoints.length / parts);
      for (let k = 0; k < parts; k++) {
        const from = k * per;
        const to = Math.min(corePoints.length - 1, from + per);
        if (to <= from) {
          break;
        }
        ctx.globalAlpha = fade * 0.9 * Math.pow(1 - k / parts, 1.6);
        ctx.strokeStyle = k < 2 ? "#ffe2ad" : "#d8f4ff";
        // Smooth curves through the midpoints between points, so loops come out round.
        ctx.beginPath();
        ctx.moveTo(corePoints[from].x, corePoints[from].y);
        for (let j = from + 1; j < to; j++) {
          const mx = (corePoints[j].x + corePoints[j + 1].x) / 2;
          const my = (corePoints[j].y + corePoints[j + 1].y) / 2;
          ctx.quadraticCurveTo(corePoints[j].x, corePoints[j].y, mx, my);
        }
        ctx.lineTo(corePoints[to].x, corePoints[to].y);
        ctx.stroke();
      }
    }

    // THE SPARK: a warm glow that breathes, with a bright core.
    const spark = onScreen(sparkAt, sparkAt);
    const breathe = 1 + Math.sin(time * 2.4) * 0.12;
    const haloSize = SPARK_SIZE * 9 * breathe;
    ctx.globalAlpha = 0.5 * (1 - quiet * 0.4);
    ctx.drawImage(goldDot, spark.x - haloSize / 2, spark.y - haloSize / 2, haloSize, haloSize);
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

  resize();
  play();
}

startScrollRibbon();
