"""MAKE_PROJECT_CHARTS.PY: draws the newer project charts straight in the site's colors.

theme_charts.py recolors finished chart images. This script instead redraws four charts from each
project's own data, using the same calculations as the project code, so the numbers match the
corrected (Nov 2026) analyses exactly. Output goes to images/projects/themed/ with a see-through
background: light ink for labels, cyan for data, amber for the thing to look at.

How to run it (needs Python with: pip install numpy scipy pandas matplotlib):
    python tools/make_project_charts.py

It reads the project folders from PORTFOLIO below (setting 1). Change that path if they move."""
import os
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.signal import butter, filtfilt, find_peaks

# ---------------------------------------------------------------------------------------------
# SETTINGS
# 1. Where the project folders live.
PORTFOLIO = r"C:\Users\kenne\Desktop\Portfolio"
# 2. The site's colors (same as css/style.css and theme_charts.py).
INK = "#d6e0ee"
CYAN = "#36cfff"
AMBER = "#ffb547"
# 3. Size of every chart: 8 x 5 inches at 200 dots per inch = 1600 x 1000 pixels.
SIZE = (8, 5)
DPI = 200
# ---------------------------------------------------------------------------------------------

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "images", "projects", "themed")
os.makedirs(OUT, exist_ok=True)
HEALTH = os.path.join(PORTFOLIO, "1 - Health and Sensor Analytics (Python)")
STATS = os.path.join(PORTFOLIO, "2 - Data Analysis and Statistics")

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 13,
    "text.color": INK, "axes.labelcolor": INK, "xtick.color": INK, "ytick.color": INK,
    "axes.edgecolor": (0.84, 0.88, 0.93, 0.35), "axes.facecolor": "none", "figure.facecolor": "none",
    "axes.grid": True, "grid.color": INK, "grid.alpha": 0.12, "grid.linewidth": 0.8,
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.titlesize": 15, "axes.titleweight": "bold", "axes.titlepad": 14, "axes.titlelocation": "left",
    "legend.frameon": False, "legend.fontsize": 12,
})


