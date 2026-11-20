"""MAKE_WEBP.PY: makes a smaller WebP copy of every project chart.

The site shows the .webp files: lossless, so every pixel matches the .png, but about half the size
(charts are mostly flat colors, which lossless WebP packs tightly). The .png files stay as the
master copies the other tools write.

How to run it (needs Python with: pip install pillow):
    python tools/make_webp.py

Run it again after theme_charts.py or make_project_charts.py changes a chart."""
from PIL import Image
import glob, os


# 1. SETTINGS

FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "images", "projects", "themed")


# 2. CONVERT EACH CHART

for png in sorted(glob.glob(os.path.join(FOLDER, "*.png"))):
    webp = png[:-4] + ".webp"
    # lossless = exact copy; quality 100 + method 6 = try hardest to make it small.
    Image.open(png).save(webp, "WEBP", lossless=True, quality=100, method=6)
    print(f"{os.path.basename(webp)}: {os.path.getsize(png) // 1024} KB -> {os.path.getsize(webp) // 1024} KB")
