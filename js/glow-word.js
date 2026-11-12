/* GLOW-WORD.JS: GIANT OUTLINED WORDS LIT BY A RIBBON OF LIGHT
   Huge words drawn as thin, faint outlines. A ribbon of light (gold, pale blue, periwinkle and
   violet) trails behind your mouse, and wherever it crosses the letters, their outlines light up.
   When the mouse is still, the ribbon drifts across on its own.

   Two kinds:
   - One giant word that fills the width (EXPERIENCE in the About page's header):
       <div class="glow-word" data-word="EXPERIENCE" aria-hidden="true"></div>
   - A backdrop of words and formulas behind the whole page, below that word, mostly around the
     edges and just as large. Each one types itself in as it scrolls into view, and they drift
     at a little less than your scrolling speed, so they sit behind the page. The ribbon follows
     your mouse anywhere on the page. (The words and their places are in section 1.)
       <div class="glow-backdrop" aria-hidden="true"></div>
   Both are decoration (aria-hidden); the real headings are in the page. They only draw while
   needed and the tab is visible. With "reduce motion" on they show still, fully written, with
   no ribbon. Without JavaScript the giant word shows as a plain CSS outline; the backdrop is absent.

   SECTIONS
   1. Settings (and the backdrop's words)
   2. Start
   3. One giant word
   4. The backdrop
   5. The ribbon of light (shared) */


/* 1. SETTINGS */

// How long the ribbon's tail lasts (seconds): longer = a longer, lazier ribbon.
const GLOW_WORD_TAIL = 1.1;

// How quickly the ribbon's head catches up with the mouse (share of the gap closed each frame).
const GLOW_WORD_FOLLOW = 0.18;

// The ribbon's width (pixels), and how bright the lit outlines get (0-1).
const GLOW_WORD_RIBBON_WIDTH = 70;
const GLOW_WORD_BRIGHTNESS = 1;

// The faint outline you see when nothing is lighting it (0 = invisible, 0.2 = clearly visible),
// and the glow inside the letters where the ribbon passes (0 = none).
const GLOW_WORD_BASE_OUTLINE = 0.12;
const GLOW_WORD_INNER_GLOW = 0.16;

// The ribbon's colors from its soft outer edge to its bright core, and the warm strand beside it.
const GLOW_WORD_COLORS = ["#4b3fd6", "#7f9cff", "#e8f6ff"];
const GLOW_WORD_STRAND = "#ffb547";

// Seconds for one drift across the screen when the mouse is still.
const GLOW_WORD_DRIFT_TIME = 7;

// THE BACKDROP
// It sits behind the page's text, so it's fainter than the giant word until the ribbon lights it.
const BACKDROP_BASE_OUTLINE = 0.07;
const BACKDROP_INNER_GLOW = 0; // (0 skips it: barely visible behind text, and it saves work)

// How fast the backdrop moves compared with the page (1 = with it, 0.85 = a little slower, so it
// feels behind the page).
const BACKDROP_DEPTH = 0.85;

// Where on screen a word types itself in: it starts when its top reaches this far down the screen
// (share of the screen height), and finishes by this height.
const BACKDROP_TYPE_FROM = 0.95;
const BACKDROP_TYPE_TO = 0.5;

// How long a word's outline flashes when it finishes typing (seconds).
const BACKDROP_FLASH_TIME = 1.2;

