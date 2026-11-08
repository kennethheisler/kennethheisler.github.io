/* CURSOR-PARTICLES.JS: GLOWING PARTICLES THAT FOLLOW THE MOUSE
   The same glowing "data dust" as the home page's particle scene, following your mouse:
   - Moving the mouse leaves a short trail of glowing particles that drift and fade.
   - Clicking sends out a small burst.
   - On the Projects page, opening a project pulls a stream of particles from where you clicked
     into its chart, where they dissolve into the smoke. While a project is open, the particles
     go into "quiet mode": fewer, smaller and dimmer, so the open project stays the focus.

   It's decoration only: it never catches clicks, and screen readers skip it. It runs only with a
   mouse or trackpad and with motion on, stops if "reduce motion" is switched on mid-visit, pauses
   when nothing is moving, and draws nothing while the tab is hidden.

   SECTIONS
   1. Settings
   2. Start
   3. Making particles (trail, burst, stream)
   4. Moving and drawing them */


/* 1. SETTINGS */

// true = particles follow the mouse; false = off.
const CURSOR_PARTICLES_ON = true;

// The trail: how many particles per 10 pixels of mouse travel (0 = none, 1 = normal, 2 = dense),
// how long each one lives (seconds), its size (pixels), how far from the cursor they appear (pixels),
// and how much they float about as they fade (pixels per second).
const TRAIL_AMOUNT = 1.4;
const TRAIL_LIFE = 1.1;
const TRAIL_SIZE = 2.8;
const TRAIL_SPREAD = 6;
const TRAIL_DRIFT = 18;

// The click burst: how many particles, how fast they fly out (pixels per second), and how long they live.
const CLICK_BURST = 40;
const CLICK_SPEED = 320;
const CLICK_LIFE = 1.3;

// The particles' colors: mostly cyan, with a rare amber one (like the "insights" in the home scene).
const PARTICLE_COLORS = ["#36cfff", "#9fe6ff", "#5ad8ff"];
const INSIGHT_COLOR = "#ffb547";
const INSIGHT_SHARE = 0.04;

// Quiet mode while a project is open: amounts are multiplied by these (1 = no change).
const QUIET_AMOUNT = 0.5;
const QUIET_BRIGHTNESS = 0.7;
const QUIET_SIZE = 0.85;
const QUIET_BURST = 0.45;
const QUIET_FADE_TIME = 0.8; // seconds to ease into and out of quiet mode

// Opening a project: how many particles stream into its chart, and roughly how long it takes (seconds).
const OPEN_STREAM = 70;
const OPEN_STREAM_TIME = 1.2;

// On the home page the particle scene already reacts to the mouse, so the trail is lighter there.
const HOME_AMOUNT = 0.5;

// Limits that keep it smooth: the most particles at once, and sharpness on high-resolution screens.
const MAX_PARTICLES = 700;
const PARTICLE_PIXEL_RATIO = 2;


