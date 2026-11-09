/* GLOW-WORD.JS: GIANT OUTLINED WORDS LIT BY A RIBBON OF LIGHT
   Huge words drawn as thin, faint outlines. A ribbon of light (gold, pale blue, periwinkle and
   violet) trails behind your mouse as you move over them, and wherever it crosses the letters,
   their outlines light up. When the mouse is away, the ribbon drifts across on its own.

   Two kinds:
   - One giant word that fills the width:
       <div class="glow-word" data-word="EXPERIENCE" aria-hidden="true"></div>
   - A "word jumble": words and formulas laid out across and down, which type themselves in as
     you scroll past (the layout is in section 1 below):
       <div class="glow-word" data-layout="jumble" aria-hidden="true"></div>
   They're decoration (aria-hidden); keep real headings nearby for screen readers and search.
   They only draw while on screen and the tab is visible. With "reduce motion" on they show one
   still, fully written frame. Without JavaScript the giant word shows as a plain CSS outline
   and the jumble is hidden.

   SECTIONS
   1. Settings (and the jumble's layout)
   2. Start
   3. Laying out the words
   4. The ribbon (following the mouse, or drifting on its own)
   5. Typing in as you scroll
   6. Drawing */


/* 1. SETTINGS */

// How long the ribbon's tail lasts (seconds): longer = a longer, lazier ribbon.
const GLOW_WORD_TAIL = 1.1;

// How quickly the ribbon's head catches up with the mouse (share of the gap closed each frame).
const GLOW_WORD_FOLLOW = 0.18;

// The ribbon's width (pixels, at the size of the giant word), and how bright the lit outlines get.
const GLOW_WORD_RIBBON_WIDTH = 64;
const GLOW_WORD_BRIGHTNESS = 1;

// The faint outline you see when nothing is lighting it (0 = invisible, 0.2 = clearly visible),
// and the glow inside the letters where the ribbon passes (0 = none).
const GLOW_WORD_BASE_OUTLINE = 0.12;
const JUMBLE_BASE_OUTLINE = 0.2; // the jumble's words, a little clearer since they're all text
const GLOW_WORD_INNER_GLOW = 0.16;

// The ribbon's colors from its soft outer edge to its bright core, and the warm strand beside it
// (the deep violets and periwinkles of a mythical night, with a golden spark).
const GLOW_WORD_COLORS = ["#4b3fd6", "#7f9cff", "#e8f6ff"];
const GLOW_WORD_STRAND = "#ffb547";

// Seconds for one drift across when the mouse isn't on it.
const GLOW_WORD_DRIFT_TIME = 7;

// The jumble's typing: how much of its scroll each word takes to type in (0-1), and how long a
// word's outline flashes when it finishes (seconds).
const JUMBLE_TYPE_SHARE = 0.16;
const JUMBLE_FLASH_TIME = 1.2;

