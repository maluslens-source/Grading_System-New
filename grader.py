"""
Apple Tray Grading Engine
─────────────────────────
Two-stage pipeline:
  Stage 1: YOLOv8s detector finds all apples in a tray image
  Stage 2: EfficientNet-B0 classifier grades each apple as A or B

Usage:
  from grader import AppleGrader
  grader = AppleGrader("models/detector_best.pt", "models/classifier_best.pt")
  result = grader.grade("tray_photo.jpg")
  print(result)
"""

import torch
import torch.nn as nn
import cv2
import numpy as np
from pathlib import Path
from collections import Counter
from torchvision import models, transforms
from ultralytics import YOLO
import tempfile
import timm

class AppleGrader:
    """
    Two-stage apple grading pipeline.

    Parameters
    ----------
    detector_path : str
        Path to YOLOv8s detector weights (.pt file).
    classifier_path : str
        Path to EfficientNet-B0 classifier weights (.pt file).
    device : str, optional
        "cuda" for GPU, "cpu" for CPU. Auto-detects if not specified.
    """

    # ── Model / preprocessing constants ──────────────────────────────
    # These MUST match what was used during training.
    # Do not change them unless you retrain the classifier.
    CLASSIFIER_INPUT_SIZE = 380     # pixels fed into EfficientNet
    DETECTOR_IMGSZ = 1024           # resolution for YOLO inference
    DETECTOR_CONF = 0.40            # minimum detection confidence
    DETECTOR_IOU = 0.50             # NMS IoU threshold
    PADDING_RATIO = 0.02            # crop padding (2%)
    DROPOUT = 0.3                   # must match training architecture

    def __init__(self, detector_path, classifier_path, device=None):
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        print(f"Using device: {self.device}")

        # ── Load detector ────────────────────────────────────────────
        self.detector = YOLO(detector_path)
        print(f"Detector loaded: {detector_path}")

        # ── Load classifier ──────────────────────────────────────────
        # self.classifier = models.efficientnet_b0(weights=None)
        # num_features = self.classifier.classifier[1].in_features
        # self.classifier.classifier = nn.Sequential(
        #     nn.Dropout(p=self.DROPOUT),
        #     nn.Linear(num_features, 2),
        # )
        
        self.classifier = timm.create_model('efficientnet_b0', pretrained=False)
        in_features = self.classifier.classifier.in_features
        self.classifier.classifier = nn.Sequential(
            nn.Dropout(p=self.DROPOUT),
            nn.Linear(in_features, 2),
        )

        self.classifier.load_state_dict(
            torch.load(classifier_path, map_location=self.device)
        )
        self.classifier = self.classifier.to(self.device)
        self.classifier.eval()
        print(f"Classifier loaded: {classifier_path}")

        # ── Preprocessing transform (must match training) ────────────
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((self.CLASSIFIER_INPUT_SIZE, self.CLASSIFIER_INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])


    def _read_image(self, image_path):
        """Read image, converting HEIC if necessary."""
        image_path = str(image_path)
        suffix = Path(image_path).suffix.lower()

        if suffix in [".heic", ".heif"]:
            try:
                from pillow_heif import register_heif_opener
                from PIL import Image as PILImage
                register_heif_opener()

                pil_img = PILImage.open(image_path).convert("RGB")
                temp_file = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
                temp_path = temp_file.name
                temp_file.close()
                pil_img.save(temp_path, "JPEG", quality=95)
                return cv2.imread(temp_path), temp_path, True  # True = temp file, needs cleanup
            except ImportError:
                raise ImportError("Install pillow-heif for HEIC support: pip install pillow-heif")
        else:
            return cv2.imread(image_path), image_path, False  # False = not a temp file

    def _cleanup_temp(self, detect_path, is_temp):
        """Delete temp file if one was created for HEIC conversion."""
        if is_temp:
            import os
            try:
                os.unlink(detect_path)
            except OSError:
                pass

    # def _preprocess_crop(self, crop):
    #     """
    #     Only applies corrections when the image looks different from training data.
    #     Skips preprocessing entirely for normal images.
    #     """
    #     lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
    #     l, a, b = cv2.split(lab)

    #     current_l_mean = l.mean()
    #     current_b_mean = b.mean()  # low b = blue cast (cold storage)

    #     hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    #     current_sat = hsv[:, :, 1].mean()

    #     # Check if image looks like cold storage:
    #     # brighter than training (L > 140) OR blue cast (b < 120) OR desaturated (sat < 80)
    #     is_cold_storage = (current_l_mean > 140) or (current_b_mean < 120) or (current_sat < 80)

    #     if not is_cold_storage:
    #         return crop  # normal image — don't touch it

    #     # ── Only reaches here for cold storage images ────────────────

    #     # Brightness normalization
    #     current_std = l.std()
    #     if current_std > 0:
    #         l = l.astype(np.float32)
    #         l = (l - current_l_mean) / current_std * 51.2 + 120.1
    #         l = np.clip(l, 0, 255).astype(np.uint8)

    #     # Warm shift
    #     a = cv2.add(a, 5)
    #     b = cv2.add(b, 15)

    #     lab = cv2.merge([l, a, b])
    #     crop = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    #     # Saturation boost
    #     hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    #     h, s, v = cv2.split(hsv)
    #     s = np.clip(s.astype(np.float32) * 1.5, 0, 255).astype(np.uint8)
    #     hsv = cv2.merge([h, s, v])
    #     crop = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

    #     return crop            
    
    # ADD THIS METHOD RIGHT HERE ↓

    def _preprocess_crop(self, crop):
        """
        Gentle brightness normalization only.
        """
        lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        TRAIN_L_MEAN = 120.1
        TRAIN_L_STD = 51.2
        

        current_mean = l.mean()
        current_std = l.std()

        if current_std > 0:
            l = l.astype(np.float32)
            l = (l - current_mean) / current_std * TRAIN_L_STD + TRAIN_L_MEAN
            l = np.clip(l, 0, 255).astype(np.uint8)

        lab = cv2.merge([l, a, b])
        crop = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        return crop

    # def _cleanup_temp(self, detect_path, is_temp):
    #     """Delete temp file if one was created for HEIC conversion."""
    #     if is_temp:
    #         import os
    #         try:
    #             os.unlink(detect_path)
    #         except OSError:
    #             pass
    
    def grade(self, image_path, a_threshold=0.50):
        """
        Grade all apples in a tray image.

        Parameters
        ----------
        image_path : str or Path
            Path to the tray image (JPG, PNG).
        a_threshold : float, optional
            Minimum probability to classify as Grade A.
            Lower (0.35–0.40) = more apples classified as A.
            Higher (0.55–0.60) = stricter, more classified as B.
            Default: 0.50

        Returns
        -------
        dict with keys:
            image         : filename
            total_detected: number of apples found
            grade_A_count : number classified as Grade A
            grade_B_count : number classified as Grade B
            pct_A         : percentage Grade A
            pct_B         : percentage Grade B
            apples        : list of per-apple results
        """
        image_path = str(image_path)

        # ── Stage 1: Detect apples ───────────────────────────────────
        img, detect_path, is_temp = self._read_image(image_path)
        if img is None:
            raise FileNotFoundError(f"Could not read image: {image_path}")
        h, w = img.shape[:2]

        results = self.detector.predict(
            source=detect_path,
            imgsz=self.DETECTOR_IMGSZ,
            conf=self.DETECTOR_CONF,
            iou=self.DETECTOR_IOU,
            verbose=False,
        )

        detections = results[0].boxes

        if len(detections) == 0:
            return {
                "image": Path(image_path).name,
                "total_detected": 0,
                "grade_A_count": 0,
                "grade_B_count": 0,
                "pct_A": 0.0,
                "pct_B": 0.0,
                "apples": [],
            }

        # ── Stage 2: Classify each detected apple ────────────────────
        apples = []

        for box in detections:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
            det_conf = box.conf.item()

            # Apply padding (must match training extraction)
            bw, bh = x2 - x1, y2 - y1
            x1 = max(0, x1 - int(bw * self.PADDING_RATIO))
            y1 = max(0, y1 - int(bh * self.PADDING_RATIO))
            x2 = min(w, x2 + int(bw * self.PADDING_RATIO))
            y2 = min(h, y2 + int(bh * self.PADDING_RATIO))

            crop = img[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            # # Classify
            # crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            # tensor = self.transform(crop_rgb).unsqueeze(0).to(self.device)

            # Preprocess and classify
            crop = self._preprocess_crop(crop)
            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            tensor = self.transform(crop_rgb).unsqueeze(0).to(self.device)


            with torch.no_grad():
                output = self.classifier(tensor)
                probs = torch.softmax(output, dim=1)
                prob_a = probs[0, 0].item()

                grade = "Grade_A" if prob_a >= a_threshold else "Grade_B"
                conf = prob_a if grade == "Grade_A" else probs[0, 1].item()

            apples.append({
                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                "grade": grade,
                "grade_confidence": round(conf, 3),
                "detection_confidence": round(det_conf, 3),
            })

        # ── Aggregate results ────────────────────────────────────────
        a_count = sum(1 for a in apples if a["grade"] == "Grade_A")
        b_count = len(apples) - a_count
        total = len(apples)
        self._cleanup_temp(detect_path, is_temp)
        return {
            "image": Path(image_path).name,
            "total_detected": total,
            "grade_A_count": a_count,
            "grade_B_count": b_count,
            "pct_A": round(a_count / total * 100, 2) if total > 0 else 0.0,
            "pct_B": round(b_count / total * 100, 2) if total > 0 else 0.0,
            "apples": apples,
        }

    def grade_and_annotate(self, image_path, output_path=None, a_threshold=0.50):
        """
        Grade a tray image and save an annotated version with colored boxes.

        Green boxes = Grade A
        Red boxes = Grade B

        Parameters
        ----------
        image_path : str or Path
            Path to input tray image.
        output_path : str or Path, optional
            Where to save annotated image. Defaults to output/<original_name>.
        a_threshold : float, optional
            Grade A probability threshold.

        Returns
        -------
        result : dict (same as grade())
        annotated_image : numpy array (BGR)
        """
        result = self.grade(image_path, a_threshold=a_threshold)

        img, detect_path, is_temp = self._read_image(image_path)
        colors = {"Grade_A": (0, 200, 0), "Grade_B": (0, 50, 220)}

        for apple in result["apples"]:
            x1, y1, x2, y2 = apple["bbox"]
            grade = apple["grade"]
            conf = apple["grade_confidence"]
            color = colors[grade]

            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

            label = f"{grade[-1]} {conf:.0%}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(img, (x1, y1 - th - 6), (x1 + tw + 4, y1), color, -1)
            cv2.putText(
                img, label, (x1 + 2, y1 - 4),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1,
            )

        # Summary bar at top
        summary = (
            f"Total: {result['total_detected']} | "
            f"A: {result['grade_A_count']} ({result['pct_A']}%) | "
            f"B: {result['grade_B_count']} ({result['pct_B']}%)"
        )
        cv2.rectangle(img, (5, 5), (len(summary) * 11 + 10, 35), (0, 0, 0), -1)
        cv2.putText(
            img, summary, (10, 27),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2,
        )

        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(output_path), img)

        self._cleanup_temp(detect_path, is_temp)
        return result, img
