/* PROJECTS.JS: OPENING THE PROJECTS AND THEIR NOTES
   On the Projects page, each project is one line. Clicking it (or Enter or Space on it) opens the
   project right where it is: its chart drifts in out of a blur, large and glowing (js/project-glow.js
   draws the smoke), with a short note sitting in the chart's emptiest spot.

   The note opens into the full write-up:
   - hover it with the mouse (it closes again when you move away),
   - click or tap it, or press "More" (it then stays open until you click again or press Escape).
   As it opens, its see-through background turns into dark glass that covers the chart behind it.

   Also:
   - Only one project is open at a time.
   - A link to one project (like portfolio.html#vr2) opens that project.
   - Searching the page (Ctrl+F) finds words inside closed projects and notes and opens them
     (in browsers that support it).
   - Without JavaScript, every project and note simply shows open.
   Animations use GSAP when motion is on; otherwise everything opens instantly. */


/* 1. SETTINGS */

// Seconds a project takes to open and to close.
const PROJECT_OPEN_TIME = 0.9;
const PROJECT_CLOSE_TIME = 0.5;

// true = opening one project closes the one that was open; false = several can be open at once.
const ONE_PROJECT_AT_A_TIME = true;

// Seconds a note takes to open into the full write-up, and to fold back to its summary.
const NOTE_OPEN_TIME = 0.6;
const NOTE_CLOSE_TIME = 0.35;

// When the mouse leaves an open note, wait this long (seconds) before folding it, so a small
// slip of the mouse doesn't snap it shut.
const NOTE_CLOSE_DELAY = 0.35;


