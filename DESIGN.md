# DESIGN.md: "Deep Signal"

The design direction for kennethheisler.com. Read this before changing how the site looks or moves.
The values below live in `css/style.css`, section 1 (SETTINGS).

## 1. Idea

**Data in motion.** The site should feel like a calm, precise instrument: a dark field where
signal rises out of noise. The home hero (coming in Phase 2) is a live field of glowing particles
that settles into clear data shapes as you scroll: chaos to clarity, which is the job of an informaticist.

Ingredients: weighted smooth scrolling, big confident type, a live WebGL scene that reacts to the cursor,
and seamless page changes. Everything stays readable, fast, and accessible first.

## 2. Rules of thumb

- **Dark only.** There is no light/dark toggle.
- **Real text in the HTML.** Headings and paragraphs are never only drawn on a canvas (search engines and screen readers must read them).
- **One highlight per screen.** Amber marks at most one key number or data point per screen. It is never a button color.
- **Avoid rows of identical cards.** Prefer alternating full-width sections, lists, and big type.
- **Motion is optional.** Every effect turns off with "reduce motion" and when the animation libraries fail to load.

## 3. Color

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#070d18` | Page background |
| `--color-bg-alt` | `#0a1220` | Every other section |
| `--color-surface` | `#0e1726` | Cards and panels |
| `--color-surface-raised` | `#142034` | Mobile menu, form fields |
| `--color-border` | `#1f2c42` | Thin dividers |
| `--color-border-strong` | `#5f7393` | Field and outline-button borders (at least 3:1 on every background) |
| `--color-heading` | `#f5f8fc` | Headings |
| `--color-text` | `#dfe7f2` | Body text |
| `--color-text-muted` | `#93a3b8` | Supporting text |
| `--accent` (primary cyan) | `#36cfff` | Buttons, links, focus rings, particles |
| `--color-on-accent` | `#04121f` | Text on cyan buttons |
| `--accent-2` (highlight amber) | `#ffb547` | One key number or data point per screen |
| `--color-success` | `#3ddc97` | Success messages |
| `--color-error` | `#ff7a7a` | Error messages |

All text pairs meet at least 4.5:1 contrast on the backgrounds above.

**Mythic accents** (light effects only, never text or buttons): deep indigo `#4b3fd6`, violet `#8b5cff`, periwinkle `#7f9cff`, pale glow `#d8f4ff` and spark gold `#ffcf7a`. They color the spark's trail, the edge dust and the glowing words, alongside our cyan and amber.

## 4. Type

- **Geist** (400-700) for headings and body. **Geist Mono** (400-500) for small uppercase labels (the `.badge`, and the numbers and year/type labels on Projects). Both load from Google Fonts in each page's `<head>`.
- Headings: weight 600, tight tracking (`--heading-tracking: -0.025em`).
- Sizes: body 18px, smallest text 16px (never smaller). `--text-display` (48-120px) is reserved for the rebuilt home hero.

## 5. Space and shape

- Sections are spaced 80-144px apart (`--space-section`).
- Corners: 8px (buttons, fields), 12px (cards), 16px (panels, pictures).
- Content width 1180px, narrow column 780px.

## 6. Motion

- Easing: `--ease: cubic-bezier(0.16, 1, 0.3, 1)` in CSS and `expo.out` in GSAP, a fast start that glides to a soft stop.
- Everything respects "reduce motion": `js/main.js` adds the class `motion` to `<html>` only when animations are allowed, and every effect checks for it. Turning "reduce motion" on mid-visit switches everything off.
- All motion settings live in the SETTINGS block at the top of `js/motion.js`.

