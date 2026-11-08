/* SCROLL-RIBBON.JS: A RIBBON OF LIGHT THAT FOLLOWS YOUR SCROLL
   Behind the page, a soft ribbon of blue, cyan and amber light changes shape as you scroll.
   Every screen or so of scrolling it moves on to its next "move": a big swoop, flying in from
   the side and curling into a loop, drifting apart into glowing motes and coming back together,
   diving down the screen, a low wave. A pulse of light runs along it as you scroll.

   On the Projects page, the same layer also fills the side margins beside the project list with
   drifting particles, faintly linked like a network. They part around the mouse, and dim while a
   project is open.

   It sits behind all the text (section backgrounds are made slightly see-through so it shows).
   It's decoration only: it never catches clicks and screen readers skip it. It pauses while the
   tab is hidden, is lighter on phones, and is off with "reduce motion".

   SECTIONS
   1. Settings
   2. Start
   3. The ribbon's moves
   4. The side particles (Projects page)
   5. Drawing */


/* 1. SETTINGS */

// true = the ribbon runs; false = off.
const RIBBON_ON = true;

// How much scrolling each move lasts (in screen heights: 1 = one full screen).
const RIBBON_MOVE_LENGTH = 1.1;

// How bright the ribbon is overall (0 = invisible, 1 = full). It sits behind text, so keep it soft.
const RIBBON_BRIGHTNESS = 0.55;

// The ribbon's thickness (pixels at its widest glow), and how fast it gently sways on its own.
const RIBBON_WIDTH = 34;
const RIBBON_SWAY_SPEED = 0.35;

// How far the light pulse travels along the ribbon per screen of scrolling.
const RIBBON_PULSE_SPEED = 1.4;

// The ribbon's colors: soft outer glow, bright middle, white-hot core, and the amber strand.
const RIBBON_COLORS = ["#2a5bd7", "#36cfff", "#e8fbff"];
const RIBBON_STRAND = "#ffb547";

// Side particles on the Projects page: how many on each side, how bright, how far they're linked
// (pixels; 0 = no lines), and how far the mouse pushes them (pixels).
const SIDE_PARTICLES = 70;
const SIDE_BRIGHTNESS = 0.7;
const SIDE_LINK_DISTANCE = 70;
const SIDE_MOUSE_PUSH = 90;