// THE BACKDROP'S WORDS. x = where it starts across the screen (share of the screen width; below 0
// or above 1 runs off the edge), y = how far down the page (share of the backdrop's height, which
// runs from below the page header to the bottom), size = letter size (share of the screen width,
// so 0.115 is as large as EXPERIENCE). "down: true" stacks the letters top to bottom (x is then the
// column's middle). "mono" uses the code font.
// EDIT ME: change the words, move them, or add more. (Formulas are standard statistics notation;
// the numbers come from the projects: R² = 0.19 from the civic study, n = 83,439 from the salary
// survey, 3.1× from the (VR)² turnaround.)
const BACKDROP_WORDS = [
  { text: "DATA", x: -0.03, y: 0.02, size: 0.13 },
  { text: "REGRESSION", x: 0.955, y: 0.0, size: 0.07, down: true },
  { text: "ŷ = β₀ + β₁x + ε", x: 0.03, y: 0.1, size: 0.05, mono: true },
  { text: "R² = 0.19", x: 0.6, y: 0.17, size: 0.075, mono: true },
  { text: "MEDIAN", x: 0.04, y: 0.22, size: 0.075, down: true },
  { text: "INSIGHT", x: 0.56, y: 0.32, size: 0.12 },
  { text: "σ² = Σ(x − μ)² / N", x: 0.09, y: 0.42, size: 0.05, mono: true },
  { text: "p < 0.05", x: 0.66, y: 0.48, size: 0.065, mono: true },
  { text: "SIGNAL", x: 0.958, y: 0.5, size: 0.075, down: true },
  { text: "IQR = Q₃ − Q₁", x: 0.02, y: 0.6, size: 0.055, mono: true },
  { text: "n = 83,439", x: 0.6, y: 0.68, size: 0.05, mono: true },
  { text: "TREND", x: 0.04, y: 0.74, size: 0.075, down: true },
  { text: "RMSE = √(Σ(y−ŷ)²/n)", x: 0.08, y: 0.86, size: 0.04, mono: true },
  { text: "3.1×", x: 0.66, y: 0.9, size: 0.13 }
];

// Sharpness on high-resolution screens (capped to keep things smooth; the backdrop fills the
// whole screen, so it's capped lower).
const GLOW_WORD_PIXEL_RATIO = 2;
const BACKDROP_PIXEL_RATIO = 1.5;

// The backdrop's light is soft, so it's drawn at a lower sharpness and stretched to fit (0.5 = half
// sharpness, a quarter of the work). The faint outlines stay sharp.
const BACKDROP_LIGHT_SHARPNESS = 0.5;


/* 2. START */
function startGlowWords() {
  const words = document.querySelectorAll(".glow-word[data-word]");
  const backdrops = document.querySelectorAll(".glow-backdrop");
  if (!words.length && !backdrops.length) {
    return;
  }
  const fontsReady = document.fonts && document.fonts.load ?
    Promise.all([
      document.fonts.load("300 100px Geist"),
      document.fonts.load("400 100px 'Geist Mono'")
    ]).catch(function () {}) : Promise.resolve();
  fontsReady.then(function () {
    words.forEach(setUpGiantWord);
    backdrops.forEach(setUpBackdrop);
  });
}

// The page got taller or shorter: scroll-linked effects further down (like the card deal) measure
// their positions again. (Bundled, so several words sizing at once cause just one re-measure.)
let glowRemeasureTimer = null;
function remeasurePage() {
  clearTimeout(glowRemeasureTimer);
  glowRemeasureTimer = setTimeout(function () {
    if (window.ScrollTrigger && document.documentElement.classList.contains("motion")) {
      window.ScrollTrigger.refresh();
    }
  }, 60);
}

function glowFont(item) {
  return (item.mono ? "400 " : "300 ") + item.size + "px " +
    (item.mono ? "'Geist Mono', ui-monospace, monospace" : "Geist, system-ui, sans-serif");
}