// THE JUMBLE'S LAYOUT. Positions and sizes are in grid squares: the wide layout is 24 squares
// across (13 down), the phone layout 12 across. For words going across, x/y is where the text
// starts and sits (its baseline); for words going down ("down: true"), x is the column's middle and
// y its top. "mono" uses the code font. Words type in in the order listed.
// EDIT ME: change the words, move them, or add more. (Formulas are standard statistics notation;
// the numbers come from the projects: R² = 0.19 from the civic study, n = 83,439 from the salary
// survey, 3.1× from the (VR)² turnaround.)
const JUMBLE_WIDE = {
  across: 24, down: 13,
  words: [
    { text: "DATA", x: 0, y: 4.3, size: 4.6 },
    { text: "REGRESSION", x: 13, y: 0.2, size: 1.1, down: true },
    { text: "ŷ = β₀ + β₁x + ε", x: 14.6, y: 1.5, size: 0.9, mono: true },
    { text: "R² = 0.19", x: 15.4, y: 4.5, size: 1.5, mono: true },
    { text: "σ² = Σ(x − μ)² / N", x: 0.2, y: 6.6, size: 0.82, mono: true },
    { text: "p < 0.05", x: 14.6, y: 7.2, size: 1.1, mono: true },
    { text: "MEDIAN", x: 23.3, y: 5.2, size: 1, down: true },
    { text: "INSIGHT", x: 0, y: 9.9, size: 2.6 },
    { text: "IQR = Q₃ − Q₁", x: 14.6, y: 10.4, size: 0.85, mono: true },
    { text: "n = 83,439", x: 0.2, y: 12.5, size: 0.8, mono: true },
    { text: "RMSE = √(Σ(y−ŷ)²/n)", x: 8.6, y: 12.5, size: 0.8, mono: true },
    { text: "3.1×", x: 19, y: 12.7, size: 1.5 }
  ]
};
const JUMBLE_PHONE = {
  across: 12, down: 13,
  words: [
    { text: "DATA", x: 0, y: 3.2, size: 3.4 },
    { text: "REGRESSION", x: 11.2, y: 0.1, size: 0.95, down: true },
    { text: "ŷ = β₀ + β₁x + ε", x: 0, y: 5.1, size: 0.62, mono: true },
    { text: "R² = 0.19", x: 0, y: 7.1, size: 1, mono: true },
    { text: "p < 0.05", x: 5.9, y: 7.1, size: 0.75, mono: true },
    { text: "INSIGHT", x: 0, y: 9.7, size: 1.6 },
    { text: "n = 83,439", x: 0, y: 11.4, size: 0.6, mono: true },
    { text: "3.1×", x: 7.4, y: 12.2, size: 1.3 }
  ]
};

// The jumble switches to the phone layout below this width (pixels).
const JUMBLE_PHONE_SCREEN = 700;

// Sharpness on high-resolution screens (capped to keep things smooth).
const GLOW_WORD_PIXEL_RATIO = 2;


