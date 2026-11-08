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
| `--color-border-strong` | `#4f6280` | Field and outline-button borders |
| `--color-heading` | `#f5f8fc` | Headings |
| `--color-text` | `#dfe7f2` | Body text |
| `--color-text-muted` | `#93a3b8` | Supporting text |
| `--accent` (primary cyan) | `#36cfff` | Buttons, links, focus rings, particles |
| `--color-on-accent` | `#04121f` | Text on cyan buttons |
| `--accent-2` (highlight amber) | `#ffb547` | One key number or data point per screen |
| `--color-success` | `#3ddc97` | Success messages |
| `--color-error` | `#ff7a7a` | Error messages |

All text pairs meet at least 4.5:1 contrast on the backgrounds above.

## 4. Type

- **Geist** (400-700) for headings and body. **Geist Mono** (400-500) for small uppercase labels (the `.badge`, and later the year/type labels on Projects). Both load from Google Fonts in each page's `<head>`.
- Headings: weight 600, tight tracking (`--heading-tracking: -0.025em`).
- Sizes: body 18px, smallest text 16px (never smaller). `--text-display` (48-120px) is reserved for the rebuilt home hero.

## 5. Space and shape

- Sections are spaced 80-144px apart (`--space-section`).
- Corners: 8px (buttons, fields), 12px (cards), 16px (panels, pictures).
- Content width 1180px, narrow column 780px.

## 6. Motion

- Easing: `--ease: cubic-bezier(0.16, 1, 0.3, 1)`, a fast start that glides to a soft stop.
- Everything respects "reduce motion": `js/main.js` adds the class `motion` to `<html>` only when animations are allowed, and every effect checks for it.
