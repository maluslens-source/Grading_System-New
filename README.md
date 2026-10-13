# Apple Tray Grading System

A two-stage deep learning pipeline that grades apples in tray images as **Grade A** (good) or **Grade B** (defective) and reports the percentage of each.

**Stage 1 — Detection:** YOLOv8s finds every apple in the tray image.
**Stage 2 — Classification:** EfficientNet-B0 grades each detected apple.

Works on CPU — no GPU required.

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/apple-grading-system.git
cd apple-grading-system

# 2. Install dependencies
pip install -r requirements.txt

# 3. Add model weights to models/ directory
#    - models/detector_best.pt
#    - models/classifier_best.pt
#    (see "Model Weights" section below)

# 4. Grade a tray image
python grade.py tray_photo.jpg
```

Output:
```
Image                               Total   Grade A   Grade B      %A
──────────────────────────────────────────────────────────────────────
tray_photo.jpg                         82       64       18    78.0%
──────────────────────────────────────────────────────────────────────
```

## Usage

### Grade a single image
```bash
python grade.py tray_photo.jpg
```

### Grade a folder of images
```bash
python grade.py images/
```

### Adjust the grading threshold
```bash
# More lenient — more apples classified as A
python grade.py tray.jpg --threshold 0.40

# Stricter — more apples classified as B
python grade.py tray.jpg --threshold 0.60
```

The threshold controls how confident the model must be to call an apple Grade A. Default is 0.50 (balanced). Lower values reduce false B classifications; higher values catch more defects.

### Save annotated images
```bash
python grade.py tray.jpg --save
python grade.py images/ --save --output results/
```

This saves a copy of each image with colored bounding boxes:
- **Green** = Grade A
- **Red** = Grade B

### JSON output (for piping to other tools)
```bash
python grade.py tray.jpg --json
```

### Force CPU (when GPU is available but not wanted)
```bash
python grade.py tray.jpg --device cpu
```

## Use as a Python Library

```python
from grader import AppleGrader

# Load models (once)
grader = AppleGrader("models/detector_best.pt", "models/classifier_best.pt")

# Grade a tray
result = grader.grade("tray_photo.jpg", a_threshold=0.50)

print(f"Total apples: {result['total_detected']}")
print(f"Grade A: {result['grade_A_count']} ({result['pct_A']}%)")
print(f"Grade B: {result['grade_B_count']} ({result['pct_B']}%)")

# Grade and save annotated image
result, annotated_img = grader.grade_and_annotate(
    "tray_photo.jpg",
    output_path="output/graded_tray.jpg",
    a_threshold=0.50,
)
```

## Model Weights

The model weight files are not included in this repo due to their size. Obtain them separately and place in the `models/` directory:

```
models/
├── detector_best.pt      (~14 MB)  YOLOv8s apple detector
└── classifier_best.pt    (~17 MB)  EfficientNet-B0 grade classifier
```

## How It Works

```
Input: tray photo (any resolution)
  │
  ├─ Stage 1: YOLOv8s detector
  │   └─ Finds all apples, outputs bounding boxes
  │
  ├─ For each detected apple:
  │   ├─ Crop with 2% padding
  │   ├─ Resize to 380×380
  │   └─ Stage 2: EfficientNet-B0 classifier
  │       └─ Outputs probability: Grade A vs Grade B
  │
  └─ Aggregate: count A, count B, compute percentages
```

## Requirements

- Python 3.8+
- ~500 MB disk space (for dependencies)
- No GPU required (runs on CPU in ~10-15 seconds per tray)
- With GPU: ~1-2 seconds per tray

## Project Structure

```
apple-grading-system/
├── grade.py            Command-line interface
├── grader.py           Core grading engine (AppleGrader class)
├── requirements.txt    Python dependencies
├── models/             Model weights (not tracked by git)
│   ├── detector_best.pt
│   └── classifier_best.pt
├── sample_images/      Example tray images for testing
└── output/             Annotated images (created by --save)
```
