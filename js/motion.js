/* MOTION.JS: THE MOVING PARTS OF THE WEBSITE
   Smooth "weighted" scrolling, headlines that rise into place line by line,
   fade-ins, buttons that lean toward the mouse, and a soft ring that follows the cursor.

   It uses three free animation libraries loaded in each page's <head>:
   - GSAP (animations), with its ScrollTrigger (scroll-linked) and SplitText (split text into lines) plugins
   - Lenis (smooth scrolling)
   If they fail to load, or "reduce motion" is on, this file does nothing and the site
   falls back to the simple fade-ins in js/main.js. */


/* 1. SETTINGS */

// Smooth scrolling: true = on, false = off (normal browser scrolling).
const SMOOTH_SCROLL_ON = true;

// How much the scroll "glides". Smaller = heavier and floatier, larger = snappier.
// (0.1 means the page moves 10% of the remaining distance each frame.)
const SCROLL_SMOOTHNESS = 0.1;

// When the page glides to something (like a project opening on the Projects page): the space
// left above it, under the top bar (pixels).
const GLIDE_GAP = 24;

// Which headings rise into place line by line. (".story-title" = the big step headings on the new home page.)
const HEADLINES = "main h1, main h2, .story-title";

// Headings inside these boxes are skipped: they move together with their box instead.
const HEADLINES_SKIP = ".card, .panel, .project-heading";

// Headline lines: how long each line takes to rise (seconds), and the gap between lines.
const LINE_DURATION = 1.1;
const LINE_STAGGER = 0.08;

// Fade-ins (anything with class="reveal"): length in seconds, how far they rise (pixels),
// and the gap between items that appear together (seconds).
const REVEAL_DURATION = 0.9;
const REVEAL_DISTANCE = 24;
const REVEAL_STAGGER = 0.08;

// Fade-ins inside these areas (the top of each page) play right away instead of waiting
// for the scroll position, so nothing on the first screen stays hidden.
const REVEAL_RIGHT_AWAY = ".hero, .hero-xl, .page-hero";

// The feel of every movement. "expo.out" starts fast and glides to a soft stop.
const MOTION_EASE = "expo.out";

// Magnetic buttons: buttons lean toward the mouse. Strength 0 = none, 1 = follows the mouse fully.
const MAGNETIC_BUTTONS_ON = true;
const MAGNETIC_STRENGTH = 0.3;

// Each button sits on a little spring. Springiness: higher = snappier pull back to place.
// Damping: higher = settles calmly, lower = wobbles longer.
const MAGNETIC_SPRING = 180;
const MAGNETIC_DAMPING = 14;

// Buttons side by side bump into each other instead of overlapping.
// Bounce: 0 = they just push, 1 = they bounce off fully. Gap: the closest they get (pixels).
const BUTTON_BOUNCE = 0.6;
const BUTTON_GAP = 6;

// Cursor ring: a soft circle that trails the mouse. Lag = seconds it takes to catch up.
const CURSOR_ON = true;
const CURSOR_LAG = 0.06;


/* 2. CHECK THE LIBRARIES */

// True when all the animation libraries downloaded. js/main.js also asks this question,
// so it knows whether to use its own simple fade-ins as a backup.
function motionLibrariesLoaded() {
  return typeof window.gsap !== "undefined" &&
    typeof window.ScrollTrigger !== "undefined" &&
    typeof window.SplitText !== "undefined" &&
    typeof window.Lenis !== "undefined";
}