/* 2. START */
function startGlowWords() {
  const holders = document.querySelectorAll(".glow-word");
  if (!holders.length) {
    return;
  }
  const fontsReady = document.fonts && document.fonts.load ?
    Promise.all([
      document.fonts.load("300 100px Geist"),
      document.fonts.load("400 100px 'Geist Mono'")
    ]).catch(function () {}) : Promise.resolve();
  fontsReady.then(function () {
    holders.forEach(setUpGlowText);
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

function setUpGlowText(holder) {
  const root = document.documentElement;
  const isJumble = holder.dataset.layout === "jumble";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const ribbon = document.createElement("canvas"); // the ribbon is drawn here first, then cut to the letters
  const rctx = ribbon.getContext("2d");
  const scratch = document.createElement("canvas");
  const sctx = scratch.getContext("2d");
  if (!ctx || !rctx || !sctx) {
    return;
  }
  holder.appendChild(canvas);
  holder.classList.add("is-drawn"); // style.css hides its plain fallback

  let width = 0;
  let height = 0;
  let ratio = 1;
  let scale = 1;     // the ribbon's size relative to the giant word
  let items = [];    // the words to draw: { text, x, y, size (px), mono, down, start, done }
  let visible = false;
  let running = false;
  const trail = [];
  const head = { x: -1e4, y: 0 };
  const mouse = { x: 0, y: 0, over: false, lastMove: -1e9 };


  /* 3. LAYING OUT THE WORDS */
  function font(item) {
    return (item.mono ? "400 " : "300 ") + item.size + "px " +
      (item.mono ? "'Geist Mono', ui-monospace, monospace" : "Geist, system-ui, sans-serif");
  }

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, GLOW_WORD_PIXEL_RATIO);
    width = holder.clientWidth;
    if (isJumble) {
      const layout = window.innerWidth < JUMBLE_PHONE_SCREEN ? JUMBLE_PHONE : JUMBLE_WIDE;
      const unit = width / layout.across;
      height = Math.ceil(layout.down * unit);
      const count = layout.words.length;
      items = layout.words.map(function (w, i) {
        return {
          text: w.text, x: w.x * unit, y: w.y * unit, size: w.size * unit,
          mono: !!w.mono, down: !!w.down,
          // when this word starts typing (as a share of the jumble's scroll)
          start: (i / count) * (1 - JUMBLE_TYPE_SHARE),
          doneAt: -1
        };
      });
      scale = unit / 40;
    } else {
      const word = holder.dataset.word || "";
      ctx.font = "300 100px Geist, system-ui, sans-serif";
      const measured = ctx.measureText(word).width || 600;
      const size = Math.floor(100 * width / measured * 0.98);
      height = Math.ceil(size * 0.9);
      ctx.font = "300 " + size + "px Geist, system-ui, sans-serif";
      const textWidth = ctx.measureText(word).width;
      items = [{ text: word, x: (width - textWidth) / 2, y: height * 0.86, size: size, mono: false, down: false, start: 0, doneAt: 0 }];
      scale = size / 160;
    }
    const heightChanged = holder.style.height !== height + "px";
    holder.style.height = height + "px";
    if (heightChanged) {
      remeasurePage();
    }
    [canvas, ribbon, scratch].forEach(function (c) {
      c.width = Math.round(width * ratio);
      c.height = Math.round(height * ratio);
    });
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    draw(performance.now());
  }

  // Draws the words (or as much of each as has typed in so far), as outlines or filled shapes.
  function drawWords(context, mode, onlyItem) {
    items.forEach(function (item) {
      if (onlyItem && onlyItem !== item) {
        return;
      }
      const shown = typed(item);
      if (shown <= 0) {
        return;
      }
      context.font = font(item);
      if (item.down) {
        // Down: one letter under another, centered on the column.
        context.textAlign = "center";
        const letters = Array.from(item.text);
        const count = Math.ceil(shown * letters.length);
        for (let i = 0; i < count; i++) {
          const y = item.y + (i + 0.85) * item.size * 1.02;
          if (mode === "fill") {
            context.fillText(letters[i], item.x, y);
          } else {
            context.strokeText(letters[i], item.x, y);
          }
        }
      } else {
        context.textAlign = "left";
        const letters = Array.from(item.text);
        const text = letters.slice(0, Math.ceil(shown * letters.length)).join("");
        if (mode === "fill") {
          context.fillText(text, item.x, item.y);
        } else {
          context.strokeText(text, item.x, item.y);
        }
      }
    });
  }


  /* 4. THE RIBBON */
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

  function goal(time) {
    if (mouse.over && time - mouse.lastMove < 2500) {
      return { x: mouse.x, y: mouse.y };
    }
    const t = time / 1000 / GLOW_WORD_DRIFT_TIME;
    const phase = t % 1;
    return {
      x: -0.1 * width + phase * width * 1.2,
      y: height * (0.5 + 0.3 * Math.sin(t * Math.PI * 2 * 1.7) + 0.12 * Math.sin(t * 9.1))
    };
  }

  function step(time, dt) {
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
  }


  /* 5. TYPING IN AS YOU SCROLL (the jumble only) */
  let scrollProgress = isJumble ? 0 : 1;
  function measureScroll() {
    if (!isJumble) {
      return;
    }
    if (!root.classList.contains("motion")) {
      scrollProgress = 1; // reduce motion: everything already written
      return;
    }
    const box = holder.getBoundingClientRect();
    const view = window.innerHeight;
    // 0 when the jumble's top reaches the bottom of the screen; 1 once its middle passes the top third.
    const progress = (view - box.top) / (view * 0.75 + box.height * 0.5);
    scrollProgress = Math.max(0, Math.min(1, progress));
  }

  // How much of a word has typed in (0 = none, 1 = all).
  function typed(item) {
    if (!isJumble) {
      return 1;
    }
    return Math.max(0, Math.min(1, (scrollProgress - item.start) / JUMBLE_TYPE_SHARE));
  }


  /* 6. DRAWING */
  function draw(time) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.textBaseline = "alphabetic";

    // The faint outlines that are always there (as much as has typed in).
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(223, 231, 242, " + (isJumble ? JUMBLE_BASE_OUTLINE : GLOW_WORD_BASE_OUTLINE) + ")";
    drawWords(ctx, "stroke");

    // A word that just finished typing flashes its outline, then settles.
    if (isJumble) {
      items.forEach(function (item) {
        const done = typed(item) >= 1;
        if (done && item.doneAt < 0) {
          item.doneAt = time;
        } else if (!done) {
          item.doneAt = -1;
        }
        const since = (time - item.doneAt) / 1000;
        if (item.doneAt >= 0 && since < JUMBLE_FLASH_TIME) {
          ctx.globalAlpha = (1 - since / JUMBLE_FLASH_TIME) * 0.9;
          ctx.strokeStyle = since < 0.25 ? "#ffd9a0" : "#9fb4ff";
          ctx.lineWidth = Math.max(1.5, item.size * 0.02);
          drawWords(ctx, "stroke", item);
        }
      });
      ctx.globalAlpha = 1;
    }

    if (trail.length < 2) {
      return;
    }

    // The ribbon: soft wide violet-blue, then periwinkle, then a pale core, plus a golden strand.
    rctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    rctx.globalCompositeOperation = "source-over";
    rctx.clearRect(0, 0, width, height);
    rctx.lineCap = "round";
    rctx.lineJoin = "round";
    const thick = GLOW_WORD_RIBBON_WIDTH * Math.max(0.6, Math.min(1.4, scale));
    const passes = [
      { color: GLOW_WORD_COLORS[0], width: thick, alpha: 0.6, shift: 0 },
      { color: GLOW_WORD_COLORS[1], width: thick * 0.5, alpha: 0.75, shift: 0 },
      { color: GLOW_WORD_STRAND, width: thick * 0.14, alpha: 0.9, shift: thick * 0.32 },
      { color: GLOW_WORD_COLORS[2], width: thick * 0.16, alpha: 0.95, shift: -thick * 0.06 }
    ];
    passes.forEach(function (pass) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const age = (time - b.time) / (GLOW_WORD_TAIL * 1000);
        const nx = -(b.y - a.y);
        const ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1;
        const ox = nx / len * pass.shift;
        const oy = ny / len * pass.shift;
        rctx.globalAlpha = pass.alpha * Math.max(0, 1 - age);
        rctx.strokeStyle = pass.color;
        rctx.lineWidth = pass.width * (0.45 + 0.55 * (1 - age));
        rctx.beginPath();
        rctx.moveTo(a.x + ox, a.y + oy);
        rctx.lineTo(b.x + ox, b.y + oy);
        rctx.stroke();
      }
    });
    rctx.globalAlpha = 1;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    // Inside the letters: a faint glow where the ribbon passes.
    ctx.globalAlpha = GLOW_WORD_INNER_GLOW;
    ctx.drawImage(cutTo("fill"), 0, 0);
    // The outlines, lit where the ribbon crosses them, with a soft bloom (where the browser can blur).
    const outlines = cutTo("stroke");
    if ("filter" in ctx) {
      ctx.filter = "blur(" + Math.round(5 * ratio) + "px)";
      ctx.globalAlpha = GLOW_WORD_BRIGHTNESS * 0.9;
      ctx.drawImage(outlines, 0, 0);
      ctx.filter = "none";
    }
    ctx.globalAlpha = GLOW_WORD_BRIGHTNESS;
    ctx.drawImage(outlines, 0, 0);
    ctx.restore();
  }

  // Copies the ribbon, keeping only the part inside the letters ("fill") or their outlines ("stroke").
  function cutTo(mode) {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.globalCompositeOperation = "source-over";
    sctx.clearRect(0, 0, scratch.width, scratch.height);
    sctx.drawImage(ribbon, 0, 0);
    sctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    sctx.globalCompositeOperation = "destination-in";
    sctx.textBaseline = "alphabetic";
    sctx.fillStyle = "#fff";
    sctx.strokeStyle = "#fff";
    sctx.lineWidth = Math.max(2, (items[0] ? items[0].size : 100) * 0.012);
    if (isJumble) {
      sctx.lineWidth = 2.2;
    }
    drawWords(sctx, mode);
    return scratch;
  }


  /* Running only while on screen. */
  let lastTime = performance.now();
  function play() {
    if (running || !visible || document.hidden) {
      return;
    }
    if (!root.classList.contains("motion")) {
      // Reduce motion: one still, fully written frame with the ribbon resting across.
      measureScroll();
      trail.length = 0;
      const now = performance.now();
      for (let i = 0; i <= 40; i++) {
        trail.push({ x: width * (0.1 + 0.8 * i / 40), y: height * (0.5 + 0.25 * Math.sin(i / 40 * Math.PI * 2)), time: now - (40 - i) * 15 });
      }
      draw(now);
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
    measureScroll();
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
