/* MAIN.JS: THE BEHAVIOR OF THE WEBSITE */


/* 1. SETTINGS */

// Animations: true = on, false = off. (Also switches off everything in js/motion.js.)
const ANIMATIONS_ON = true;

// The screen width in pixels where the full menu appears.
// Keep this matching the "max-width" small-screen rule in css/style.css.
const DESKTOP_MENU_WIDTH = 880;

// Safety net, in milliseconds: if the animation libraries are still downloading after this long
// (a slow or stuck connection), animations are skipped so the page never stays hidden.
const MOTION_WAIT_LIMIT = 4000;


/* 2. RUN RIGHT AWAY (before the page is drawn) */

// Runs immediately, before the page is drawn.
(function runBeforePageDraws() {
  const root = document.documentElement; // the <html> tag

  // Swap the class "no-js" for "js" so the CSS knows JavaScript runs.
  root.classList.remove("no-js");
  root.classList.add("js");

  // Animation mode is on only when it is allowed (see section 6).
  if (animationsAllowed()) {
    root.classList.add("motion");

    // The page waits for the animation libraries before it starts (see section 3).
    // If they take too long, drop "motion" so the CSS shows everything right away.
    // js/motion.js then sees there is no "motion" class and does nothing.
    // ("motion-ready" is added the moment the page starts, so if it's missing, we're still waiting.)
    window.setTimeout(function () {
      if (!root.classList.contains("motion-ready")) {
        root.classList.remove("motion");
      }
    }, MOTION_WAIT_LIMIT);
  }
})();


/* 3. START EVERYTHING ELSE (once the page has loaded) */
document.addEventListener("DOMContentLoaded", function () {
  // Tells the CSS the page is ready. By now js/motion.js has already split the
  // big headings into lines, so it is safe to show them (see CSS section 17).
  document.documentElement.classList.add("motion-ready");

  fixInPageLinks();
  setupMobileMenu();
  highlightCurrentPage();
  setupRevealOnScroll();
  setupHeaderLine();
  fillCurrentYear();
  setupDemoForm();
});


/* 3b. IN-PAGE LINKS ON THE 404 PAGE
   404.html has <base href="/"> so its pictures and styles load from any address.
   That also makes links like "#main" point to the home page, so the skip link and
   "Back to top" would leave the page. This points them back at the current page. */
function fixInPageLinks() {
  if (!document.querySelector("base")) {
    return; // only pages with a <base> tag need this
  }
  const here = window.location.pathname + window.location.search;
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.setAttribute("href", here + link.getAttribute("href"));
  });
}


/* 4. MOBILE MENU (the hamburger button) */
function setupMobileMenu() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("site-menu");
  if (!header || !toggle || !menu) {
    return;
  }

  function isOpen() {
    return toggle.getAttribute("aria-expanded") === "true";
  }

  function openMenu() {
    header.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    header.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  // The hamburger button opens a closed menu and closes an open one.
  toggle.addEventListener("click", function () {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Picking a link closes the menu.
  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  // Escape closes the menu and puts keyboard focus back on the button.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) {
      closeMenu();
      toggle.focus();
    }
  });

  // A click anywhere outside the header closes the menu.
  document.addEventListener("click", function (event) {
    if (isOpen() && !header.contains(event.target)) {
      closeMenu();
    }
  });

  // Widening the window to desktop size closes the mobile menu.
  const desktopScreen = window.matchMedia("(min-width: " + DESKTOP_MENU_WIDTH + "px)");
  if (desktopScreen.addEventListener) {
    desktopScreen.addEventListener("change", function () {
      if (desktopScreen.matches) {
        closeMenu();
      }
    });
  }
}


/* 5. HIGHLIGHT THE CURRENT PAGE */
function highlightCurrentPage() {
  const currentPage = getPageName(window.location.pathname);
  const links = document.querySelectorAll(".nav-list a");

  links.forEach(function (link) {
    if (getPageName(link.getAttribute("href")) === currentPage) {
      link.setAttribute("aria-current", "page");
    }
  });
}

// Turns an address into a simple page name.
function getPageName(path) {
  let name = path.split("/").pop();          // the last part of the address
  name = name.split("?")[0].split("#")[0];   // drop any ?extra or #section part
  name = name.replace(/\.html?$/i, "");      // drop ".html" from the end
  if (name === "") {
    name = "index";
  }
  return name.toLowerCase();
}


/* 6. FADE IN ON SCROLL (the simple version, used when js/motion.js can't run) */

// Animations run only when the switch is on and "reduce motion" is off.
function animationsAllowed() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return ANIMATIONS_ON && !reduceMotion && "IntersectionObserver" in window;
}

function setupRevealOnScroll() {
  const root = document.documentElement;
  if (!root.classList.contains("motion")) {
    return; // animations are off, so the CSS already shows everything
  }

  // js/motion.js loaded its animation libraries, so it handles the fade-ins instead.
  // (If the libraries failed to download, this simple version below runs as a backup.)
  if (typeof motionLibrariesLoaded === "function" && motionLibrariesLoaded()) {
    return;
  }

  // Reacts if "reduce motion" is turned on while the page is open.
  const reduceMotionSetting = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotionSetting.addEventListener) {
    reduceMotionSetting.addEventListener("change", function () {
      if (reduceMotionSetting.matches) {
        root.classList.remove("motion");
      }
    });
  }

  const observer = new IntersectionObserver(function (entries) {
    let order = 0;
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) {
        return;
      }
      // Staggers items that appear together.
      const delay = Math.min(order, 5) * 90;
      entry.target.style.setProperty("--reveal-delay", delay + "ms");
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target); // animate once, then stop watching
      order = order + 1;
    });
  }, {
    threshold: 0.15,                  // 15% of the item must be on screen
    rootMargin: "0px 0px -5% 0px"     // ...and a little above the bottom edge
  });

  document.querySelectorAll(".reveal").forEach(function (element) {
    observer.observe(element);
  });
}


/* 7. HEADER LINE ON SCROLL */
function setupHeaderLine() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  function update() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  update();
  // "passive: true" promises we won't block scrolling: smoother on phones.
  window.addEventListener("scroll", update, { passive: true });
}


/* 8. CURRENT YEAR IN THE FOOTER */
function fillCurrentYear() {
  const thisYear = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach(function (element) {
    element.textContent = thisYear;
  });
}


/* 9. DEMO CONTACT FORM */
function setupDemoForm() {
  document.querySelectorAll("form[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault(); // stop the normal send-and-reload

      const status = form.querySelector("[data-form-status]");
      if (status) {
        // The note visitors see after pressing the button.
        status.textContent = "Thanks! This form is a demo and isn't connected yet, so your message was not sent.";
      }
    });
  });
}