// Draws words (or as much of each as has typed in) as outlines ("stroke") or filled shapes ("fill").
function glowDrawWords(context, items, mode, onlyItem, region) {
  context.textBaseline = "alphabetic";
  items.forEach(function (item) {
    if ((onlyItem && onlyItem !== item) || item.hidden) {
      return;
    }
    if (region && !glowTouches(item, region)) {
      return; // nowhere near the light: skip it
    }
    const shown = item.typed === undefined ? 1 : item.typed;
    if (shown <= 0) {
      return;
    }
    context.font = glowFont(item);
    const letters = Array.from(item.text);
    const count = Math.ceil(shown * letters.length);
    if (item.down) {
      context.textAlign = "center"; // one letter under another, centered on the column
      for (let i = 0; i < count; i++) {
        const y = item.sy + (i + 0.85) * item.size * 1.02;
        if (mode === "fill") {
          context.fillText(letters[i], item.sx, y);
        } else {
          context.strokeText(letters[i], item.sx, y);
        }
      }
    } else {
      context.textAlign = "left";
      const text = letters.slice(0, count).join("");
      if (mode === "fill") {
        context.fillText(text, item.sx, item.sy);
      } else {
        context.strokeText(text, item.sx, item.sy);
      }
    }
  });
}


// The box a word takes up on screen (measured once, then moved as the page scrolls).
function glowMeasure(context, item) {
  context.font = glowFont(item);
  const letters = Array.from(item.text);
  if (item.down) {
    item.w = item.size;
    item.h = letters.length * item.size * 1.02 + item.size * 0.3;
  } else {
    item.w = context.measureText(item.text).width;
    item.h = item.size * 1.1;
  }
}

function glowTouches(item, region) {
  if (item.w === undefined) {
    return true;
  }
  const left = item.down ? item.sx - item.w / 2 : item.sx;
  const top = item.down ? item.sy : item.sy - item.size * 0.85;
  return left < region.right && left + item.w > region.left && top < region.bottom && top + item.h > region.top;
}


/* 3. ONE GIANT WORD */
function setUpGiantWord(holder) {
  const root = document.documentElement;
  const light = makeGlowLight();
  if (!light) {
    return;
  }
  holder.appendChild(light.canvas);
  holder.appendChild(light.lightCanvas); // the light layer sits on top (style.css)
  holder.classList.add("is-drawn"); // style.css hides its plain fallback

  let visible = false;
  let running = false;
  let items = [];

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, GLOW_WORD_PIXEL_RATIO);
    const width = holder.clientWidth;
    const word = holder.dataset.word || "";
    const measure = light.ctx;
    measure.font = "300 100px Geist, system-ui, sans-serif";
    const size = Math.floor(100 * width / (measure.measureText(word).width || 600) * 0.98);
    const height = Math.ceil(size * 0.9);
    measure.font = "300 " + size + "px Geist, system-ui, sans-serif";
    const textWidth = measure.measureText(word).width;
    items = [{ text: word, sx: (width - textWidth) / 2, sy: height * 0.86, size: size }];
    if (holder.style.height !== height + "px") {
      holder.style.height = height + "px";
      remeasurePage();
    }
    light.resize(width, height, ratio, size / 160);
    light.draw(items, performance.now(), GLOW_WORD_BASE_OUTLINE, GLOW_WORD_INNER_GLOW, Math.max(2, size * 0.012));
  }

  holder.addEventListener("pointermove", function (event) {
    const box = holder.getBoundingClientRect();
    light.pointAt(event.clientX - box.left, event.clientY - box.top);
    play();
  });

  function play() {
    if (running || !visible || document.hidden) {
      return;
    }
    if (!root.classList.contains("motion")) {
      light.restingRibbon();
      light.draw(items, performance.now(), GLOW_WORD_BASE_OUTLINE, GLOW_WORD_INNER_GLOW, Math.max(2, items[0].size * 0.012));
      return;
    }
    running = true;
    light.resetClock();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!visible || document.hidden || !root.classList.contains("motion")) {
      running = false;
      return;
    }
    light.step(now);
    light.draw(items, now, GLOW_WORD_BASE_OUTLINE, GLOW_WORD_INNER_GLOW, Math.max(2, items[0].size * 0.012));
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


