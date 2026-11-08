/* PROJECTS.JS: OPENING AND CLOSING THE PROJECTS
   On the Projects page, each project is one line. Clicking it (or pressing Enter or Space on it)
   opens that project right where it is: the chart fades in like a soft background and the
   write-up appears beside it. Clicking again, or "Close", folds it back up.

   - Only one project is open at a time, so the page stays short and easy to scan.
   - A link to one project (like portfolio.html#vr2) opens that project.
   - Searching the page (Ctrl+F) finds words inside closed projects and opens them (in browsers that
     support it).
   - Without JavaScript, every project simply shows open.
   The opening and closing animations use GSAP when motion is on; otherwise projects open instantly. */


/* 1. SETTINGS */

// Seconds a project takes to open and to close.
const PROJECT_OPEN_TIME = 0.9;
const PROJECT_CLOSE_TIME = 0.5;

// true = opening one project closes the one that was open; false = several can be open at once.
const ONE_PROJECT_AT_A_TIME = true;

// When a project opens, how far its words rise as they fade in (pixels), and the gap between them (seconds).
const PROJECT_TEXT_RISE = 24;
const PROJECT_TEXT_STAGGER = 0.06;


/* 2. START */
(function startProjects() {
  const list = document.querySelector(".project-index");
  if (!list) {
    return;
  }
  const root = document.documentElement;
  const projects = Array.from(list.querySelectorAll(".project"));

  // Is motion on, with GSAP loaded? (js/main.js adds "motion"; it's removed if "reduce motion" turns on.)
  function animating() {
    return root.classList.contains("motion") && typeof window.gsap !== "undefined";
  }

  function partsOf(project) {
    return {
      button: project.querySelector(".project-row"),
      panel: project.querySelector(".project-panel"),
      chart: project.querySelector(".project-chart"),
      words: project.querySelectorAll(".project-text > *")
    };
  }

  // Close every project to begin with. "until-found" lets the browser's Find (Ctrl+F) still search
  // the words inside, and open the project when it finds a match.
  projects.forEach(function (project) {
    const parts = partsOf(project);
    parts.button.setAttribute("aria-expanded", "false");
    parts.panel.setAttribute("hidden", "until-found");

    parts.button.addEventListener("click", function () {
      if (project.classList.contains("is-open")) {
        close(project, true);
      } else {
        open(project, true);
      }
    });

    const closeButton = project.querySelector(".project-close");
    if (closeButton) {
      closeButton.addEventListener("click", function () {
        close(project, true);
        parts.button.focus({ preventScroll: true });
        bringIntoView(project);
      });
    }

    // Ctrl+F found something inside a closed project: open it (without the animation).
    parts.panel.addEventListener("beforematch", function () {
      open(project, false, true);
    });
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


  /* 3. OPEN */
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

    // Show this project's address (#vr2) so it can be shared, without jumping the page.
    if (window.history && history.replaceState) {
      history.replaceState(null, "", "#" + project.id);
    }

    if (animate && animating()) {
      const gsap = window.gsap;
      gsap.killTweensOf([parts.panel, parts.chart, parts.words]);
      // The panel grows from nothing to its full height.
      gsap.fromTo(parts.panel, { height: 0 }, {
        height: "auto",
        duration: PROJECT_OPEN_TIME,
        ease: "expo.out",
        clearProps: "height",
        onComplete: layoutChanged
      });
      // The chart drifts in out of a blur, like it's coming into focus.
      if (parts.chart) {
        gsap.fromTo(parts.chart,
          { opacity: 0, scale: 1.04, filter: "blur(18px)" },
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: PROJECT_OPEN_TIME * 1.6,
            ease: "expo.out",
            clearProps: "opacity,transform,filter"
          });
      }
      // The words rise in one after another.
      gsap.fromTo(parts.words,
        { opacity: 0, y: PROJECT_TEXT_RISE },
        {
          opacity: 1,
          y: 0,
          duration: PROJECT_OPEN_TIME,
          ease: "expo.out",
          delay: 0.12,
          stagger: PROJECT_TEXT_STAGGER,
          clearProps: "opacity,transform"
        });
    } else {
      layoutChanged();
    }

    if (!stayPut) {
      bringIntoView(project);
    }
  }


  /* 4. CLOSE */
  function close(project, animate) {
    const parts = partsOf(project);
    project.classList.remove("is-open");
    parts.button.setAttribute("aria-expanded", "false");
    if (location.hash === "#" + project.id && window.history && history.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }

    function fold() {
      parts.panel.setAttribute("hidden", "until-found");
      layoutChanged();
    }

    if (animate && animating()) {
      const gsap = window.gsap;
      gsap.killTweensOf([parts.panel, parts.chart, parts.words]);
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
      window.gsap.killTweensOf([parts.panel, parts.chart, parts.words]);
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


  /* 5. SCROLLING HELPERS */

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
