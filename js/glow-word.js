/* GLOW-WORD.JS: A GIANT OUTLINED WORD LIT BY A RIBBON OF LIGHT
   A huge word (like EXPERIENCE on the About page) drawn as a thin, faint outline. A ribbon of
   blue, cyan and amber light trails behind your mouse as you move over it, and wherever the
   ribbon crosses the letters, their outlines light up (with a faint glow inside the letters).
   When the mouse isn't over it, the ribbon drifts across on its own so the word never sits dead.

   Use it anywhere with: <div class="glow-word" data-word="YOUR WORD" aria-hidden="true"></div>
   (aria-hidden: it's decoration; keep a real heading nearby for screen readers and search).
   It only draws while it's on screen and the tab is visible. With "reduce motion" on, it shows
   one still frame. Without JavaScript, CSS shows the word as a plain outline instead.

   SECTIONS
   1. Settings
   2. Start
   3. The ribbon (following the mouse, or drifting on its own)
   4. Drawing */


/* 1. SETTINGS */

// How long the ribbon's tail lasts (seconds): longer = a longer, lazier ribbon.
const GLOW_WORD_TAIL = 1.1;

// How quickly the ribbon's head catches up with the mouse (share of the gap closed each frame).
const GLOW_WORD_FOLLOW = 0.18;

// The ribbon's width (as a share of the word's height), and how bright the lit outline gets (0-1).
const GLOW_WORD_RIBBON_WIDTH = 0.38;
const GLOW_WORD_BRIGHTNESS = 1;

// The faint outline you see when nothing is lighting it (0 = invisible, 0.2 = clearly visible),
// and the glow inside the letters where the ribbon passes (0 = none).
const GLOW_WORD_BASE_OUTLINE = 0.09;
const GLOW_WORD_INNER_GLOW = 0.16;

// The ribbon's colors, from its soft outer edge to its bright core, plus the amber strand.
const GLOW_WORD_COLORS = ["#1d3fbf", "#36cfff", "#e8fbff"];
const GLOW_WORD_STRAND = "#ffb547";

// Seconds for one drift across the word when the mouse isn't on it.
const GLOW_WORD_DRIFT_TIME = 7;

// Sharpness on high-resolution screens (capped to keep things smooth).
const GLOW_WORD_PIXEL_RATIO = 2;


/* 2. START */
function startGlowWords() {
  const holders = document.querySelectorAll(".glow-word[data-word]");
  if (!holders.length) {
    return;
  }
  const fontsReady = document.fonts && document.fonts.load ?
    document.fonts.load("300 100px Geist").catch(function () {}) : Promise.resolve();
  fontsReady.then(function () {
    holders.forEach(setUpWord);
  });
}