def save(fig, name):
    path = os.path.join(OUT, name)
    fig.savefig(path, dpi=DPI, transparent=True)
    plt.close(fig)
    print(name, "saved", os.path.getsize(path) // 1024, "KB")


# A. ACTIVITY RECOGNITION: the confusion matrix from 10-fold cross-validation.
#    These counts are the combined matrix that activity-classification-train.py prints and saves
#    to results/confusion_matrix.png (585 windows, 581 correct = 99.3%).
labels = ["walking", "sitting", "rowing", "jumping"]
conf = np.array([[146, 0, 0, 3],
                 [0, 159, 0, 0],
                 [0, 0, 125, 0],
                 [1, 0, 0, 151]])
fig, ax = plt.subplots(figsize=SIZE)
ax.grid(False)
for s in ax.spines.values():
    s.set_visible(False)
for r in range(4):
    for c in range(4):
        n = conf[r, c]
        right = r == c
        color = CYAN if right else AMBER
        alpha = 0.55 + 0.4 * n / conf.max() if right else (0.85 if n else 0.0)
        ax.add_patch(plt.Rectangle((c - 0.46, r - 0.46), 0.92, 0.92, color=color, alpha=alpha, lw=0))
        if not n:
            ax.add_patch(plt.Rectangle((c - 0.46, r - 0.46), 0.92, 0.92, fill=False, ec=INK, alpha=0.15, lw=1))
        ax.text(c, r, str(n), ha="center", va="center", fontsize=17 if n else 13,
                fontweight="bold" if n else "normal",
                color="#0a1628" if n else INK, alpha=1 if n else 0.45)   # dark numbers on the bright cells
ax.set_xlim(-0.5, 3.5); ax.set_ylim(3.5, -0.5)
ax.set_xticks(range(4), labels); ax.set_yticks(range(4), labels)
ax.tick_params(length=0)
ax.set_xlabel("Predicted activity"); ax.set_ylabel("Actual activity")
ax.set_title("581 of 585 two-second windows classified correctly")
fig.tight_layout()
save(fig, "activity-confusion.png")


# B. HEART RATE (PPG): high-pass filtered signal with detected heartbeats, as in PPG-Assignment.ipynb.
ppg = os.path.join(HEALTH, "Heart Rate and Breathing (PPG)", "data", "PPG", "ppg_readings.csv")
raw = pd.read_csv(ppg, header=None).iloc[:, -2:].to_numpy(float)
t = (raw[:, 0] - raw[0, 0]) / 1000
signal = raw[:, 1] - 240
fs = len(t) / t.max()
b, a = butter(4, 0.7 / (0.5 * fs), btype="high")
filtered = filtfilt(b, a, signal)
beats, _ = find_peaks(filtered, height=np.mean(filtered), distance=max(1, int(round(0.35 * fs))))
bpm = len(beats) / (t[-1] / 60)
fig, ax = plt.subplots(figsize=SIZE)
ax.plot(t, filtered, color=CYAN, lw=1.6, label="high-pass filtered signal")
ax.plot(t[beats], filtered[beats], "o", ms=5.5, color=AMBER, label="detected heartbeat")
lo, hi = filtered.min(), filtered.max()
ax.set_ylim(lo - 0.3 * (hi - lo), hi + 0.05 * (hi - lo))   # room for the legend below the signal
ax.set_xlabel("Time (seconds)"); ax.set_yticks([])
ax.set_title(f"{len(beats)} heartbeats in {t[-1]:.0f} seconds = {bpm:.0f} beats per minute")
ax.legend(loc="lower left", ncol=2)
fig.tight_layout()
save(fig, "ppg-heartbeats.png")
print(f"   PPG: {len(beats)} beats, {bpm:.1f} bpm, fs {fs:.2f} Hz")


# C. STEP COUNTING: one labeled pocket log run through step_detection.py's method.
import sys
sys.path.insert(0, os.path.join(HEALTH, "Step Counting and Live Dashboard"))
from step_detection import magnitude, detect_steps  # noqa: E402
log = os.path.join(HEALTH, "Step Counting and Live Dashboard", "test-data",
                   "D1_accel_lefthoodiepocket_3sets_15steps_delay.csv")
d = np.genfromtxt(log, delimiter=",")
ts = (d[:, 0] - d[0, 0]) / 1000
sfs = len(ts) / (ts[-1] - ts[0])
smooth, steps = detect_steps(magnitude(d[:, 1], d[:, 2], d[:, 3]), sfs)
fig, ax = plt.subplots(figsize=SIZE)
ax.plot(ts, smooth, color=CYAN, lw=1.6, label="filtered acceleration")
ax.plot(ts[steps], smooth[steps], "o", ms=6, color=AMBER, label="counted step")
lo, hi = smooth.min(), smooth.max()
ax.set_ylim(lo - 0.05 * (hi - lo), hi + 0.25 * (hi - lo))  # room for the legend above the signal
ax.set_xlabel("Time (seconds)"); ax.set_ylabel("Acceleration (raw sensor units)"); ax.set_yticks([])
ax.set_title(f"Phone in a pocket: 45 steps taken, {len(steps)} counted")
ax.legend(loc="upper center", ncol=2)
fig.tight_layout()
save(fig, "step-count.png")
print(f"   Steps: {len(steps)} counted in D1 (45 taken)")


# D. SOCIAL CAPITAL: volunteering vs. economic connectedness across U.S. counties.
sc = pd.read_csv(os.path.join(STATS, "Social Capital and Civic Engagement (Python)", "social_capital_county.csv"))
reg = sc.dropna(subset=["volunteering_rate_county", "civic_organizations_county", "ec_county"])
x, y = reg["volunteering_rate_county"].to_numpy(), reg["ec_county"].to_numpy()
r = np.corrcoef(x, y)[0, 1]
slope, icept = np.polyfit(x, y, 1)
fig, ax = plt.subplots(figsize=SIZE)
ax.scatter(x, y, s=9, color=CYAN, alpha=0.28, lw=0)
xs = np.array([x.min(), x.max()])
ax.plot(xs, icept + slope * xs, color=AMBER, lw=2.6)
ax.set_xlabel("Volunteering rate (share in volunteering groups)")
ax.set_ylabel("Economic connectedness")
ax.set_title(f"Volunteering vs. economic connectedness (r = {r:.2f})")
fig.tight_layout()
save(fig, "civic-connectedness.png")
print(f"   Civic: {len(reg)} counties, r = {r:.3f}")