/* 2. START */
(function startProjects() {
  const list = document.querySelector(".project-index");
  if (!list) {
    return;
  }
  const root = document.documentElement;
  const projects = Array.from(list.querySelectorAll(".project"));
  const wideScreen = window.matchMedia("(min-width: 900px)");

  // Is motion on, with GSAP loaded? (js/main.js adds "motion"; it's removed if "reduce motion" turns on.)
  function animating() {
    return root.classList.contains("motion") && typeof window.gsap !== "undefined";
  }

  function partsOf(project) {
    return {
      button: project.querySelector(".project-row"),
      panel: project.querySelector(".project-panel"),
      stage: project.querySelector(".project-stage"),
      visual: project.querySelector(".project-visual"),
      note: project.querySelector(".project-note"),
      more: project.querySelector(".project-more"),
      details: project.querySelector(".project-details")
    };
  }

  // Tells js/project-glow.js (and anything else listening) that a project opened or closed.
  function announce(name, project) {
    document.dispatchEvent(new CustomEvent(name, { detail: { project: project } }));
  }

  // Close every project and note to begin with. "until-found" lets the browser's Find (Ctrl+F)
  // still search the words inside, and open them when it finds a match.
  projects.forEach(function (project) {
    const parts = partsOf(project);
    parts.button.setAttribute("aria-expanded", "false");
    parts.panel.setAttribute("hidden", "until-found");
    parts.more.setAttribute("aria-expanded", "false");
    parts.details.setAttribute("hidden", "until-found");

    parts.button.addEventListener("click", function () {
      if (project.classList.contains("is-open")) {
        close(project, true);
      } else {
        open(project, true);
      }
    });

    project.querySelector(".project-close").addEventListener("click", function () {
      close(project, true);
      parts.button.focus({ preventScroll: true });
      bringIntoView(project);
    });

    // Ctrl+F found something inside: open the project, and the note if the match is in it.
    parts.panel.addEventListener("beforematch", function () {
      open(project, false, true);
    });
    parts.details.addEventListener("beforematch", function () {
      if (!project.classList.contains("is-open")) {
        open(project, false, true);
      }
      openNote(project, false, true);
    });

    setUpNote(project);
  });
  list.classList.add("is-ready");

  // A link to one project (portfolio.html#vr2), on arrival and whenever the address changes.
  function openFromAddress(animate) {
    const id = decodeURIComponent(location.hash.slice(1));
    const project = id && document.getElementById(id);
    if (project && project.classList.contains("project") && !project.classList.contains("is-open")) {
      open(project, animate);
    }
  }
  openFromAddress(false);
  window.addEventListener("hashchange", function () {
    openFromAddress(true);
  });

  // The window changed size: the open project re-measures the room its note needs.
  window.addEventListener("resize", function () {
    projects.forEach(function (project) {
      if (project.classList.contains("is-open")) {
        makeRoomForNote(project);
      }
    });
  });


  /* 3. OPEN A PROJECT */
  function open(project, animate, stayPut) {
    const parts = partsOf(project);

    if (ONE_PROJECT_AT_A_TIME) {
      projects.forEach(function (other) {
        if (other !== project && other.classList.contains("is-open")) {
          closeInstantlyKeepingPlace(other, project);
        }
      });
    }

    project.classList.add("is-open");
    parts.button.setAttribute("aria-expanded", "true");
    parts.panel.removeAttribute("hidden");
    makeRoomForNote(project);
    announce("project-open", project);

    // Show this project's address (#vr2) so it can be shared, without jumping the page.
    if (window.history && history.replaceState) {
      history.replaceState(null, "", "#" + project.id);
    }

    if (animate && animating()) {
      const gsap = window.gsap;
      gsap.killTweensOf([parts.panel, parts.visual, parts.note]);
      // The panel grows from nothing to its full height.
      gsap.fromTo(parts.panel, { height: 0 }, {
        height: "auto",
        duration: PROJECT_OPEN_TIME,
        ease: "expo.out",
        clearProps: "height",
        onComplete: layoutChanged
      });
      // The chart and its smoke drift in out of a blur, like they're coming into focus.
      gsap.fromTo(parts.visual,
        { opacity: 0, scale: 1.05, filter: "blur(20px)" },
        {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
          duration: PROJECT_OPEN_TIME * 1.8,
          ease: "expo.out",
          clearProps: "opacity,transform,filter"
        });
      // Then the note fades up into its spot.
      gsap.fromTo(parts.note,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: PROJECT_OPEN_TIME, ease: "expo.out", delay: 0.35, clearProps: "opacity,transform" });
    } else {
      layoutChanged();
    }

    if (!stayPut) {
      bringIntoView(project);
    }
  }


  /* 4. CLOSE A PROJECT */
  function close(project, animate) {
    const parts = partsOf(project);
    project.classList.remove("is-open");
    parts.button.setAttribute("aria-expanded", "false");
    closeNote(project, false);
    announce("project-close", project);
    if (location.hash === "#" + project.id && window.history && history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }

    function fold() {
      parts.panel.setAttribute("hidden", "until-found");
      layoutChanged();
    }

    if (animate && animating()) {
      const gsap = window.gsap;
      gsap.killTweensOf([parts.panel, parts.visual, parts.note]);
      gsap.to(parts.panel, {
        height: 0,
        duration: PROJECT_CLOSE_TIME,
        ease: "power3.inOut",
        clearProps: "height",
        onComplete: fold
      });
    } else {
      fold();
    }
  }

  // Closes a project at once. If it sat above the one being opened, the page is shifted up by the
  // same amount, so what's on screen doesn't jump.
  function closeInstantlyKeepingPlace(project, opening) {
    const above = project.compareDocumentPosition(opening) & Node.DOCUMENT_POSITION_FOLLOWING;
    const before = opening.getBoundingClientRect().top;
    if (window.gsap) {
      const parts = partsOf(project);
      window.gsap.killTweensOf([parts.panel, parts.visual, parts.note]);
      window.gsap.set(parts.panel, { clearProps: "height" });
    }
    close(project, false);
    if (above) {
      const shift = opening.getBoundingClientRect().top - before;
      if (shift !== 0) {
        jumpBy(shift);
      }
    }
  }


  /* 5. THE NOTE: hover, click or "More" opens it into the full write-up */
  function setUpNote(project) {
    const parts = partsOf(project);
    let closeTimer = null;

    // Mouse: open while pointing at the note, fold shortly after leaving (unless it was clicked open).
    parts.note.addEventListener("pointerenter", function (event) {
      if (event.pointerType !== "mouse") {
        return;
      }
      clearTimeout(closeTimer);
      openNote(project, true, false);
    });
    parts.note.addEventListener("pointerleave", function (event) {
      if (event.pointerType !== "mouse" || parts.note.classList.contains("is-pinned")) {
        return;
      }
      clearTimeout(closeTimer);
      closeTimer = setTimeout(function () {
        if (!parts.note.matches(":focus-within")) {
          closeNote(project, true);
        }
      }, NOTE_CLOSE_DELAY * 1000);
    });

    // Click or tap: on the "More" button, or anywhere on the note that isn't a link or button,
    // pins it open (or folds it if it was already pinned).
    parts.more.addEventListener("click", function () {
      togglePinned(project);
    });
    parts.note.addEventListener("click", function (event) {
      if (event.target.closest("a, button")) {
        return; // links and buttons inside the note do their own thing
      }
      if (window.getSelection && String(window.getSelection()).length > 0) {
        return; // the visitor is selecting text to copy, not clicking
      }
      togglePinned(project);
    });

    // Escape folds an open note and puts keyboard focus back on "More".
    parts.note.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && parts.note.classList.contains("is-expanded")) {
        closeNote(project, true);
        parts.more.focus();
      }
    });
  }

  function togglePinned(project) {
    const note = partsOf(project).note;
    if (note.classList.contains("is-pinned")) {
      closeNote(project, true);
    } else {
      openNote(project, true, true);
    }
  }

  function openNote(project, animate, pin) {
    const parts = partsOf(project);
    if (pin) {
      parts.note.classList.add("is-pinned");
    }
    if (parts.note.classList.contains("is-expanded")) {
      return;
    }
    parts.note.classList.add("is-expanded");
    parts.more.setAttribute("aria-expanded", "true");
    parts.more.querySelector(".project-more-label").textContent = "Less";
    parts.details.removeAttribute("hidden");
    if (animate && animating()) {
      const gsap = window.gsap;
      gsap.killTweensOf(parts.details);
      gsap.fromTo(parts.details,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: NOTE_OPEN_TIME, ease: "expo.out", clearProps: "height,opacity" });
    }
  }

  function closeNote(project, animate) {
    const parts = partsOf(project);
    parts.note.classList.remove("is-pinned");
    if (!parts.note.classList.contains("is-expanded")) {
      return;
    }
    parts.note.classList.remove("is-expanded");
    parts.more.setAttribute("aria-expanded", "false");
    parts.more.querySelector(".project-more-label").textContent = "More";

    function fold() {
      parts.details.setAttribute("hidden", "until-found");
    }
    if (animate && animating()) {
      const gsap = window.gsap;
      gsap.killTweensOf(parts.details);
      gsap.to(parts.details, {
        height: 0,
        opacity: 0,
        duration: NOTE_CLOSE_TIME,
        ease: "power3.inOut",
        clearProps: "height,opacity",
        onComplete: fold
      });
    } else {
      fold();
    }
  }

  // On wide screens the note floats over the chart. Its spot comes from the stage's settings:
  // --note-x is a share of the stage's width; --note-y is a share of the chart's height, measured
  // from the chart's top (so the note stays on the same part of the chart at any size).
  // Then the stage is made tall enough for the note when it's fully open, so it never spills out
  // below. (Measured whenever a project opens and when the window changes size.)
  function makeRoomForNote(project) {
    const parts = partsOf(project);
    parts.stage.style.minHeight = "";
    if (!wideScreen.matches) {
      return;
    }
    const chart = parts.stage.querySelector(".project-chart");
    const noteY = parseFloat(getComputedStyle(parts.stage).getPropertyValue("--note-y")) / 100;
    if (chart && !isNaN(noteY)) {
      const chartBox = chart.getBoundingClientRect();
      const stageBox = parts.stage.getBoundingClientRect();
      const top = chartBox.top - stageBox.top + chartBox.height * noteY;
      parts.stage.style.setProperty("--note-top", Math.round(top) + "px");
    }
    // Measure the note as it looks fully open (wider, with its write-up showing), then put it back.
    const wasHidden = parts.details.hasAttribute("hidden");
    const wasExpanded = parts.note.classList.contains("is-expanded");
    parts.note.style.transition = "none";
    parts.details.removeAttribute("hidden");
    parts.note.classList.add("is-expanded");
    const needed = parts.note.offsetTop + parts.note.offsetHeight + 32;
    if (!wasExpanded) {
      parts.note.classList.remove("is-expanded");
    }
    if (wasHidden) {
      parts.details.setAttribute("hidden", "until-found");
    }
    parts.note.offsetWidth; // let the browser settle the measured size before transitions return
    parts.note.style.transition = "";
    if (needed > parts.stage.offsetHeight) {
      parts.stage.style.minHeight = needed + "px";
    }
  }


  /* 6. SCROLLING HELPERS */

  // Glides the project's line to just under the top bar (or jumps there with motion off).
  function bringIntoView(project) {
    if (typeof window.siteGlideTo === "function" && window.siteGlideTo(project)) {
      return; // js/motion.js is gliding there
    }
    project.scrollIntoView({ block: "start" });
  }

  // Moves the page instantly by a number of pixels (through the smooth scroller when it's on).
  function jumpBy(pixels) {
    if (typeof window.siteJumpBy === "function" && window.siteJumpBy(pixels)) {
      return;
    }
    window.scrollBy(0, pixels);
  }

  // The page got taller or shorter: let the scroll-linked effects measure again.
  function layoutChanged() {
    if (window.ScrollTrigger && root.classList.contains("motion")) {
      window.ScrollTrigger.refresh();
    }
  }
})();