function setUpWord(holder) {
  const root = document.documentElement;
  const word = holder.dataset.word;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const ribbon = document.createElement("canvas"); // the ribbon is drawn here first, then cut to the letters
  const rctx = ribbon.getContext("2d");
  if (!ctx || !rctx) {
    return;
  }
  holder.appendChild(canvas);
  holder.classList.add("is-drawn"); // style.css hides its plain CSS fallback outline

  let width = 0;
  let height = 0;
  let ratio = 1;
  let fontSize = 100;
  let visible = false;
  let running = false;
  const trail = [];                 // recent positions of the ribbon's head: { x, y, time }
  const head = { x: -1e4, y: 0 };
  const mouse = { x: 0, y: 0, over: false, lastMove: -1e9 };


  /* Sizing: the word fills the holder's width. */
  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, GLOW_WORD_PIXEL_RATIO);
    width = holder.clientWidth;
    ctx.font = "300 100px Geist, system-ui, sans-serif";
    const measured = ctx.measureText(word).width || 600;
    fontSize = Math.floor(100 * width / measured * 0.98);
    height = Math.ceil(fontSize * 0.9);
    holder.style.height = height + "px";
    [canvas, ribbon].forEach(function (c) {
      c.width = Math.round(width * ratio);
      c.height = Math.round(height * ratio);
    });
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    draw(performance.now());
  }

  function setFont(context) {
    context.font = "300 " + fontSize + "px Geist, system-ui, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
  }

  function textY() {
    return height * 0.86; // the baseline: capitals sit just inside the box
  }


  /* 3. THE RIBBON */
  holder.addEventListener("pointermove", function (event) {
    const box = holder.getBoundingClientRect();
    mouse.x = event.clientX - box.left;
    mouse.y = event.clientY - box.top;
    mouse.over = true;
    mouse.lastMove = performance.now();
    play();
  });
  holder.addEventListener("pointerleave", function () {
    mouse.over = false;
  });

  // Where the ribbon's head is heading: the mouse, or a slow drifting path across the word.
  function goal(time) {
    const mouseRecent = mouse.over && time - mouse.lastMove < 2500;
    if (mouseRecent) {
      return { x: mouse.x, y: mouse.y };
    }
    const t = time / 1000 / GLOW_WORD_DRIFT_TIME;
    const phase = t % 1;
    return {
      x: -0.1 * width + phase * width * 1.2,
      y: height * (0.5 + 0.28 * Math.sin(t * Math.PI * 2 * 1.7) + 0.12 * Math.sin(t * 9.1))
    };
  }

  function step(time, dt) {
    const g = goal(time);
    // A big jump (the drift wrapping around): start the ribbon fresh rather than sweeping back.
    if (Math.abs(g.x - head.x) > width * 0.5) {
      head.x = g.x;
      head.y = g.y;
      trail.length = 0;
    }
    const follow = 1 - Math.pow(1 - GLOW_WORD_FOLLOW, dt * 60);
    head.x += (g.x - head.x) * follow;
    head.y += (g.y - head.y) * follow;
    trail.push({ x: head.x, y: head.y, time: time });
    while (trail.length && time - trail[0].time > GLOW_WORD_TAIL * 1000) {
      trail.shift();
    }
  }


  /* 4. DRAWING */
  function draw(time) {
    const scale = ratio;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // The faint outline that's always there.
    setFont(ctx);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(223, 231, 242, " + GLOW_WORD_BASE_OUTLINE + ")";
    ctx.strokeText(word, width / 2, textY());

    if (trail.length < 2) {
      return;
    }

    // The ribbon: soft wide blue, then cyan, then a bright core, plus a thin amber strand beside it.
    rctx.setTransform(scale, 0, 0, scale, 0, 0);
    rctx.globalCompositeOperation = "source-over";
    rctx.clearRect(0, 0, width, height);
    rctx.lineCap = "round";
    rctx.lineJoin = "round";
    const thick = height * GLOW_WORD_RIBBON_WIDTH;
    const passes = [
      { color: GLOW_WORD_COLORS[0], width: thick, alpha: 0.55, shift: 0 },
      { color: GLOW_WORD_COLORS[1], width: thick * 0.5, alpha: 0.75, shift: 0 },
      { color: GLOW_WORD_STRAND, width: thick * 0.14, alpha: 0.85, shift: thick * 0.32 },
      { color: GLOW_WORD_COLORS[2], width: thick * 0.16, alpha: 0.95, shift: -thick * 0.06 }
    ];
    passes.forEach(function (pass) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const age = (time - b.time) / (GLOW_WORD_TAIL * 1000); // 0 = newest, 1 = about to vanish
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1;
        const ox = nx / len * pass.shift;
        const oy = ny / len * pass.shift;
        rctx.globalAlpha = pass.alpha * Math.max(0, 1 - age);
        rctx.strokeStyle = pass.color;
        rctx.lineWidth = pass.width * (0.45 + 0.55 * (1 - age)); // the tail thins out
        rctx.beginPath();
        rctx.moveTo(a.x + ox, a.y + oy);
        rctx.lineTo(b.x + ox, b.y + oy);
        rctx.stroke();
      }
    });
    rctx.globalAlpha = 1;

    // Inside the letters: a faint glow where the ribbon passes.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = GLOW_WORD_INNER_GLOW;
    ctx.globalCompositeOperation = "lighter";
    ctx.drawImage(cutTo(function (c) {
      c.fillText(word, width / 2, textY());
    }), 0, 0);
    // A soft bloom around the lit outlines (in browsers that can blur a canvas).
    const outlines = cutTo(function (c) {
      c.lineWidth = Math.max(2, fontSize * 0.012);
      c.strokeText(word, width / 2, textY());
    });
    if ("filter" in ctx) {
      ctx.filter = "blur(" + Math.round(6 * ratio) + "px)";
      ctx.globalAlpha = GLOW_WORD_BRIGHTNESS * 0.9;
      ctx.drawImage(outlines, 0, 0);
      ctx.filter = "none";
    }
    // The outlines: lit brightly where the ribbon crosses them.
    ctx.globalAlpha = GLOW_WORD_BRIGHTNESS;
    ctx.drawImage(outlines, 0, 0);
    ctx.restore();
  }

  // Copies the ribbon, keeping only the part that falls inside a shape (the letters, or their outlines).
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d");
  function cutTo(drawShape) {
    if (scratch.width !== ribbon.width || scratch.height !== ribbon.height) {
      scratch.width = ribbon.width;
      scratch.height = ribbon.height;
    }
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = "source-over";
    sctx.clearRect(0, 0, scratch.width, scratch.height);
    sctx.drawImage(ribbon, 0, 0);
    sctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    sctx.globalCompositeOperation = "destination-in";
    setFont(sctx);
    sctx.fillStyle = "#fff";
    sctx.strokeStyle = "#fff";
    drawShape(sctx);
    return scratch;
  }


  /* Running only while it's on screen. */
  let lastTime = performance.now();
  function play() {
    if (running || !visible || document.hidden) {
      return;
    }
    if (!root.classList.contains("motion")) {
      // Reduce motion: one still frame with the ribbon resting across the word.
      trail.length = 0;
      for (let i = 0; i <= 40; i++) {
        const x = width * (0.1 + 0.8 * i / 40);
        trail.push({ x: x, y: height * (0.5 + 0.25 * Math.sin(i / 40 * Math.PI * 2)), time: performance.now() - (40 - i) * 15 });
      }
      draw(performance.now());
      return;
    }
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!visible || document.hidden || !root.classList.contains("motion")) {
      running = false;
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, 1 / 20);
    lastTime = now;
    step(now, dt);
    draw(now);
    requestAnimationFrame(frame);
  }

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    play();
  }).observe(holder);
  document.addEventListener("visibilitychange", play);
  window.addEventListener("resize", resize);
  resize();
}

startGlowWords();