// Lighter on phones: fewer points along the ribbon, lower sharpness, no side particles.
const RIBBON_POINTS = 150;
const RIBBON_PHONE_POINTS = 70;
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
  root.classList.add("has-ribbon"); // style.css lets the ribbon show through section backgrounds

  const phone = window.matchMedia("(max-width: " + (RIBBON_PHONE_SCREEN - 1) + "px)");
  const projectList = document.querySelector(".project-index");
  let width = 0;
  let height = 0;
  let ratio = 1;
  let running = false;
  let stopped = false;
  let quiet = 0;          // eases to 1 while a project is open
  let openProjects = 0;
  const mouse = { x: -1e4, y: -1e4 };

  // A soft glowing dot, drawn once and stamped for each mote and particle.
  const dot = document.createElement("canvas");
  dot.width = dot.height = 32;
  const d = dot.getContext("2d");
  const g = d.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(232,251,255,1)");
  g.addColorStop(0.3, "rgba(54,207,255,0.7)");
  g.addColorStop(1, "rgba(54,207,255,0)");
  d.fillStyle = g;
  d.fillRect(0, 0, 32, 32);
  const amberDot = document.createElement("canvas");
  amberDot.width = amberDot.height = 32;
  const a = amberDot.getContext("2d");
  const ga = a.createRadialGradient(16, 16, 0, 16, 16, 16);
  ga.addColorStop(0, "rgba(255,240,210,1)");
  ga.addColorStop(0.3, "rgba(255,181,71,0.7)");
  ga.addColorStop(1, "rgba(255,181,71,0)");
  a.fillStyle = ga;
  a.fillRect(0, 0, 32, 32);

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, phone.matches ? 1 : RIBBON_PIXEL_RATIO);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    placeSideParticles();
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
        stopped = true;
        canvas.remove();
        root.classList.remove("has-ribbon");
      }
    });
  }


  /* 3. THE RIBBON'S MOVES
     Each move is a curve across the screen. "s" runs from 0 to 1 along the ribbon, "t" is time.
     x and y are shares of the screen (0 = left/top, 1 = right/bottom; a little past 0 or 1 means
     just off screen). "apart" = how much it breaks into motes (0 = a solid ribbon, 1 = scattered). */
  const MOVES = [
    { // a big swoop over the middle of the screen
      apart: 0,
      path: function (s, t) {
        return { x: -0.12 + s * 1.24, y: 0.8 - 0.55 * Math.sin(Math.PI * s) + 0.03 * Math.sin(t + s * 6) };
      }
    },
    { // flies in from the right and curls into a loop
      apart: 0,
      path: function (s, t) {
        const angle = s * Math.PI * 2.3 + t * 0.2;
        const radius = 0.06 + 0.3 * (1 - s);
        return {
          x: 0.58 + Math.cos(angle) * radius * 0.75 + (1 - s) * (1 - s) * 0.6,
          y: 0.48 + Math.sin(angle) * radius
        };
      }
    },
    { // drifts apart into glowing motes along a gentle wave
      apart: 1,
      path: function (s, t) {
        return { x: -0.1 + s * 1.2, y: 0.32 + 0.12 * Math.sin(s * Math.PI * 3 + t * 0.4) };
      }
    },
    { // dives down the screen
      apart: 0,
      path: function (s, t) {
        return { x: 0.12 + 0.75 * s + 0.05 * Math.sin(t + s * 5), y: -0.12 + 1.24 * s * s };
      }
    },
    { // a low wave along the bottom, slightly frayed
      apart: 0.35,
      path: function (s, t) {
        return { x: -0.1 + s * 1.2, y: 0.86 + 0.05 * Math.sin(s * Math.PI * 4 + t * 0.6) };
      }
    }
  ];

  function smooth(x) {
    return x * x * (3 - 2 * x);
  }

  // The ribbon right now: a list of points, blended between the current move and the next.
  function ribbonPoints(time) {
    const count = phone.matches ? RIBBON_PHONE_POINTS : RIBBON_POINTS;
    const progress = window.scrollY / (height * RIBBON_MOVE_LENGTH);
    const index = Math.floor(progress);
    const within = progress - index;
    const blend = smooth(Math.min(1, Math.max(0, (within - 0.35) / 0.65))); // hold, then morph
    const now = MOVES[index % MOVES.length];
    const next = MOVES[(index + 1) % MOVES.length];
    const t = time * RIBBON_SWAY_SPEED;
    const apart = now.apart + (next.apart - now.apart) * blend;
    const points = [];
    for (let i = 0; i < count; i++) {
      const s = i / (count - 1);
      const p1 = now.path(s, t);
      const p2 = next.path(s, t);
      let x = (p1.x + (p2.x - p1.x) * blend) * width;
      let y = (p1.y + (p2.y - p1.y) * blend) * height;
      if (apart > 0) {
        // Each mote wanders off on its own little current.
        x += Math.sin(i * 12.9898 + t * 1.3) * apart * width * 0.06;
        y += Math.cos(i * 78.233 + t * 1.1) * apart * height * 0.09;
      }
      points.push({ x: x, y: y, s: s });
    }
    return { points: points, apart: apart, pulse: window.scrollY / height * RIBBON_PULSE_SPEED };
  }


  /* 4. THE SIDE PARTICLES (Projects page) */
  const side = [];
  function placeSideParticles() {
    side.length = 0;
    if (!projectList || phone.matches) {
      return;
    }
    for (let i = 0; i < SIDE_PARTICLES * 2; i++) {
      side.push({
        left: i % 2 === 0,               // which margin
        across: Math.random(),           // where across the margin (0 = outer edge, 1 = by the list)
        down: Math.random(),             // where down the list (0 = top, 1 = bottom)
        drift: Math.random() * 1000,
        size: 3 + Math.random() * 5,
        amber: Math.random() < 0.05,
        pushX: 0,
        pushY: 0
      });
    }
  }

  function sidePositions(time) {
    const box = projectList.getBoundingClientRect();
    const out = [];
    side.forEach(function (p) {
      const margin = p.left ? box.left : width - box.right;
      const room = Math.max(40, margin - 12);
      const outer = p.left ? 0 : width;
      let x = p.left ? outer + p.across * room : outer - p.across * room;
      // Spread along the list's height, drifting slowly upward and swaying.
      let y = box.top + ((p.down - time * 0.004 + 10) % 1) * box.height;
      x += Math.sin(time * 0.6 + p.drift) * 8;
      y += Math.cos(time * 0.4 + p.drift) * 10;
      // The mouse pushes nearby particles aside; they ease back afterward.
      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < SIDE_MOUSE_PUSH && dist > 0) {
        const force = (1 - dist / SIDE_MOUSE_PUSH) * 26;
        p.pushX += (dx / dist * force - p.pushX) * 0.2;
        p.pushY += (dy / dist * force - p.pushY) * 0.2;
      } else {
        p.pushX *= 0.94;
        p.pushY *= 0.94;
      }
      x += p.pushX;
      y += p.pushY;
      if (y > -20 && y < height + 20) {
        out.push({ x: x, y: y, p: p });
      }
    });
    return out;
  }


  /* 5. DRAWING */
  function play() {
    if (running || stopped || document.hidden) {
      return;
    }
    running = true;
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (stopped || document.hidden) {
      running = false;
      return;
    }
    if (!root.classList.contains("motion")) {
      stopped = true;
      canvas.remove();
      root.classList.remove("has-ribbon");
      return;
    }
    const time = now / 1000;
    quiet += ((openProjects > 0 ? 1 : 0) - quiet) * 0.05;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";

    // The ribbon.
    const ribbon = ribbonPoints(time);
    const pts = ribbon.points;
    const solid = 1 - ribbon.apart;
    const fade = RIBBON_BRIGHTNESS * (1 - quiet * 0.45);
    if (solid > 0.02) {
      const passes = [
        { color: RIBBON_COLORS[0], width: RIBBON_WIDTH, alpha: 0.22 },
        { color: RIBBON_COLORS[1], width: RIBBON_WIDTH * 0.4, alpha: 0.32 },
        { color: RIBBON_COLORS[2], width: RIBBON_WIDTH * 0.08, alpha: 0.6 }
      ];
      ctx.lineCap = "butt"; // square ends, so the short pieces don't overlap into beads
      ctx.lineJoin = "round";
      passes.forEach(function (pass) {
        ctx.strokeStyle = pass.color;
        ctx.lineWidth = pass.width;
        // Drawn in short pieces so the light pulse can brighten parts of it.
        for (let i = 1; i < pts.length; i++) {
          const s = pts[i].s;
          const pulse = 0.55 + 0.45 * Math.cos((s * 2 - ribbon.pulse) * Math.PI * 2);
          const ends = Math.min(1, s * 6, (1 - s) * 6); // soft tapered ends
          ctx.globalAlpha = pass.alpha * pulse * ends * solid * fade;
          ctx.beginPath();
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
          ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        }
      });
      // The amber strand, winding around the ribbon.
      ctx.strokeStyle = RIBBON_STRAND;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const p = pts[i];
        const nx = -(p.y - prev.y);
        const ny = p.x - prev.x;
        const len = Math.hypot(nx, ny) || 1;
        const twist = Math.sin(p.s * Math.PI * 5 + time * 1.2) * RIBBON_WIDTH * 0.35;
        const x = p.x + nx / len * twist;
        const y = p.y + ny / len * twist;
        if (i === 1) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.globalAlpha = 0.35 * solid * fade;
      ctx.stroke();
    }
    // The motes, as the ribbon breaks apart (a few always shimmer along it).
    pts.forEach(function (p, i) {
      if (i % 2) {
        return;
      }
      const twinkle = 0.5 + 0.5 * Math.sin(time * 3 + i * 1.7);
      const alpha = (0.12 + ribbon.apart * 0.7) * twinkle * fade;
      if (alpha < 0.02) {
        return;
      }
      const size = 6 + ribbon.apart * 8;
      ctx.globalAlpha = alpha;
      ctx.drawImage(i % 23 === 0 ? amberDot : dot, p.x - size / 2, p.y - size / 2, size, size);
    });

    // The side particles and their faint links.
    if (projectList && side.length) {
      const spots = sidePositions(time);
      const bright = SIDE_BRIGHTNESS * (1 - quiet * 0.4);
      if (SIDE_LINK_DISTANCE > 0) {
        ctx.strokeStyle = RIBBON_COLORS[1];
        ctx.lineWidth = 1;
        for (let i = 0; i < spots.length; i++) {
          for (let j = i + 1; j < spots.length; j++) {
            if (spots[i].p.left !== spots[j].p.left) {
              continue;
            }
            const dist = Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y);
            if (dist < SIDE_LINK_DISTANCE) {
              ctx.globalAlpha = (1 - dist / SIDE_LINK_DISTANCE) * 0.18 * bright;
              ctx.beginPath();
              ctx.moveTo(spots[i].x, spots[i].y);
              ctx.lineTo(spots[j].x, spots[j].y);
              ctx.stroke();
            }
          }
        }
      }
      spots.forEach(function (spot) {
        const p = spot.p;
        const twinkle = 0.6 + 0.4 * Math.sin(time * 2 + p.drift);
        ctx.globalAlpha = twinkle * bright;
        ctx.drawImage(p.amber ? amberDot : dot, spot.x - p.size / 2, spot.y - p.size / 2, p.size, p.size);
      });
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  resize();
  play();
}

startScrollRibbon();