/* 2. START */
function startCursorParticles() {
  const root = document.documentElement;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!CURSOR_PARTICLES_ON || !root.classList.contains("motion") || !finePointer.matches || reduceMotion.matches) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.className = "cursor-particles";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  document.body.appendChild(canvas);

  // One soft glowing dot, drawn once and then stamped for every particle (much faster than
  // drawing a fresh glow each time).
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = 64;
  const s = sprite.getContext("2d");
  const glow = s.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.22, "rgba(255,255,255,0.85)");
  glow.addColorStop(0.5, "rgba(255,255,255,0.22)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  s.fillStyle = glow;
  s.fillRect(0, 0, 64, 64);
  // A tinted copy of the dot for each color.
  const tinted = {};
  PARTICLE_COLORS.concat([INSIGHT_COLOR]).forEach(function (color) {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const t = c.getContext("2d");
    t.drawImage(sprite, 0, 0);
    t.globalCompositeOperation = "source-in";
    t.fillStyle = color;
    t.fillRect(0, 0, 64, 64);
    tinted[color] = c;
  });

  const particles = [];
  const mouse = { x: 0, y: 0, known: false, lastDown: { x: 0, y: 0, time: -1e9 } };
  const homePage = document.body.classList.contains("page-home");
  let openProjects = 0;   // how many projects are open (quiet mode when more than 0)
  let quiet = 0;          // 0 = normal, 1 = fully quiet (eases between the two)
  let travel = 0;         // mouse travel not yet turned into trail particles
  let running = false;
  let lastTime = 0;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let stopped = false;

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, PARTICLE_PIXEL_RATIO);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  resize();

  const listeners = [];
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(function () {
      target.removeEventListener(type, handler, options);
    });
  }

  listen(window, "resize", resize);
  listen(window, "pointermove", onMove, { passive: true });
  listen(window, "pointerdown", onDown, { passive: true });
  listen(document, "visibilitychange", function () {
    if (document.hidden) {
      particles.length = 0;
    }
  });
  listen(document, "project-open", function (event) {
    openProjects += 1;
    streamInto(event.detail.project);
    play();
  });
  listen(document, "project-close", function () {
    openProjects = Math.max(0, openProjects - 1);
    play();
  });

  // "Reduce motion" switched on mid-visit, or js/motion.js turned motion off: stop for good.
  function stop() {
    if (stopped) {
      return;
    }
    stopped = true;
    running = false;
    listeners.forEach(function (undo) {
      undo();
    });
    canvas.remove();
  }
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", function () {
      if (reduceMotion.matches) {
        stop();
      }
    });
  }


  /* 3. MAKING PARTICLES */

  // Picks a color: mostly cyan, now and then amber.
  function pickColor() {
    if (Math.random() < INSIGHT_SHARE) {
      return INSIGHT_COLOR;
    }
    return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
  }

  function add(p) {
    if (particles.length >= MAX_PARTICLES) {
      particles.shift(); // the oldest one makes room
    }
    p.age = p.age || 0;
    p.color = p.color || pickColor();
    p.seed = Math.random() * 1000;
    particles.push(p);
  }

  function amount() {
    return (homePage ? HOME_AMOUNT : 1) * (1 - quiet * (1 - QUIET_AMOUNT));
  }

  // The trail: particles spread along the path the mouse just traveled.
  function onMove(event) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
      return;
    }
    if (!root.classList.contains("motion")) {
      stop();
      return;
    }
    const x = event.clientX;
    const y = event.clientY;
    if (!mouse.known) {
      mouse.x = x;
      mouse.y = y;
      mouse.known = true;
      return;
    }
    const dx = x - mouse.x;
    const dy = y - mouse.y;
    const distance = Math.hypot(dx, dy);
    travel += distance * TRAIL_AMOUNT * amount() / 10;
    const count = Math.floor(travel);
    travel -= count;
    for (let i = 0; i < count; i++) {
      const along = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * TRAIL_SPREAD;
      add({
        kind: "trail",
        x: mouse.x + dx * along + Math.cos(angle) * spread,
        y: mouse.y + dy * along + Math.sin(angle) * spread,
        // a little of the mouse's own movement, plus a gentle random drift
        vx: dx * 1.5 + Math.cos(angle) * TRAIL_DRIFT,
        vy: dy * 1.5 + Math.sin(angle) * TRAIL_DRIFT,
        life: TRAIL_LIFE * (0.6 + Math.random() * 0.6),
        size: TRAIL_SIZE * (0.6 + Math.random() * 0.8)
      });
    }
    mouse.x = x;
    mouse.y = y;
    if (count > 0) {
      play();
    }
  }

  // The click burst: particles fly out in a ring and slow down as they fade.
  function onDown(event) {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
      return;
    }
    mouse.lastDown = { x: event.clientX, y: event.clientY, time: performance.now() };
    const count = Math.round(CLICK_BURST * (1 - quiet * (1 - QUIET_BURST)));
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = CLICK_SPEED * (0.35 + Math.random() * 0.75);
      add({
        kind: "burst",
        x: event.clientX,
        y: event.clientY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: CLICK_LIFE * (0.6 + Math.random() * 0.6),
        size: TRAIL_SIZE * (0.7 + Math.random() * 1.1)
      });
    }
    play();
  }

  // Opening a project: a stream of particles from where you clicked flows into its chart and
  // dissolves there, as if feeding the smoke.
  function streamInto(project) {
    const target = project.querySelector(".project-chart") || project.querySelector(".project-visual");
    if (!target) {
      return;
    }
    const recent = performance.now() - mouse.lastDown.time < 1500;
    const row = project.querySelector(".project-row").getBoundingClientRect();
    const fromX = recent ? mouse.lastDown.x : row.left + row.width / 2;
    const fromY = recent ? mouse.lastDown.y : row.top + row.height / 2;
    for (let i = 0; i < OPEN_STREAM; i++) {
      const angle = Math.random() * Math.PI * 2;
      add({
        kind: "stream",
        x: fromX + Math.cos(angle) * 10,
        y: fromY + Math.sin(angle) * 10,
        vx: Math.cos(angle) * 120,
        vy: Math.sin(angle) * 120 - 60,
        target: target,
        // each particle aims for its own spot on the chart (as a share of its width and height)
        tx: 0.1 + Math.random() * 0.8,
        ty: 0.15 + Math.random() * 0.7,
        delay: Math.random() * OPEN_STREAM_TIME * 0.45,
        life: OPEN_STREAM_TIME * 1.6,
        size: TRAIL_SIZE * (0.8 + Math.random() * 0.9)
      });
    }
  }


  /* 4. MOVING AND DRAWING THEM */
  function play() {
    if (running || stopped || document.hidden) {
      return;
    }
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!running) {
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;
    const time = now / 1000;

    // Ease into or out of quiet mode.
    const quietGoal = openProjects > 0 ? 1 : 0;
    quiet += (quietGoal - quiet) * Math.min(1, dt / QUIET_FADE_TIME * 3);

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter"; // overlapping light adds up, like real glow

    const brightness = 1 - quiet * (1 - QUIET_BRIGHTNESS);
    const sizeScale = 1 - quiet * (1 - QUIET_SIZE);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        particles.splice(i, 1);
        continue;
      }

      let fade;
      if (p.kind === "stream") {
        // Steer toward its spot on the chart (which may be gliding up the page), like a spring.
        const box = p.target.getBoundingClientRect();
        const gx = box.left + box.width * p.tx;
        const gy = box.top + box.height * p.ty;
        p.vx += ((gx - p.x) * 14 - p.vx * 4.5) * dt;
        p.vy += ((gy - p.y) * 14 - p.vy * 4.5) * dt;
        // Bright on the way, dissolving as it arrives.
        fade = Math.min(1, t * 6) * (1 - Math.pow(t, 2.5));
      } else {
        // Slow down, and drift on a gentle swirling current.
        const drag = p.kind === "burst" ? 3.2 : 2.4;
        p.vx -= p.vx * drag * dt;
        p.vy -= p.vy * drag * dt;
        p.vx += Math.sin(p.y * 0.012 + time * 0.9 + p.seed) * 22 * dt;
        p.vy += Math.cos(p.x * 0.012 + time * 0.7 + p.seed) * 22 * dt - 6 * dt;
        fade = (1 - t) * (1 - t);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const size = p.size * sizeScale * (p.kind === "stream" ? 1 : 0.6 + 0.4 * (1 - t)) * 4;
      ctx.globalAlpha = Math.max(0, fade * brightness * 0.9);
      ctx.drawImage(tinted[p.color], p.x - size / 2, p.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;

    if (particles.length === 0 && Math.abs(quiet - quietGoal) < 0.01) {
      running = false; // nothing left to draw: rest until the mouse moves again
      ctx.clearRect(0, 0, width, height);
      return;
    }
    requestAnimationFrame(frame);
  }
}

startCursorParticles();
