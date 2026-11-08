"""THEME_CHARTS.PY: recolors the project charts to match the site.

Reads the original charts in images/projects/ and writes each one to images/projects/themed/ with a
see-through background, recolored in the site's colors (light ink, cyan data, amber highlight).
Every bar, dot and line keeps exactly its position and size; only the colors change.

How to run it (needs Python with: pip install pillow numpy):
    python tools/theme_charts.py

Adding a new chart: put the original in images/projects/, then add it to section 1 (if it's
already drawn on the site's dark navy) or section 2 (light background) below, saying which of its
colors become cyan and which become amber."""
import numpy as np
from PIL import Image
import colorsys, os

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "images", "projects")
OUT = os.path.join(SRC, "themed")
os.makedirs(OUT, exist_ok=True)

TEXT = np.array([214, 224, 238]) / 255     # light ink for labels and lines
CYAN = np.array([54, 207, 255]) / 255
AMBER = np.array([255, 181, 71]) / 255
DEEP_BG = np.array([15, 32, 56]) / 255


def color_to_alpha(rgb, bg):
    """Split each pixel into (foreground color, alpha) assuming it was drawn over a flat background."""
    bg = bg.reshape(1, 1, 3)
    up = np.where(rgb > bg, (rgb - bg) / np.maximum(1 - bg, 1e-6), 0)
    down = np.where(rgb < bg, (bg - rgb) / np.maximum(bg, 1e-6), 0)
    a = np.clip(np.max(np.maximum(up, down), axis=2), 0, 1)
    fg = (rgb - (1 - a[..., None]) * bg) / np.maximum(a[..., None], 1e-6)
    return np.clip(fg, 0, 1), a


def hls(fg):
    flat = fg.reshape(-1, 3)
    out = np.array([colorsys.rgb_to_hls(*p) for p in flat])
    return out.reshape(fg.shape)


def save(name, fg, a):
    img = np.dstack([fg, a])
    Image.fromarray((img * 255).round().astype(np.uint8), "RGBA").save(os.path.join(OUT, name), optimize=True)
    print(name, "saved", os.path.getsize(os.path.join(OUT, name)) // 1024, "KB")


def load(name):
    return np.array(Image.open(os.path.join(SRC, name)).convert("RGB")).astype(float) / 255


# 1. Charts already drawn on the dark navy: just lift them off their background.
for name in ["vr2-usage.png", "crop-watersheds.png", "civic-massachusetts.png"]:
    rgb = load(name)
    fg, a = color_to_alpha(rgb, DEEP_BG)
    save(name, fg, a)

# 2. Light charts: lift the ink off the light background, then repaint it in theme colors.
def repaint(name, bg, colored, neutral_alpha=1.0, prep=None, sat_cut=0.35):
    rgb = load(name)
    if prep:
        rgb = prep(rgb)
    fg, a = color_to_alpha(rgb, np.array(bg) / 255)
    h = hls(fg)
    hue, light, sat = h[..., 0] * 360, h[..., 1], h[..., 2]
    is_color = (sat > sat_cut) & (light > 0.08) & (light < 0.92)
    out = np.where(is_color[..., None], 0, TEXT)
    out_a = np.where(is_color, a, a * neutral_alpha)
    out, out_a = colored(rgb, fg, a, hue, light, sat, is_color, out, out_a)
    save(name, out, out_a)


# Heart rate (ggplot gray panel with white grid): treat white as background too.
def heart_prep(rgb):
    neutral = (rgb.max(2) - rgb.min(2)) < 0.04
    light = rgb.min(2) > 0.88
    rgb = rgb.copy()
    rgb[neutral & light] = 229 / 255
    return rgb


def heart_colors(rgb, fg, a, hue, light, sat, is_color, out, out_a):
    red = is_color & ((hue < 40) | (hue > 330))
    blue = is_color & (hue > 180) & (hue < 260)
    out = np.where(red[..., None], CYAN, out)
    out = np.where(blue[..., None], AMBER, out)
    return out, out_a


repaint("heart-rate.png", (229, 229, 229), heart_colors, prep=heart_prep)


# Developer salaries (base R, white): the gray box fill becomes a soft cyan fill.
def salary_colors(rgb, fg, a, hue, light, sat, is_color, out, out_a):
    fill = (np.abs(rgb - 211 / 255).max(2) < 0.03)
    out = np.where(fill[..., None], CYAN, out)
    out_a = np.where(fill, 0.22, out_a)
    return out, out_a


repaint("salary-age.png", (255, 255, 255), salary_colors)


# Tableau (white): orange bars become cyan (lighter orange = fainter cyan); Stockholm, the lowest, becomes amber.
def tableau_colors(rgb, fg, a, hue, light, sat, is_color, out, out_a):
    bars = is_color & (hue < 50)
    darkest = bars & (rgb.max(2) < 0.7)          # the deep red Stockholm bar
    out = np.where(bars[..., None], CYAN, out)
    out = np.where(darkest[..., None], AMBER, out)
    # Tableau's labels are pale gray: strengthen them so they read on the dark page.
    out_a = np.where(is_color, out_a, np.clip(out_a * 1.9, 0, 1))
    return out, out_a


repaint("tableau-cities.png", (255, 255, 255), tableau_colors)
