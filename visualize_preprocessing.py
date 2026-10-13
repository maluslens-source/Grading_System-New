"""
Visualize preprocessing on full tray image.
Usage: python visualize_preprocessing.py path/to/cold_storage_image.jpg
"""

import cv2
import numpy as np
import sys
from pathlib import Path

img_path = sys.argv[1] if len(sys.argv) > 1 else "sample_images/cold_storage.jpg"

# Handle HEIC
if Path(img_path).suffix.lower() in [".heic", ".heif"]:
    from pillow_heif import register_heif_opener
    from PIL import Image
    register_heif_opener()
    pil_img = Image.open(img_path).convert("RGB")
    pil_img.save("/tmp/temp_vis.jpg", "JPEG", quality=95)
    img_path = "/tmp/temp_vis.jpg"

img = cv2.imread(img_path)
print(f"Image loaded: {img.shape}")


def step_brightness(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    current_mean, current_std = l.mean(), l.std()
    if current_std > 0:
        l = l.astype(np.float32)
        l = (l - current_mean) / current_std * 51.2 + 120.1
        l = np.clip(l, 0, 255).astype(np.uint8)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

def step_clahe_mild(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

def step_clahe_strong(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(3, 3))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

def step_white_balance(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    a = cv2.add(a, 128 - int(a.mean()))
    b = cv2.add(b, 128 - int(b.mean()))
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

def step_saturation_boost(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)
    s = np.clip(s.astype(np.float32) * 1.5, 0, 255).astype(np.uint8)
    return cv2.cvtColor(cv2.merge([h, s, v]), cv2.COLOR_HSV2BGR)

def step_warm_shift(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    b = cv2.add(b, 15)
    a = cv2.add(a, 5)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)

def step_dehaze(img):
    b_ch, g_ch, r_ch = cv2.split(img.astype(np.float32))
    min_channel = np.minimum(np.minimum(r_ch, g_ch), b_ch)
    frost_estimate = cv2.GaussianBlur(min_channel, (31, 31), 0)
    strength = 0.5
    r_ch = np.clip(r_ch - frost_estimate * strength, 0, 255)
    g_ch = np.clip(g_ch - frost_estimate * strength, 0, 255)
    b_ch = np.clip(b_ch - frost_estimate * strength, 0, 255)
    return cv2.merge([b_ch, g_ch, r_ch]).astype(np.uint8)

def step_sharpen(img):
    blurred = cv2.GaussianBlur(img, (0, 0), 1.0)
    return cv2.addWeighted(img, 1.3, blurred, -0.3, 0)


# ── Apply each step to FULL tray image ───────────────────────────────

steps = [
    ("01_original",           img),
    ("02_brightness",         step_brightness(img)),
    ("03_white_balance",      step_white_balance(img)),
    ("04_warm_shift",         step_warm_shift(img)),
    ("05_saturation_boost",   step_saturation_boost(img)),
    ("06_clahe_mild",         step_clahe_mild(img)),
    ("07_clahe_strong",       step_clahe_strong(img)),
    ("08_dehaze",             step_dehaze(img)),
    ("09_sharpen",            step_sharpen(img)),
    ("10_bright_wb_sat",      step_saturation_boost(step_white_balance(step_brightness(img)))),
    ("11_bright_warm",        step_warm_shift(step_brightness(img))),
    ("12_bright_warm_sat",    step_saturation_boost(step_warm_shift(step_brightness(img)))),
    ("13_bright_warm_clahe",  step_clahe_mild(step_warm_shift(step_brightness(img)))),
    ("14_bright_sat",         step_saturation_boost(step_brightness(img))),
    ("15_wb_sat_clahe",       step_clahe_mild(step_saturation_boost(step_white_balance(img)))),
]

output_dir = Path("preprocessing_comparison")
output_dir.mkdir(exist_ok=True)

for name, result in steps:
    out_path = output_dir / f"{name}.jpg"
    cv2.imwrite(str(out_path), result)

    lab = cv2.cvtColor(result, cv2.COLOR_BGR2LAB)
    l = lab[:, :, 0]
    hsv = cv2.cvtColor(result, cv2.COLOR_BGR2HSV)
    s = hsv[:, :, 1]
    print(f"{name:35s} | L mean: {l.mean():5.1f} | L std: {l.std():5.1f} | Sat: {s.mean():5.1f}")

print(f"\nAll 15 images saved to {output_dir}/")
print("Compare each one with your training data image — which looks closest?")