/* 4. THE BACKDROP: words and formulas behind the whole page */
function setUpBackdrop(area) {
  const root = document.documentElement;
  const light = makeGlowLight(BACKDROP_LIGHT_SHARPNESS);
  if (!light) {
    return;
  }
  // One screen-sized drawing, fixed behind the page; the words move through it as you scroll.
  [light.canvas, light.lightCanvas].forEach(function (c) {
    c.className = "glow-backdrop-canvas";
    c.setAttribute("aria-hidden", "true");
  });
  // (inserted so the light layer ends up just above the outlines)
  document.body.insertBefore(light.lightCanvas, document.body.firstChild);
  document.body.insertBefore(light.canvas, document.body.firstChild);
  area.classList.add("is-drawn");

  let width = 0;
  let height = 0;
  let items = [];
  let running = false;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, BACKDROP_PIXEL_RATIO);
    light.resize(width, height, ratio, Math.min(1.6, width / 1000));
    // From the marker (just below the page header) to the bottom of the page's main content.
    const top = area.getBoundingClientRect().top + window.scrollY;
    const main = area.closest("main") || document.body;
    const bottom = main.getBoundingClientRect().bottom + window.scrollY;
    const box = { height: Math.max(1, bottom - top) };
    items = BACKDROP_WORDS.map(function (w) {
      return {
        text: w.text, mono: !!w.mono, down: !!w.down,
        size: w.size * width,
        pageX: w.x * width,
        // Spread down the backdrop's height, adjusted for its slower speed.
        pageY: (top + w.y * box.height) * BACKDROP_DEPTH,
        typed: 0,
        doneAt: -1
      };
    });
    items.forEach(function (item) {
      glowMeasure(light.ctx, item);
    });
    light.forgetOutlines();
    place(performance.now());
  }

  // Where each word is on screen right now, and how much of it has typed in.
  function place(time) {
    const scroll = window.scrollY * BACKDROP_DEPTH;
    const moving = root.classList.contains("motion");
    items.forEach(function (item) {
      item.sx = item.pageX;
      item.sy = item.pageY - scroll + (item.down ? 0 : item.size * 0.8);
      const tall = item.down ? Array.from(item.text).length * item.size : item.size;
      const topOnScreen = item.sy - (item.down ? 0 : item.size * 0.8);
      item.hidden = topOnScreen > height + 40 || topOnScreen + tall < -40;
      const progress = (BACKDROP_TYPE_FROM * height - topOnScreen) / ((BACKDROP_TYPE_FROM - BACKDROP_TYPE_TO) * height);
      item.typed = moving ? Math.max(0, Math.min(1, progress)) : 1;
      if (item.typed >= 1 && item.doneAt < 0) {
        item.doneAt = time;
      } else if (item.typed < 1) {
        item.doneAt = -1;
      }
    });
  }

  window.addEventListener("pointermove", function (event) {
    light.pointAt(event.clientX, event.clientY);
  }, { passive: true });

  function play() {
    if (running || document.hidden) {
      return;
    }
    if (!root.classList.contains("motion")) {
      // Reduce motion: no ribbon, no typing; just redraw the still words when the page scrolls.
      place(performance.now());
      light.draw(items, performance.now(), BACKDROP_BASE_OUTLINE, 0, 2);
      return;
    }
    running = true;
    light.resetClock();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    if (document.hidden || !root.classList.contains("motion")) {
      running = false;
      return;
    }
    place(now);
    light.step(now);
    light.draw(items, now, BACKDROP_BASE_OUTLINE, BACKDROP_INNER_GLOW, 2.4, {
      // Is any word still flashing after finishing its typing?
      active: function () {
        return items.some(function (item) {
          return item.doneAt >= 0 && !item.hidden && (now - item.doneAt) / 1000 < BACKDROP_FLASH_TIME;
        });
      },
      // A word that just finished typing flashes its outline, then settles.
      draw: function (ctx) {
        items.forEach(function (item) {
          const since = (now - item.doneAt) / 1000;
          if (item.doneAt >= 0 && since < BACKDROP_FLASH_TIME && !item.hidden) {
            ctx.globalAlpha = (1 - since / BACKDROP_FLASH_TIME) * 0.7;
            ctx.strokeStyle = since < 0.25 ? "#ffd9a0" : "#9fb4ff";
            ctx.lineWidth = Math.max(1.5, item.size * 0.015);
            glowDrawWords(ctx, items, "stroke", item);
          }
        });
        ctx.globalAlpha = 1;
      }
    });
    requestAnimationFrame(frame);
  }

  window.addEventListener("scroll", function () {
    if (!running) {
      play();
    }
  }, { passive: true });
  document.addEventListener("visibilitychange", play);
  window.addEventListener("resize", resize);
  // The page may change height once headlines, cards and pictures settle: measure again then.
  window.addEventListener("load", resize);
  resize();
  play();
}


