/* =====================================================================
   MAIN.JS: THE BEHAVIOR OF THE WEBSITE
   ---------------------------------------------------------------------
   WHAT: The one JavaScript file shared by every page. JavaScript (JS)
         lets a page react to people: clicks, key presses, scrolling.
   DOES: 1. Remembers light or dark mode.
         2. Opens and closes the mobile menu.
         3. Highlights the current page in the menu.
         4. Fades content in as you scroll (when animations are on).
         5. Adds a line under the header once the page scrolls.
         6. Puts the current year in the footer.
         7. Stops the demo contact form from reloading the page.
   EDIT: Change the SETTINGS in section 1. You don't need to touch
         anything else to use the template.

   JARGON BUSTER
     variable  = a named box that holds a value:  const name = "value";
     function  = a named list of steps you can run ("call") later.
     element   = one HTML tag on the page, such as a <button>.
     event     = something that happens (a click, a key press) that the
                 code can listen for and respond to.
     document  = the whole web page, as JavaScript sees it.
     //        = starts a comment. The browser ignores the rest of the line.
   ===================================================================== */


/* =====================================================================
   1. SETTINGS
   ---------------------------------------------------------------------
   WHAT: The switches you are most likely to change.
   DOES: Control the animations, the starting theme, and the screen
         width where the hamburger menu turns into the full menu.
   EDIT: Change only the values after the = sign. Keep the quotes
         around words such as "dark".
   ===================================================================== */

// EDIT ME: ANIMATION ON/OFF SWITCH (the one easy switch)
//   true  = content fades in as you scroll, and cards, pictures, and
//           buttons move slightly when you point at them.
//   false = everything stays still.
// Visitors who turn on "reduce motion" in their device settings always
// get the still version, whatever this says.
const ANIMATIONS_ON = true;

// EDIT ME: The theme a first-time visitor sees: "dark" or "light".
const DEFAULT_THEME = "dark";

// EDIT ME (rarely): The width in pixels where the full menu appears.
// It must match the 767px / 768px rules in css/style.css (section 7).
const DESKTOP_MENU_WIDTH = 768;

// The name used to save the theme choice in the browser. Any name works.
const THEME_STORAGE_KEY = "site-theme";


/* =====================================================================
   2. RUN RIGHT AWAY (before the page is drawn)
   ---------------------------------------------------------------------
   WHAT: A few quick steps that run the moment this file loads, while
         the browser is still reading the <head> of the page.
   DOES: Tells the CSS that JavaScript is working, applies the saved
         theme, and switches on animation mode. Doing this early stops
         a "flash" of the wrong colors as each page opens.
   EDIT: Nothing to change here.
   ===================================================================== */

// This is a function that runs itself immediately (the () at the end
// calls it). Wrapping the steps like this keeps them tidy.
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


/* =====================================================================
   3. START EVERYTHING ELSE (once the page has loaded)
   ---------------------------------------------------------------------
   WHAT: The list of features to switch on.
   DOES: Waits for "DOMContentLoaded" (the moment the browser has read
         all of the HTML), then runs each setup step below.
   EDIT: To switch a feature off, put // at the start of its line.
   ===================================================================== */
document.addEventListener("DOMContentLoaded", function () {
  setupThemeToggle();
  setupMobileMenu();
  highlightCurrentPage();
  setupRevealOnScroll();
  setupHeaderLine();
  fillCurrentYear();
  setupDemoForm();
});


/* =====================================================================
   4. LIGHT / DARK THEME
   ---------------------------------------------------------------------
   WHAT: The sun/moon button in the header.
   DOES: Switches between dark and light colors, saves the choice in the
         browser so every page (and the next visit) remembers it, and
         keeps the button's label accurate for screen readers.
   EDIT: The colors themselves live in css/style.css (sections 1 and 2).
   ===================================================================== */

// Reads the saved theme. "localStorage" is a small storage box inside
// the browser that keeps values between visits. "try / catch" means:
// try this, and if the browser blocks storage (some private modes do),
// carry on quietly instead of breaking the page.
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
// The CSS watches that attribute to choose its colors.
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

  // Run these steps every time the button is clicked (or pressed with
  // Enter or Space, which buttons support automatically).
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

// Keeps the label true, for example "Switch to light mode". aria-label
// is what screen readers say; title is the tooltip on mouse hover.
function updateThemeButton(button) {
  let label = "Switch to dark mode";
  if (getCurrentTheme() === "dark") {
    label = "Switch to light mode";
  }
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}


