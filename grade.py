"""
Apple Tray Grading — Command Line Interface
────────────────────────────────────────────
Grade a single image or a folder of tray images.

Usage:
  python grade.py image.jpg
  python grade.py images/ --threshold 0.50 --save
  python grade.py tray.jpg --threshold 0.45 --save --output results/

Run `python grade.py --help` for all options.
"""

import argparse
import json
import sys
from pathlib import Path

from grader import AppleGrader


def main():
    parser = argparse.ArgumentParser(
        description="Grade apples in tray images as Grade A or Grade B.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python grade.py tray_photo.jpg
  python grade.py tray_photo.jpg --threshold 0.40
  python grade.py images/ --save --output results/
  python grade.py tray.jpg --device cpu
  python grade.py tray.jpg --json
        """,
    )

    parser.add_argument(
        "input",
        help="Path to a single image or a folder of images.",
    )
    parser.add_argument(
        "--detector",
        default="models/detector_best.pt",
        help="Path to detector weights (default: models/detector_best.pt)",
    )
    parser.add_argument(
        "--classifier",
        default="models/classifier_best.pt",
        help="Path to classifier weights (default: models/classifier_best.pt)",
    )
    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=0.7,
        help="Grade A probability threshold. Lower = more A, higher = more B. (default: 0.50)",
    )
    parser.add_argument(
        "--save", "-s",
        action="store_true",
        help="Save annotated images with colored bounding boxes.",
    )
    parser.add_argument(
        "--output", "-o",
        default="output",
        help="Output directory for annotated images (default: output/)",
    )
    parser.add_argument(
        "--device",
        default=None,
        choices=["cpu", "cuda"],
        help="Force CPU or GPU. Auto-detects if not specified.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        dest="json_output",
        help="Output results as JSON (useful for piping to other tools).",
    )

    args = parser.parse_args()

    # ── Validate input ───────────────────────────────────────────────
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: {input_path} does not exist.")
        sys.exit(1)

    # ── Collect images ───────────────────────────────────────────────
    valid_extensions = valid_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".heic", ".heif"}

    if input_path.is_file():
        if input_path.suffix.lower() not in valid_extensions:
            print(f"Error: {input_path} is not a supported image format.")
            print(f"Supported: {', '.join(valid_extensions)}")
            sys.exit(1)
        image_paths = [input_path]
    else:
        image_paths = sorted(
            p for p in input_path.glob("*")
            if p.suffix.lower() in valid_extensions
        )
        if not image_paths:
            print(f"Error: No images found in {input_path}")
            sys.exit(1)

    # ── Validate model files ─────────────────────────────────────────
    for name, path in [("Detector", args.detector), ("Classifier", args.classifier)]:
        if not Path(path).exists():
            print(f"Error: {name} weights not found at {path}")
            print(f"Place your model files in the models/ directory.")
            sys.exit(1)

    # ── Load models ──────────────────────────────────────────────────
    if not args.json_output:
        print(f"\nLoading models...")

    grader = AppleGrader(args.detector, args.classifier, device=args.device)

    if not args.json_output:
        print(f"\nGrading {len(image_paths)} image(s) with threshold={args.threshold}\n")
        print(f"{'Image':<35s} {'Total':>6s} {'Grade A':>8s} {'Grade B':>8s} {'%A':>7s}")
        print("─" * 70)

    # ── Grade each image ─────────────────────────────────────────────
    all_results = []

    for img_path in image_paths:
        if args.save:
            output_path = Path(args.output) / f"graded_{img_path.stem}.jpg"
            result, _ = grader.grade_and_annotate(
                img_path,
                output_path=output_path,
                a_threshold=args.threshold,
            )
        else:
            result = grader.grade(img_path, a_threshold=args.threshold)

        all_results.append(result)

        if not args.json_output:
            print(
                f"{result['image']:<35s} "
                f"{result['total_detected']:>6d} "
                f"{result['grade_A_count']:>8d} "
                f"{result['grade_B_count']:>8d} "
                f"{result['pct_A']:>6.1f}%"
            )

    # ── Output ───────────────────────────────────────────────────────
    if args.json_output:
        print(json.dumps(all_results, indent=2))
    else:
        print("─" * 70)

        if len(all_results) > 1:
            total_a = sum(r["grade_A_count"] for r in all_results)
            total_b = sum(r["grade_B_count"] for r in all_results)
            total_all = total_a + total_b
            avg_pct = total_a / total_all * 100 if total_all > 0 else 0

            print(
                f"{'TOTAL':<35s} "
                f"{total_all:>6d} "
                f"{total_a:>8d} "
                f"{total_b:>8d} "
                f"{avg_pct:>6.1f}%"
            )

        if args.save:
            print(f"\nAnnotated images saved to: {args.output}/")


if __name__ == "__main__":
    main()
