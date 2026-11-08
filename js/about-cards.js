/* ABOUT-CARDS.JS: THE SKILL CARDS ON THE ABOUT PAGE
   Four playing cards that get "dealt" as you scroll:
   - Wide screens: the section holds still while you scroll. The cards rise as a fanned stack,
     face down, spread out into a row, then flip over one after another. Scrolling back up plays
     it in reverse.
   - Smaller screens: each card flips over as it scrolls into view.
   - With a mouse, a face-up card leans toward the pointer.
   Without motion (reduce motion, or the animation libraries didn't load), the cards simply show
   their fronts, which is how style.css draws them.

   SECTIONS
   1. Settings
   2. Start
   3. Wide screens: the deal
   4. Smaller screens: flip as each card arrives
   5. Leaning toward the mouse */


/* 1. SETTINGS */

// How long the deal lasts on wide screens, in screen heights of scrolling (1 = one full screen).
const CARDS_DEAL_LENGTH = 1.3;

// The starting stack: how far below its spot each card starts (pixels), and how much the stacked
// cards fan out (degrees of tilt between neighbors).
const CARDS_START_DROP = 160;
const CARDS_FAN_ANGLE = 8;

// The flips: how much of the deal each flip takes (the four flips overlap a little), and how high
// a card lifts as it turns (pixels).
const CARDS_FLIP_SHARE = 0.2;
const CARDS_FLIP_LIFT = 36;

// How far a face-up card leans toward the mouse (degrees). 0 = no lean.
const CARDS_LEAN = 9;

// The deal plays on screens at least this wide (pixels); smaller screens flip card by card.
const CARDS_WIDE_SCREEN = 1100;


/* 2. START */
function startAboutCards() {
  const section = document.querySelector(".skill-cards-section");
  const root = document.documentElement;
  if (!section || !root.classList.contains("motion") ||
      typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
    return; // the cards just show their fronts
  }
  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  const cards = gsap.utils.toArray(".skill-card", section);
  const inners = cards.map(function (card) {
    return card.querySelector(".skill-card-inner");
  });
  const middle = (cards.length - 1) / 2;
  const media = gsap.matchMedia();

  // The width of one card plus the gap after it (pixels), measured fresh whenever needed.
  function step() {
    const first = cards[0].getBoundingClientRect();
    const second = cards[1] ? cards[1].getBoundingClientRect() : first;
    return Math.max(first.width, second.left - first.left);
  }


  /* 3. WIDE SCREENS: THE DEAL */
  media.add("(min-width: " + CARDS_WIDE_SCREEN + "px)", function () {
    const deal = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: function () {
          return "+=" + window.innerHeight * CARDS_DEAL_LENGTH;
        },
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true
      }
    });

    // Rise as a fanned stack in the middle, face down...
    deal.fromTo(cards, {
      x: function (i) {
        return (middle - i) * step() * 0.82; // pulled in toward the middle, slightly fanned
      },
      y: CARDS_START_DROP,
      rotation: function (i) {
        return (i - middle) * CARDS_FAN_ANGLE;
      },
      opacity: 0
    }, {
      y: function (i) {
        return Math.abs(i - middle) * 14; // the outer cards sit a little lower, like a fan in a hand
      },
      opacity: 1,
      duration: 0.22,
      ease: "power2.out",
      immediateRender: true
    }, 0);

    // ...spread out into a row...
    deal.to(cards, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.4,
      ease: "power2.inOut"
    }, 0.2);

    // ...and flip over one after another, lifting as they turn.
    inners.forEach(function (inner, i) {
      // The flips begin once the row has spread out (at 0.6 of the deal) and end with the deal.
      const start = 0.6 + i * ((1 - 0.6 - CARDS_FLIP_SHARE) / Math.max(1, cards.length - 1));
      deal.fromTo(inner, { rotationY: 0 }, {
        rotationY: 180,
        duration: CARDS_FLIP_SHARE,
        ease: "power2.inOut",
        immediateRender: true
      }, start);
      deal.to(cards[i], {
        keyframes: [
          { y: -CARDS_FLIP_LIFT, rotation: (i % 2 ? 2 : -2), duration: CARDS_FLIP_SHARE / 2, ease: "power1.out" },
          { y: 0, rotation: 0, duration: CARDS_FLIP_SHARE / 2, ease: "power1.in" }
        ]
      }, start);
    });

    // Something above the cards (like headline animations) may have changed the page's height.
    window.ScrollTrigger.refresh();

    return function () {
      gsap.set(cards.concat(inners), { clearProps: "transform,opacity" });
    };
  });


  /* 4. SMALLER SCREENS: FLIP AS EACH CARD ARRIVES */
  media.add("(max-width: " + (CARDS_WIDE_SCREEN - 1) + "px)", function () {
    cards.forEach(function (card, i) {
      const inner = inners[i];
      const flip = gsap.timeline({
        scrollTrigger: { trigger: card, start: "top 82%", toggleActions: "play none none none" }
      });
      flip.fromTo(card, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", immediateRender: true }, 0);
      flip.fromTo(inner, { rotationY: 0 }, { rotationY: 180, duration: 1, ease: "expo.inOut", immediateRender: true }, 0.25);
    });
    return function () {
      gsap.set(cards.concat(inners), { clearProps: "transform,opacity" });
    };
  });


  /* 5. LEANING TOWARD THE MOUSE (only once the card is face up) */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (finePointer.matches && CARDS_LEAN > 0) {
    cards.forEach(function (card, i) {
      const leanX = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });
      const leanY = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
      card.addEventListener("pointermove", function (event) {
        const faceUp = gsap.getProperty(inners[i], "rotationY") > 170;
        if (!faceUp || !root.classList.contains("motion")) {
          return;
        }
        const box = card.getBoundingClientRect();
        const across = (event.clientX - box.left) / box.width - 0.5;
        const down = (event.clientY - box.top) / box.height - 0.5;
        leanX(across * CARDS_LEAN * 2);
        leanY(-down * CARDS_LEAN * 2);
      });
      card.addEventListener("pointerleave", function () {
        leanX(0);
        leanY(0);
      });
    });
  }

  // "Reduce motion" switched on mid-visit: undo everything, so the cards rest face up.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.addEventListener) {
    reduceMotion.addEventListener("change", function () {
      if (reduceMotion.matches) {
        media.revert();
        gsap.set(cards.concat(inners), { clearProps: "transform,opacity" });
      }
    });
  }
}

startAboutCards();