/* =====================================================================
   5. MOBILE MENU (the hamburger button)
   ---------------------------------------------------------------------
   WHAT: The three-line button that appears on small screens.
   DOES: Opens and closes the menu, and closes it again when someone
         picks a link, presses the Escape key, clicks outside the
         header, or widens the window to desktop size. It keeps
         aria-expanded up to date so screen readers know the state.
   EDIT: The width setting is DESKTOP_MENU_WIDTH in section 1.
   ===================================================================== */
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
  // (The "if" skips this in very old browsers that lack the feature.)
  const desktopScreen = window.matchMedia("(min-width: " + DESKTOP_MENU_WIDTH + "px)");
  if (desktopScreen.addEventListener) {
    desktopScreen.addEventListener("change", function () {
      if (desktopScreen.matches) {
        closeMenu();
      }
    });
  }
}


/* =====================================================================
   6. HIGHLIGHT THE CURRENT PAGE
   ---------------------------------------------------------------------
   WHAT: Marks the menu link for the page you are on.
   DOES: Compares the page's file name (such as "about.html") with each
         menu link. The match gets aria-current="page", which the CSS
         highlights and screen readers announce as "current page".
   EDIT: Nothing to change. New pages are highlighted automatically, as
         long as their menu link uses the same file name.
   ===================================================================== */
function highlightCurrentPage() {
  const currentPage = getPageName(window.location.pathname);
  const links = document.querySelectorAll(".nav-list a");

  links.forEach(function (link) {
    if (getPageName(link.getAttribute("href")) === currentPage) {
      link.setAttribute("aria-current", "page");
    }
  });
}

// Turns an address into a simple page name:
//   "/my-site/about.html" becomes "about"
//   "/my-site/" (a folder) becomes "index" (the home page)
// Some hosts hide the .html ending, so "/about" also becomes "about".
function getPageName(path) {
  let name = path.split("/").pop();          // the last part of the address
  name = name.split("?")[0].split("#")[0];   // drop any ?extra or #section part
  name = name.replace(/\.html?$/i, "");      // drop ".html" from the end
  if (name === "") {
    name = "index";
  }
  return name.toLowerCase();
}


/* =====================================================================
   7. FADE IN ON SCROLL
   ---------------------------------------------------------------------
   WHAT: The gentle fade-and-rise effect on elements with class="reveal".
   DOES: Uses an "IntersectionObserver", a browser tool that reports when
         an element scrolls into view. At that moment the element gets
         the class "is-visible" and the CSS animation plays once. Items
         that appear together arrive one after another.
   EDIT: Switch animations off with ANIMATIONS_ON in section 1. Add or
         remove class="reveal" in the HTML to choose what fades in.
   ===================================================================== */

// Animations are allowed only when the switch is on, the visitor
// hasn't asked for reduced motion, and the browser has the tool we need.
function animationsAllowed() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return ANIMATIONS_ON && !reduceMotion && "IntersectionObserver" in window;
}

function setupRevealOnScroll() {
  const root = document.documentElement;
  if (!root.classList.contains("motion")) {
    return; // animations are off, so the CSS already shows everything
  }

  // If the visitor turns on "reduce motion" while the page is open,
  // remove the motion class so everything shows and stays still.
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
      // Each item that appears at the same moment waits 90ms longer
      // than the one before it (up to a limit), so they arrive in turn.
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


/* =====================================================================
   8. HEADER LINE ON SCROLL
   ---------------------------------------------------------------------
   WHAT: A thin line under the sticky header.
   DOES: Adds the class "is-scrolled" to the header once the page has
         scrolled a little, and removes it at the very top.
   EDIT: The line's color is --color-border in css/style.css.
   ===================================================================== */
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


/* =====================================================================
   9. CURRENT YEAR IN THE FOOTER
   ---------------------------------------------------------------------
   WHAT: The year in the copyright line.
   DOES: Replaces the text of every element marked data-current-year
         with this year, so you never have to update it by hand.
   EDIT: Nothing to change.
   ===================================================================== */
function fillCurrentYear() {
  const thisYear = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach(function (element) {
    element.textContent = thisYear;
  });
}


/* =====================================================================
   10. DEMO CONTACT FORM
   ---------------------------------------------------------------------
   WHAT: A stand-in for real form sending.
   DOES: Static hosts can't receive form messages (see contact.html).
         For any <form> marked data-demo-form, this stops the browser
         from reloading the page and shows a friendly note instead.
         The browser still checks required fields first.
   EDIT: When you connect a real form service, delete data-demo-form
         from the <form> tag. This code then leaves the form alone.
   ===================================================================== */
function setupDemoForm() {
  document.querySelectorAll("form[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault(); // stop the normal send-and-reload

      const status = form.querySelector("[data-form-status]");
      if (status) {
        // EDIT ME: The note visitors see after pressing the button.
        status.textContent = "Thanks! This form is a demo and isn't connected yet, so your message was not sent.";
      }
    });
  });
}
