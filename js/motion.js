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

// Which headings rise into place line by line. (".story-title" = the big step headings on the new home page.)
const HEADLINES = "main h1, main h2, .story-title";

// Headings inside these boxes are skipped: they move together with their box instead.
const HEADLINES_SKIP = ".card, .media-card, .panel";

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

// Cursor ring: a soft circle that trails the mouse. Lag = seconds it takes to catch up.
const CURSOR_ON = true;
const CURSOR_LAG = 0.12;


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
        gsap.to(batch, {
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


  /* 7. MAGNETIC BUTTONS (mouse and trackpad only) */
  function setupMagneticButtons() {
    if (!MAGNETIC_BUTTONS_ON || !finePointer.matches) {
      return;
    }

    document.querySelectorAll(".btn").forEach(function (button) {
      // "quickTo" makes a reusable, smooth mover for one property.
      const moveX = gsap.quickTo(button, "x", { duration: 0.6, ease: "expo.out" });
      const moveY = gsap.quickTo(button, "y", { duration: 0.6, ease: "expo.out" });

      // Lean toward the mouse: the distance from the button's resting center, times the strength.
      function onMove(event) {
        const box = button.getBoundingClientRect();
        // The box includes how far the button has already moved, so take that away
        // to find where its center sits at rest.
        const restX = box.left - gsap.getProperty(button, "x") + box.width / 2;
        const restY = box.top - gsap.getProperty(button, "y") + box.height / 2;
        moveX((event.clientX - restX) * MAGNETIC_STRENGTH);
        moveY((event.clientY - restY) * MAGNETIC_STRENGTH);
      }

      // Settle back to the middle when the mouse leaves.
      function onLeave() {
        moveX(0);
        moveY(0);
      }

      button.addEventListener("pointermove", onMove);
      button.addEventListener("pointerleave", onLeave);
      cleanups.push(function () {
        button.removeEventListener("pointermove", onMove);
        button.removeEventListener("pointerleave", onLeave);
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