| Effect | What it does | Where |
|---|---|---|
| Smooth scroll | Weighted, gliding scroll (Lenis, `SCROLL_SMOOTHNESS`). "Back to top" glides up and focuses the name link. Other scripts can glide the page to an element (`siteGlideTo`, used when a project opens; `GLIDE_GAP`). | `js/motion.js` section 4 |
| Headline reveals | Page headings (`main h1, main h2`) rise into place line by line from behind a mask. Headings in cards and panels move with their box instead. | `js/motion.js` section 5 |
| Fade-ins | Anything with `class="reveal"` fades up 24px as it scrolls into view, staggered. | `js/motion.js` section 6 |
| Magnetic buttons | Buttons lean toward the mouse (`MAGNETIC_STRENGTH`) on a little spring. Buttons side by side bump each other aside instead of overlapping and bounce back (`BUTTON_BOUNCE`, `BUTTON_GAP`). Mouse and trackpad only. | `js/motion.js` section 7 |
| Particle scene (home) | About 60k glowing particles (15k on phones) drift like ink; the mouse pushes them aside. Scrolling through "What I Do" forms a line chart, a puzzle piece with a graduation cap, and a network, each with one amber "insight". A "Pause motion" button freezes the drift. | `js/hero-scene.js`, CSS section 19 |
| Project list (Projects) | Big project titles with mono numbers and year/type labels. Hovering or focusing a title fades the others back and slides it right, and (wide screens with a mouse) its chart is revealed right under the cursor like a magnifying glass, behind the title, which flips color over it (`mix-blend-mode: difference`); it ripples in and wipes over to the next chart. Clicking opens the project in place: its chart drifts in out of a blur, large, in light wisps of blue smoke that cling to its bars, dots and lines (`js/project-glow.js`, raw WebGL2, no library). A short note sits in the chart's emptiest spot: hovering it lifts it onto faint glass and shows the start of the write-up; clicking it or "More" opens the full write-up on a widening dark glass card. One project open at a time; links like `#vr2` open that project. Without WebGL the smoke is a soft CSS glow. Phones get cards with the chart on top, the note below. | `js/projects.js`, `js/project-glow.js`, `js/projects-hover.js`, CSS sections 21-22 |
| Cursor particles | Glowing particles (the home scene's colors, a rare amber one) trail the mouse and burst out on clicks, then drift and fade. Opening a project streams particles from the click into its chart, where they dissolve into the smoke; while a project is open they go quieter (fewer, smaller, dimmer), and the mouse gently stirs the smoke around the chart. Lighter on the home page. Mouse and trackpad only; rests when idle; off with reduce motion. | `js/cursor-particles.js`, `js/project-glow.js` |
| Menu | A small "Menu" pill (two dots that become an X) opens a soft rounded card with the four pages, big and roomy, plus email and LinkedIn. It grows out of the button and its links float up in turn; Escape, an outside click or a link closes it. Same on every screen size; without JavaScript the pages show as plain links. | `js/main.js` section 4, CSS section 6 |
| Skill cards (About) | Four playing cards (Data, Systems, Credentials, Teamwork) with an original line-art back. On wide screens the section holds while you scroll: the cards rise as a fanned stack face down, spread into a row and flip over one by one; smaller screens flip each card as it arrives. Face-up cards lean toward the mouse. | `js/about-cards.js`, CSS section 23 |
| Glowing words (About) | A giant thin-outlined EXPERIENCE in the page header, and below it a word jumble (DATA, INSIGHT, REGRESSION, MEDIAN and statistics formulas, across and down) that types itself in as you scroll. A ribbon of violet, periwinkle and gold light trails the mouse and lights the outlines where it crosses them. | `js/glow-word.js`, CSS section 24 |
| Spark and edge dust (every page but Home) | Far behind the page (half scroll speed), a golden spark leads the way down the side margins, curling into loops there and now and then swooping across to the other side; each page starts with it settled in a margin. It keeps drifting when you stop scrolling and sheds embers. Its trail is drawn as overlapping soft dots (no seams), cooling from gold through pale blue and periwinkle to violet, with a smooth bright core. The screen edges carry a light dust of violet-blue wisps and rising golden embers that part around the mouse. Both dim while a project is open. | `js/scroll-ribbon.js`, CSS section 25 |
| Cursor ring | A 36px cyan ring trails the mouse (`CURSOR_LAG`) and grows over links and buttons. The normal arrow stays visible. Mouse and trackpad only; hidden in print and high-contrast mode. | `js/motion.js` section 8, CSS section 17 |
| Page transitions | The old page fades out and rises 12px (300ms); the new one fades in from 16px below (600ms). The header stays still. Uses View Transitions; other browsers switch pages normally. | CSS section 17 |

**Fallbacks.** If the animation libraries (GSAP, Lenis) fail to load, or take longer than `MOTION_WAIT_LIMIT` in `js/main.js`, the site uses the simple CSS fade-ins in `js/main.js` or shows everything at once. If WebGL or Three.js is unavailable, the home page shows its normal dashboard picture and the Projects list simply has no floating picture. All text is always in the HTML.

## 7. Pages

Four pages, kept simple on purpose:

| Page | File | What's on it |
|---|---|---|
| Home | `index.html` | Particle hero, then "What I Do": three story steps, each with its tools and strengths as chips |
| About & Experience | `about.html` | Story, the four skill cards (including certifications), numbers, the giant EXPERIENCE word and timeline (with the job graphics), resume download |
| Projects | `portfolio.html` | The big project list; each project opens in place (chart in smoke, short note, full write-up) |
| Contact | `contact.html` | Form and contact details |

`showcase.html` (old Experience) and `features.html` (old Skills) only forward visitors to their new places, so old links keep working. They are not in the menu or `sitemap.xml`.

## 8. Charts

Project charts are recolored to match the site by `tools/theme_charts.py`: see-through background, light ink, cyan data, one amber highlight. Every value stays exactly where it was; only colors change. The originals stay in `images/projects/`; the recolored ones go in `images/projects/themed/`.
