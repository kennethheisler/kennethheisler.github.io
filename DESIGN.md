# DESIGN.md: Deep Signal

The design rules for kennethheisler.com. Every page and every future change
follows this file. If something here changes, update `css/style.css` to match
(section 1, SETTINGS), so pages always use token names, never raw values.

## Direction

**Deep Signal: a control room at night.** A near-black navy page, glowing cyan
data, and one amber highlight. Big, tight headlines. Calm, weighted motion.

The signature idea is **data in motion**: a live particle field that swirls
away from the cursor and settles into clear data shapes (a line chart, a
network, a scatter) as you scroll. Chaos to clarity is Kenneth's job as an
informaticist, so the site shows it rather than says it.

One theme only (dark). There is no light/dark toggle.

Reference: the feel of studio sites such as lusion.co (fluid motion, a live
WebGL scene, confident type). Borrow the ingredients, never their assets,
layout or copy.

## Color

Every color has one job. Text contrast is at least 4.5:1 (checked against
`--color-bg` and `--color-surface`).

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#070d18` | Page background |
| `--color-bg-alt` | `#0a1220` | Alternate section background |
| `--color-surface` | `#0e1726` | Cards and panels |
| `--color-surface-raised` | `#142034` | Mobile menu, form fields |
| `--color-border` | `#1f2c42` | Thin dividing lines |
| `--color-border-strong` | `#4f6280` | Form fields and outline buttons (3:1 against the page) |
| `--color-heading` | `#f5f8fc` | Headings |
| `--color-text` | `#dfe7f2` | Body text |
| `--color-text-muted` | `#93a3b8` | Supporting text, captions (7.5:1) |
| `--accent` | `#36cfff` | **Primary.** Buttons, links, focus rings, particles |
| `--color-on-accent` | `#04121f` | Text on cyan buttons |
| `--accent-2` | `#ffb547` | **Highlight.** At most one key number or data point per screen |
| `--color-success` | `#3ddc97` | Form sent |
| `--color-error` | `#ff7a7a` | Form errors |

Rules: cyan is the only action color. Amber is never a button. No gradients
on text, no purple, no rainbow charts.

## Typography

Fonts load from Google Fonts in each page's `<head>`.

- **Geist** (400, 500, 600, 700): headings and body.
- **Geist Mono** (400, 500): small labels, data values, badges, numbers.

| Token | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `--text-display` | 48 to 120px | 0.95 | -0.045em | Home hero headline (used when the hero is rebuilt) |
| `--text-hero` | 44 to 72px | 1.0 | -0.035em | Current home headline |
| `--text-3xl` | 40 to 64px | 1.0 | -0.03em | Page titles (h1) |
| `--text-2xl` | 32 to 48px | 1.05 | -0.025em | Section titles (h2) |
| `--text-xl` | 24px | 1.2 | -0.01em | Card titles (h3) |
| `--text-lg` | 21px | 1.5 | 0 | Intro paragraphs |
| `--text-base` | 18px | 1.65 | 0 | Body text |
| `--text-sm` | 16px | 1.5 | 0.06em in mono labels | Labels, captions, footer |

Headings are weight 600. Nothing is smaller than 16px. Body lines stay
between 60 and 75 characters (`max-width: 65ch` on long text).

Labels (badges, eyebrows above section titles, data values) use Geist Mono,
uppercase, with 0.06em letter spacing.

## Spacing and layout

- 4px-based scale: 4, 8, 12, 16, 24, 32, 48 (`--space-2xs` to `--space-2xl`).
- Section padding: 80 to 144px (`--space-section`). Space is part of the look.
- Content width 1180px, narrow column 780px, screen edge padding 16 to 32px.
- Left-aligned layouts by default. Avoid centering every section and avoid
  rows of three identical cards where a list or a single strong item works.

## Shape and depth

- Radius: 8px (inputs), 12px (cards), 16px (large panels and images),
  pill (buttons and badges).
- One shadow, `--shadow-raised`, for things that float (menus).
- One glow, `--glow-accent`, only on the primary button hover and data
  highlights. No glassmorphism.

## Motion

Motion should feel weighted and calm, never bouncy.

- Easing: `--ease` `cubic-bezier(0.16, 1, 0.3, 1)` (fast start, long soft stop).
- Durations: 150ms (hover), 300ms (UI), 900ms (reveals).
- Smooth scroll (Lenis) with a gentle weight. Native scroll when motion is off.
- Headlines reveal line by line, sliding up from a mask, 80ms stagger.
- Everything is static when the visitor has "reduce motion" on (handled by
  `animationsAllowed()` in `js/main.js`).

## Particle scene (WebGL)

- Background `--color-bg`, particles `--accent` with soft additive glow;
  one amber particle cluster marks the "insight".
- Idle: slow drift, like ink in water. Cursor: pushes particles away within a
  soft radius; they ease back over about 1.5 seconds.
- Budget: 60fps on a mid-range laptop. Pixel ratio capped at 2. Fewer
  particles on phones. Pause when the tab is hidden or the canvas is off screen.
- Fallback: the static `images/hero.svg` when WebGL is missing or motion is off.
- All real text stays in the HTML, never drawn on the canvas (search ranking).

## Components

- **Primary button:** cyan fill, `--color-on-accent` text, pill, weight 600.
  Hover: slight glow. Focus: 2px cyan outline, 3px offset.
- **Secondary button:** transparent, 1px `--color-border-strong`, heading
  color text. Hover: cyan border.
- **Quiet link:** cyan text, underline that thickens on hover.
- **Inputs:** `--color-surface-raised`, 1px `--color-border-strong`, 8px radius,
  cyan border and outline on focus, error text in `--color-error`.
- **Cards:** `--color-surface`, 1px `--color-border`, 12px radius, no shadow.
  Hover: border turns `--color-accent-line`.
- **Navigation:** transparent over the hero, `--color-header-bg` with a hairline
  once scrolled. Current page marked with an underline.
- **Badge / label:** mono uppercase, pill, `--color-surface`, amber dot.

## Imagery and icons

- Icons: the existing inline line icons (24px, 2px stroke, round joins).
  One set only. No emoji as icons.
- Illustrations: drawn in code (SVG or WebGL) using cyan and amber on the dark
  background, styled like data visuals, not clip art.
- Project images: real screenshots of the work, inside the corner-mark frame
  with a 1px border.
