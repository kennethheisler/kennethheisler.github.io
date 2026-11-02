/* MAIN.JS: THE BEHAVIOR OF THE WEBSITE */


/* 1. SETTINGS */

// Animations: true = on, false = off.
const ANIMATIONS_ON = true;

// The theme a first-time visitor sees: "dark" or "light".
const DEFAULT_THEME = "dark";

// The screen width in pixels where the full menu appears.
// Keep this matching the "max-width" small-screen rule in css/style.css.
const DESKTOP_MENU_WIDTH = 880;

// The name used to save the theme choice in the browser.
const THEME_STORAGE_KEY = "site-theme";


/* 2. RUN RIGHT AWAY (before the page is drawn) */

// Runs immediately, before the page is drawn.
(function runBeforePageDraws() {
  const root = document.documentElement; // the <html> tag

  // Swap the class "no-js" for "js" so the CSS knows JavaScript runs.
  root.classList.remove("no-js");
  root.classList.add("js");

  // Use the saved theme, or the default one if nothing is saved yet.
  applyTheme(getSavedTheme() || DEFAULT_THEME);

  // Animation mode is on only when it is allowed (see section 7).
  if (animationsAllowed()) {
    root.classList.add("motion");
  }
})();


/* 3. START EVERYTHING ELSE (once the page has loaded) */
document.addEventListener("DOMContentLoaded", function () {
  setupThemeToggle();
  setupMobileMenu();
  highlightCurrentPage();
  setupRevealOnScroll();
  setupHeaderLine();
  fillCurrentYear();
  setupDemoForm();
});


/* 4. LIGHT / DARK THEME */

// Reads the saved theme.
function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // Storage is blocked: the theme still changes, it just isn't saved.
  }
}

// Puts data-theme="dark" or data-theme="light" on the <html> tag.
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") || DEFAULT_THEME;
}

function setupThemeToggle() {
  const button = document.querySelector(".theme-toggle");
  if (!button) {
    return; // no theme button on this page, so stop here
  }

  updateThemeButton(button);

  // Runs every time the theme button is clicked.
  button.addEventListener("click", function () {
    let newTheme = "dark";
    if (getCurrentTheme() === "dark") {
      newTheme = "light";
    }
    applyTheme(newTheme);
    saveTheme(newTheme);
    updateThemeButton(button);
  });
}

// Keeps the label true, for example "Switch to light mode".
function updateThemeButton(button) {
  let label = "Switch to dark mode";
  if (getCurrentTheme() === "dark") {
    label = "Switch to light mode";
  }
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}


/* 5. MOBILE MENU (the hamburger button) */
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


/* 6. HIGHLIGHT THE CURRENT PAGE */
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


/* 7. FADE IN ON SCROLL */

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


/* 8. HEADER LINE ON SCROLL */
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


/* 9. CURRENT YEAR IN THE FOOTER */
function fillCurrentYear() {
  const thisYear = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach(function (element) {
    element.textContent = thisYear;
  });
}


/* 10. DEMO CONTACT FORM */
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