/* 5. THE RIBBON OF LIGHT (shared by both kinds)
   The ribbon is drawn on a hidden canvas, then cut to the letters' outlines (and, faintly, their
   insides), so the light only ever shows on the words. */
function makeGlowLight(lightSharpness) {
  const soft = lightSharpness || 1; // the light layers' sharpness compared with the outlines
  // Two visible layers, stacked by the browser: the faint outlines (redrawn only when they change)
  // and the light on top (only the patch around the ribbon is redrawn each frame).
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const lightCanvas = document.createElement("canvas");
  const lctx = lightCanvas.getContext("2d");
  // Working layers, never shown: the ribbon, the cut-out light, the word stencil, and a small
  // quarter-size copy used for the soft bloom.
  const ribbon = document.createElement("canvas");
  const rctx = ribbon.getContext("2d");
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d");
  // Stencils of the words, saved alongside the faint outlines: one of their insides, one of their
  // outlines. The light is cut to these (they only change when the words do).
  const fillMask = document.createElement("canvas");
  const fillCtx = fillMask.getContext("2d");
  const strokeMask = document.createElement("canvas");
  const strokeCtx = strokeMask.getContext("2d");
  const bloom = document.createElement("canvas");
  const bloomCtx = bloom.getContext("2d");
  if (!ctx || !lctx || !rctx || !sctx || !fillCtx || !strokeCtx || !bloomCtx) {
    return null;
  }
  let width = 1;
  let height = 1;
  let ratio = 1;
  let scale = 1;
  let lastTime = performance.now();
  let baseKey = "";
  let lastPatch = null; // the patch of the light layer drawn last frame (cleared next frame)
  const trail = [];
  const head = { x: -1e4, y: 0 };
  const mouse = { x: 0, y: 0, lastMove: -1e9 };

  function goal(time) {
    if (time - mouse.lastMove < 2500) {
      return { x: mouse.x, y: mouse.y };
    }
    const t = time / 1000 / GLOW_WORD_DRIFT_TIME;
    return {
      x: -0.1 * width + (t % 1) * width * 1.2,
      y: height * (0.5 + 0.3 * Math.sin(t * Math.PI * 2 * 1.7) + 0.12 * Math.sin(t * 9.1))
    };
  }

  // Copies the ribbon (only within the patch around it), keeping just the part inside the letters
  // ("fill") or on their outlines ("stroke"), using the saved stencils.
  function cutTo(mode, px) {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = "source-over";
    sctx.clearRect(px.x, px.y, px.w, px.h);
    sctx.drawImage(ribbon, px.x, px.y, px.w, px.h, px.x, px.y, px.w, px.h);
    sctx.globalCompositeOperation = "destination-in";
    sctx.drawImage(mode === "fill" ? fillMask : strokeMask, px.x, px.y, px.w, px.h, px.x, px.y, px.w, px.h);
    sctx.globalCompositeOperation = "source-over";
    return scratch;
  }

  // Redraws the stencils (all the words at once, so none erases another).
  function drawStencils(items, litLineWidth, withInsides) {
    [fillCtx, strokeCtx].forEach(function (c) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, fillMask.width, fillMask.height);
      c.setTransform(ratio * soft, 0, 0, ratio * soft, 0, 0);
      c.fillStyle = "#fff";
      c.strokeStyle = "#fff";
      c.lineWidth = litLineWidth;
    });
    if (withInsides) {
      glowDrawWords(fillCtx, items, "fill");
    }
    glowDrawWords(strokeCtx, items, "stroke");
  }

  function clearLight() {
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    if (lastPatch) {
      lctx.clearRect(lastPatch.x - 2, lastPatch.y - 2, lastPatch.w + 4, lastPatch.h + 4);
      lastPatch = null;
    }
  }

  return {
    canvas: canvas,
    lightCanvas: lightCanvas,
    ctx: ctx,
    forgetOutlines: function () {
      baseKey = "";
    },
    resize: function (w, h, r, s) {
      width = w;
      height = h;
      ratio = r;
      scale = s;
      baseKey = "";
      lastPatch = null;
      canvas.width = Math.round(w * r);
      canvas.height = Math.round(h * r);
      [lightCanvas, ribbon, scratch, fillMask, strokeMask].forEach(function (c) {
        c.width = Math.round(w * r * soft);
        c.height = Math.round(h * r * soft);
      });
      [canvas, lightCanvas].forEach(function (c) {
        c.style.width = w + "px";
        c.style.height = h + "px";
      });
    },
    pointAt: function (x, y) {
      mouse.x = x;
      mouse.y = y;
      mouse.lastMove = performance.now();
    },
    resetClock: function () {
      lastTime = performance.now();
    },
    restingRibbon: function () {
      trail.length = 0;
      const now = performance.now();
      for (let i = 0; i <= 40; i++) {
        trail.push({ x: width * (0.1 + 0.8 * i / 40), y: height * (0.5 + 0.25 * Math.sin(i / 40 * Math.PI * 2)), time: now - (40 - i) * 15 });
      }
    },
    step: function (time) {
      const dt = Math.min((time - lastTime) / 1000, 1 / 20);
      lastTime = time;
      const g = goal(time);
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
    },
    draw: function (items, time, baseOutline, innerGlow, litLineWidth, extra) {
      // THE FAINT OUTLINES (their own layer): redrawn only when a word moves, types in or flashes.
      const flashing = extra ? extra.active() : false;
      const key = items.map(function (it) {
        return it.hidden ? "-" : Math.round(it.sy) + ":" + (it.typed === undefined ? 1 : Math.round(it.typed * 100));
      }).join("|");
      const moved = key !== baseKey;
      if (moved) {
        drawStencils(items, litLineWidth, innerGlow > 0);
      }
      if (moved || flashing) {
        baseKey = key;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "rgba(223, 231, 242, " + baseOutline + ")";
        glowDrawWords(ctx, items, "stroke");
        if (extra) {
          extra.draw(ctx);
        }
      }

      // THE LIGHT (the top layer): only the patch around the ribbon.
      clearLight();
      if (trail.length < 2) {
        return;
      }
      const thick = GLOW_WORD_RIBBON_WIDTH * Math.max(0.6, Math.min(1.6, scale));
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      trail.forEach(function (pt) {
        minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
        minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
      });
      const pad = thick + 24;
      const region = {
        left: Math.max(0, minX - pad), top: Math.max(0, minY - pad),
        right: Math.min(width, maxX + pad), bottom: Math.min(height, maxY + pad)
      };
      if (region.right <= region.left || region.bottom <= region.top) {
        return; // the ribbon is off screen
      }
      if (!items.some(function (item) { return !item.hidden && (item.typed === undefined || item.typed > 0) && glowTouches(item, region); })) {
        return; // no word near the ribbon: nothing to light
      }
      const lr = ratio * soft; // the light layers' pixels per screen pixel
      const px = {
        x: Math.floor(region.left * lr), y: Math.floor(region.top * lr),
        w: Math.ceil((region.right - region.left) * lr), h: Math.ceil((region.bottom - region.top) * lr)
      };

      // The ribbon: soft wide violet-blue, periwinkle, a pale core, and a golden strand beside it.
      rctx.setTransform(1, 0, 0, 1, 0, 0);
      rctx.globalCompositeOperation = "source-over";
      rctx.clearRect(px.x, px.y, px.w, px.h);
      rctx.setTransform(lr, 0, 0, lr, 0, 0);
      rctx.lineCap = "round";
      rctx.lineJoin = "round";
      const passes = [
        { color: GLOW_WORD_COLORS[0], width: thick, alpha: 0.6, shift: 0 },
        { color: GLOW_WORD_COLORS[1], width: thick * 0.5, alpha: 0.75, shift: 0 },
        { color: GLOW_WORD_STRAND, width: thick * 0.14, alpha: 0.9, shift: thick * 0.32 },
        { color: GLOW_WORD_COLORS[2], width: thick * 0.16, alpha: 0.95, shift: -thick * 0.06 }
      ];
      passes.forEach(function (pass) {
        // (every other point is plenty for a smooth ribbon, and half the work)
        for (let i = 2; i < trail.length; i += 2) {
          const a = trail[i - 2];
          const b = trail[i];
          const age = (time - b.time) / (GLOW_WORD_TAIL * 1000);
          const nx = -(b.y - a.y);
          const ny = b.x - a.x;
          const len = Math.hypot(nx, ny) || 1;
          rctx.globalAlpha = pass.alpha * Math.max(0, 1 - age);
          rctx.strokeStyle = pass.color;
          rctx.lineWidth = pass.width * (0.45 + 0.55 * (1 - age));
          rctx.beginPath();
          rctx.moveTo(a.x + nx / len * pass.shift, a.y + ny / len * pass.shift);
          rctx.lineTo(b.x + nx / len * pass.shift, b.y + ny / len * pass.shift);
          rctx.stroke();
        }
      });
      rctx.globalAlpha = 1;

      lctx.setTransform(1, 0, 0, 1, 0, 0);
      lctx.globalCompositeOperation = "lighter";
      // Inside the letters: a faint glow where the ribbon passes.
      if (innerGlow > 0) {
        lctx.globalAlpha = innerGlow;
        const insides = cutTo("fill", px);
        lctx.drawImage(insides, px.x, px.y, px.w, px.h, px.x, px.y, px.w, px.h);
      }
      // The outlines, lit where the ribbon crosses them.
      const outlines = cutTo("stroke", px);
      // A soft bloom around them: shrink the lit outlines to a quarter size and stretch them back
      // up, which smooths them like a blur at a fraction of the cost.
      const bw = Math.max(1, Math.ceil(px.w / 4));
      const bh = Math.max(1, Math.ceil(px.h / 4));
      if (bloom.width < bw || bloom.height < bh) {
        bloom.width = Math.max(bloom.width, bw);
        bloom.height = Math.max(bloom.height, bh);
      }
      bloomCtx.clearRect(0, 0, bw + 1, bh + 1);
      bloomCtx.drawImage(outlines, px.x, px.y, px.w, px.h, 0, 0, bw, bh);
      lctx.imageSmoothingEnabled = true;
      lctx.globalAlpha = GLOW_WORD_BRIGHTNESS * 0.9;
      lctx.drawImage(bloom, 0, 0, bw, bh, px.x, px.y, px.w, px.h);
      lctx.globalAlpha = GLOW_WORD_BRIGHTNESS;
      lctx.drawImage(outlines, px.x, px.y, px.w, px.h, px.x, px.y, px.w, px.h);
      lctx.globalAlpha = 1;
      lctx.globalCompositeOperation = "source-over";
      lastPatch = px;
    }
  };
}

startGlowWords();