/* 3. START (runs right away; the page is already read because this file loads with "defer") */
(function startMotion() {
  const root = document.documentElement; // the <html> tag

  // js/main.js adds "motion" only when animations are allowed. No class, or no libraries: stop here.
  if (!root.classList.contains("motion") || !motionLibrariesLoaded()) {
    return;
  }

  // Tell GSAP about its plugins.
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // Things to undo if motion is switched off later (see section 9).
  let lenis = null;          // the smooth scroller
  let scrollTicker = null;   // the function that drives it every frame
  const splits = [];         // the split-up headlines
  const cleanups = [];       // small "undo" functions (remove listeners, etc.)
  let stopped = false;

  // "Fine pointer" = a mouse or trackpad (not a finger), on a device that can hover.
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  setupSmoothScroll();
  setupHeadlines();   // must run before the fade-ins: it takes "reveal" off the headlines it animates
  setupFadeIns();
  setupMagneticButtons();
  setupCursor();
  watchReduceMotion();


  /* 4. SMOOTH SCROLLING */
  function setupSmoothScroll() {
    if (!SMOOTH_SCROLL_ON) {
      return;
    }

    // "autoRaf: false" means GSAP's clock drives Lenis (below), so both stay in step.
    // We do NOT use Lenis's "anchors" option: it would break the skip link's keyboard focus.
    lenis = new Lenis({ lerp: SCROLL_SMOOTHNESS, autoRaf: false });

    // Every time Lenis scrolls, ScrollTrigger re-checks what is on screen.
    lenis.on("scroll", ScrollTrigger.update);

    // GSAP's clock gives the time in seconds; Lenis wants milliseconds.
    scrollTicker = function (time) {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(scrollTicker);

    // Don't "catch up" after a slow frame: keeps scrolling smooth instead of jumping.
    gsap.ticker.lagSmoothing(0);

    // The phone menu scrolls on its own, so Lenis leaves it alone.
    const menu = document.getElementById("site-menu");
    if (menu) {
      menu.setAttribute("data-lenis-prevent", "");
    }

    // Keyboard users: when focus moves (Tab, or the skip link), stop any glide that's still going,
    // so it can't drag the page away from the element the browser just scrolled to.
    function onFocusMove() {
      if (lenis && lenis.isScrolling) {
        lenis.stop();
        lenis.start();
      }
    }
    document.addEventListener("focusin", onFocusMove);
    cleanups.push(function () {
      document.removeEventListener("focusin", onFocusMove);
    });

    // "Back to top" glides up, then puts keyboard focus on the name at the top left.
    document.querySelectorAll(".back-to-top").forEach(function (link) {
      function onClick(event) {
        if (!lenis) {
          return; // smooth scrolling was switched off: let the link work normally
        }
        event.preventDefault();
        // Move focus first (without an instant jump), then start the glide.
        // (In the other order, the focus change would stop the glide; see above.)
        const brand = document.querySelector(".site-header .brand");
        if (brand) {
          brand.focus({ preventScroll: true });
        }
        lenis.scrollTo(0);
      }
      link.addEventListener("click", onClick);
      cleanups.push(function () {
        link.removeEventListener("click", onClick);
      });
    });

    // Glide helpers for other scripts (js/projects.js uses them when a project opens):
    // siteGlideTo(element) glides until the element sits just under the top bar;
    // siteJumpBy(pixels) moves the page instantly without upsetting the smooth scroller.
    // Both answer false when smooth scrolling is off, so the caller can scroll the normal way.
    window.siteGlideTo = function (element) {
      if (!lenis || !element) {
        return false;
      }
      // Where to stop: the element's place on the page, minus the top bar and a small gap.
      // (Measured from the browser's own scroll position, which is always up to date.)
      const header = document.querySelector(".site-header");
      const headerHeight = header ? header.offsetHeight : 0;
      const spot = element.getBoundingClientRect().top + window.scrollY - headerHeight - GLIDE_GAP;
      lenis.scrollTo(Math.max(0, spot));
      return true;
    };
    window.siteJumpBy = function (pixels) {
      if (!lenis) {
        return false;
      }
      lenis.scrollTo(window.scrollY + pixels, { immediate: true, force: true });
      return true;
    };
    cleanups.push(function () {
      window.siteGlideTo = null;
      window.siteJumpBy = null;
    });
  }


  /* 5. HEADLINES RISE LINE BY LINE */
  function setupHeadlines() {
    document.querySelectorAll(HEADLINES).forEach(function (heading) {
      if (heading.closest(HEADLINES_SKIP)) {
        return; // inside a card or panel: it moves with its box instead
      }

      // This heading gets its own animation, so it no longer needs the plain fade-in.
      heading.classList.remove("reveal");

      // SplitText wraps each line in a "mask" (a window that hides anything outside it),
      // then each line slides up from just below its window.
      // "autoSplit" re-splits if the font finishes loading or the screen width changes.
      // Screen readers still read the whole heading: SplitText puts the full text in an
      // aria-label and hides the separate line pieces from them.
      const split = SplitText.create(heading, {
        type: "lines",
        linesClass: "split-line",
        mask: "lines",
        autoSplit: true,
        onSplit: function (self) {
          // Returning the animation lets SplitText tidy it up when it re-splits.
          return gsap.from(self.lines, {
            yPercent: 110,              // start just below the window (hidden)
            duration: LINE_DURATION,
            ease: MOTION_EASE,
            stagger: LINE_STAGGER,
            scrollTrigger: {
              trigger: heading,
              start: "top 90%",         // when the heading's top passes 90% down the screen
              once: true                // play once, then stop watching
            }
          });
        }
      });
      splits.push(split);
    });
  }


  /* 6. FADE-INS (anything with class="reveal") */
  function setupFadeIns() {
    const items = gsap.utils.toArray(".reveal");
    if (items.length === 0) {
      return;
    }

    // Start invisible and a little lower. "transition: none" pauses the CSS hover transitions on
    // cards while GSAP moves them, so the two don't fight (it's removed again afterwards).
    gsap.set(items, { opacity: 0, y: REVEAL_DISTANCE, transition: "none" });

    // Show one item straight away (no waiting for the scroll position).
    function revealNow(item) {
      item.dataset.revealed = "true"; // so the scroll fade-in below leaves it alone
      gsap.to(item, {
        opacity: 1,
        y: 0,
        duration: REVEAL_DURATION,
        ease: MOTION_EASE,
        overwrite: true,
        clearProps: "transform,transition"
      });
    }

    // Keyboard users: if Tab lands on something inside a block that hasn't faded in yet,
    // show that block right away so the focus ring is never invisible.
    function onFocusIn(event) {
      const block = event.target instanceof Element ? event.target.closest(".reveal") : null;
      if (block && parseFloat(getComputedStyle(block).opacity) < 1) {
        revealNow(block);
      }
    }
    document.addEventListener("focusin", onFocusIn);
    cleanups.push(function () {
      document.removeEventListener("focusin", onFocusIn);
    });

    // Items at the top of the page: fade in now, one after another.
    const rightAway = items.filter(function (item) {
      return item.closest(REVEAL_RIGHT_AWAY);
    });
    if (rightAway.length > 0) {
      gsap.to(rightAway, {
        opacity: 1,
        y: 0,
        duration: REVEAL_DURATION,
        ease: MOTION_EASE,
        stagger: REVEAL_STAGGER,
        delay: 0.1,
        clearProps: "transform,transition"
      });
    }
    const later = items.filter(function (item) {
      return rightAway.indexOf(item) === -1;
    });

    // "batch" groups items that come into view together, so they can appear one after another.
    ScrollTrigger.batch(later, {
      start: "top 90%",
      once: true,
      onEnter: function (batch) {
        // Skip anything already shown (for example by the keyboard, above).
        const waiting = batch.filter(function (item) {
          return !item.dataset.revealed;
        });
        if (waiting.length === 0) {
          return;
        }
        gsap.to(waiting, {
          opacity: 1,
          y: 0,
          duration: REVEAL_DURATION,
          ease: MOTION_EASE,
          stagger: REVEAL_STAGGER,
          overwrite: true,
          // Afterwards, remove the movement GSAP added, so the CSS hover lift on cards still works.
          clearProps: "transform,transition"
        });
      }
    });
  }


  /* 7. MAGNETIC BUTTONS (mouse and trackpad only)
     Each button is a little "body" on a spring. The one under the mouse is pulled toward it;
     buttons in the same row bump into each other instead of overlapping, bounce apart, and
     spring back to their places. A tiny physics step runs every frame, only while something moves. */
  function setupMagneticButtons() {
    if (!MAGNETIC_BUTTONS_ON || !finePointer.matches) {
      return;
    }

    // 7a. One body per button, grouped by the row they sit in (only neighbors can bump).
    const groups = new Map();
    const bodies = [];
    document.querySelectorAll(".btn").forEach(function (button) {
      const row = button.closest(".button-row") || button;
      if (!groups.has(row)) {
        groups.set(row, []);
      }
      // x, y = how far it has moved; vx, vy = its speed; targetX, targetY = where the mouse pulls it.
      const body = { el: button, x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0, hovered: false, rest: null, group: groups.get(row) };
      body.group.push(body);
      bodies.push(body);
    });

    // 7b. Measure where each button in a row sits at rest (its box, minus how far it has moved).
    function measure(group) {
      group.forEach(function (body) {
        const box = body.el.getBoundingClientRect();
        body.rest = { left: box.left - body.x, top: box.top - body.y, width: box.width, height: box.height };
      });
    }

    // 7c. Mouse over a button: pull it toward the mouse (distance from its resting center x strength).
    function onMove(event) {
      const body = this.magnetBody;
      measure(body.group);
      body.hovered = true;
      body.targetX = (event.clientX - (body.rest.left + body.rest.width / 2)) * MAGNETIC_STRENGTH;
      body.targetY = (event.clientY - (body.rest.top + body.rest.height / 2)) * MAGNETIC_STRENGTH;
      wake();
    }

    // Mouse leaves: let the spring bring it home.
    function onLeave() {
      const body = this.magnetBody;
      body.hovered = false;
      body.targetX = 0;
      body.targetY = 0;
      wake();
    }

    bodies.forEach(function (body) {
      body.el.magnetBody = body;
      body.el.addEventListener("pointermove", onMove);
      body.el.addEventListener("pointerleave", onLeave);
    });

    // 7d. Two buttons too close? Push them apart and bounce them off each other.
    function collide(a, b) {
      if (!a.rest || !b.rest) {
        return;
      }
      // Each button's current box, grown by half the gap on every side.
      const half = BUTTON_GAP / 2;
      const aLeft = a.rest.left + a.x - half;
      const aTop = a.rest.top + a.y - half;
      const bLeft = b.rest.left + b.x - half;
      const bTop = b.rest.top + b.y - half;
      const overlapX = Math.min(aLeft + a.rest.width + BUTTON_GAP, bLeft + b.rest.width + BUTTON_GAP) - Math.max(aLeft, bLeft);
      const overlapY = Math.min(aTop + a.rest.height + BUTTON_GAP, bTop + b.rest.height + BUTTON_GAP) - Math.max(aTop, bTop);
      if (overlapX <= 0 || overlapY <= 0) {
        return; // not touching
      }

      // The button under the mouse is "heavier", so it mostly shoves the other one.
      const massA = a.hovered ? 3 : 1;
      const massB = b.hovered ? 3 : 1;
      const shareA = massB / (massA + massB);
      const shareB = massA / (massA + massB);

      // Separate along the side with the smaller overlap (side by side = left/right).
      const sideways = overlapX < overlapY;
      const key = sideways ? "x" : "y";
      const speed = sideways ? "vx" : "vy";
      const overlap = sideways ? overlapX : overlapY;
      const aCenter = sideways ? aLeft + a.rest.width / 2 : aTop + a.rest.height / 2;
      const bCenter = sideways ? bLeft + b.rest.width / 2 : bTop + b.rest.height / 2;
      const direction = bCenter >= aCenter ? 1 : -1;
      a[key] -= direction * overlap * shareA;
      b[key] += direction * overlap * shareB;

      // Bounce: if they're moving toward each other, swap some of that speed back out.
      const closing = (b[speed] - a[speed]) * direction;
      if (closing < 0) {
        const kick = -(1 + BUTTON_BOUNCE) * closing / (1 / massA + 1 / massB);
        a[speed] -= direction * kick / massA;
        b[speed] += direction * kick / massB;
      }
    }

    // 7e. One physics step per frame: springs, then bumps, then move the buttons on screen.
    let awake = false;
    function step() {
      // Seconds since the last frame (deltaRatio = 1 at 60 frames per second), capped after a pause.
      const dt = Math.min(gsap.ticker.deltaRatio() / 60, 1 / 30);
      const substep = dt / 2; // two small steps are steadier than one big one
      let moving = false;

      for (let pass = 0; pass < 2; pass++) {
        bodies.forEach(function (b) {
          // Spring pull toward the target, minus damping (friction).
          b.vx += (MAGNETIC_SPRING * (b.targetX - b.x) - MAGNETIC_DAMPING * b.vx) * substep;
          b.vy += (MAGNETIC_SPRING * (b.targetY - b.y) - MAGNETIC_DAMPING * b.vy) * substep;
          b.x += b.vx * substep;
          b.y += b.vy * substep;
        });
        groups.forEach(function (group) {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              collide(group[i], group[j]);
            }
          }
        });
      }

      bodies.forEach(function (b) {
        const settled = !b.hovered && Math.abs(b.x) < 0.05 && Math.abs(b.y) < 0.05 && Math.abs(b.vx) < 0.05 && Math.abs(b.vy) < 0.05;
        if (settled) {
          b.x = b.y = b.vx = b.vy = 0;
          gsap.set(b.el, { clearProps: "transform" });
        } else {
          moving = true;
          gsap.set(b.el, { x: b.x, y: b.y });
        }
      });

      // Everything is back at rest: stop running the physics until the mouse returns.
      if (!moving) {
        gsap.ticker.remove(step);
        awake = false;
      }
    }

    function wake() {
      if (!awake) {
        awake = true;
        gsap.ticker.add(step);
      }
    }

    cleanups.push(function () {
      gsap.ticker.remove(step);
      bodies.forEach(function (body) {
        body.el.removeEventListener("pointermove", onMove);
        body.el.removeEventListener("pointerleave", onLeave);
        delete body.el.magnetBody;
      });
    });
  }


  /* 8. CURSOR RING (mouse and trackpad only; the normal arrow stays visible too) */
  function setupCursor() {
    if (!CURSOR_ON || !finePointer.matches) {
      return;
    }

    // Things the ring grows over.
    const INTERACTIVE = "a, button, input, textarea, select, label, [role='button']";

    // Build <div class="cursor"><div class="cursor-ring"></div></div>.
    // aria-hidden: it is decoration only, so screen readers ignore it.
    const cursor = document.createElement("div");
    cursor.className = "cursor is-hidden"; // hidden until the mouse first moves
    cursor.setAttribute("aria-hidden", "true");
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    cursor.appendChild(ring);
    document.body.appendChild(cursor);

    const moveX = gsap.quickTo(cursor, "x", { duration: CURSOR_LAG, ease: "power3.out" });
    const moveY = gsap.quickTo(cursor, "y", { duration: CURSOR_LAG, ease: "power3.out" });
    let hasMoved = false;

    function onMove(event) {
      if (event.pointerType && event.pointerType !== "mouse") {
        return; // pen or finger: no ring
      }
      if (!hasMoved) {
        // First move: jump straight to the mouse instead of flying in from the corner.
        // (The second number is the starting point.)
        moveX(event.clientX, event.clientX);
        moveY(event.clientY, event.clientY);
        hasMoved = true;
      } else {
        moveX(event.clientX);
        moveY(event.clientY);
      }
      cursor.classList.remove("is-hidden");
    }

    // Grow the ring over links, buttons and form fields.
    function onOver(event) {
      const target = event.target instanceof Element ? event.target : null;
      cursor.classList.toggle("is-active", Boolean(target && target.closest(INTERACTIVE)));
    }

    // Hide it when the mouse leaves the window.
    function onLeavePage() {
      cursor.classList.add("is-hidden");
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeavePage);

    cleanups.push(function () {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeavePage);
      gsap.killTweensOf(cursor);
      cursor.remove();
    });
  }


  /* 9. SWITCH EVERYTHING OFF IF "REDUCE MOTION" IS TURNED ON DURING A VISIT */
  function watchReduceMotion() {
    const reduceMotionSetting = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotionSetting.addEventListener) {
      reduceMotionSetting.addEventListener("change", function () {
        if (reduceMotionSetting.matches) {
          stopAllMotion();
        }
      });
    }
  }

  function stopAllMotion() {
    if (stopped) {
      return;
    }
    stopped = true;

    // Stop smooth scrolling and hand scrolling back to the browser.
    if (lenis) {
      gsap.ticker.remove(scrollTicker);
      lenis.destroy();
      lenis = null;
    }

    // Stop watching the scroll position, and put headlines back to plain text.
    ScrollTrigger.getAll().forEach(function (trigger) {
      trigger.kill();
    });
    splits.forEach(function (split) {
      split.revert();
    });

    // Remove listeners and the cursor ring.
    cleanups.forEach(function (undo) {
      undo();
    });

    // Remove any leftover movement or fading so everything shows in its normal place.
    const moved = gsap.utils.toArray(".reveal, .btn");
    gsap.killTweensOf(moved);
    gsap.set(moved, { clearProps: "opacity,transform,transition" });

    // CSS: no "motion" class = no transitions and everything visible.
    document.documentElement.classList.remove("motion");
  }
})();
