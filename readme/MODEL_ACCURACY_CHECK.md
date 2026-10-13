# How to check Malus Lens model accuracy

The app can look “correct” and still be wrong on hard trays. Use these layers — from quick to rigorous.

## What you already know

`models/config.json` reports training **`best_val_acc ≈ 0.91`** (classifier validation accuracy during training).  
That is **not** the same as “correct Grade A/B counts on every cold-store tray photo.” Field accuracy needs labeled photos from **your** cameras/lighting.

## Level 1 — Visual spot-check (do this first, 30–60 min)

1. Pick **10–20 real tray photos** (mix: good lots, bad lots, crowded trays, dark light).
2. Run with boxes saved:
   ```powershell
   python grade.py sample_images/apple.jpg --save --output output/
   ```
   Or folder:
   ```powershell
   python grade.py path\to\trays\ --save --output output/
   ```
3. Open each annotated image:
   - **Green** = Grade A, **Red** = Grade B
   - Missed apples? → detector problem  
   - Wrong A/B color? → classifier / threshold problem  
4. Write a simple sheet:

| Image | Your count A | Your count B | Model A | Model B | Notes |
|-------|--------------|--------------|---------|---------|-------|

**Pass rule of thumb for a demo:** most trays “close enough” for operations (e.g. A/B % within ~5–10 points of a human count). If many trays are way off, do not trust production yet.

## Level 2 — Threshold tuning (no retraining)

Default `a_threshold` is **0.45** (`models/config.json`).

```powershell
# More Grade A (lenient)
python grade.py tray.jpg --threshold 0.35 --save

# More Grade B (strict)
python grade.py tray.jpg --threshold 0.55 --save
```

Pick the threshold that matches how the cold store defines “defect,” then keep it in `models/config.json`.

## Level 3 — Proper accuracy (needs labels)

You need a **held-out set** the model was not trained on:

1. **Detection labels:** apple boxes (or at least total apple count per image).  
2. **Grade labels:** each apple (or crop) marked A vs B by a domain expert.

Metrics to report:

| Metric | Meaning |
|--------|---------|
| Detection recall / precision | Did we find the apples? |
| Classification accuracy / F1 | A vs B on crops |
| Lot-level A% error | \|model_pct_A − human_pct_A\| |

Training scripts/datasets are **not** in this repo (client-provided historically). If you need retrain: collect labeled trays → fine-tune detector + classifier → replace `models/*.pt`.

## Level 4 — App vs CLI consistency

If CLI looks good but the app looks wrong:

1. Confirm `REACT_APP_DEMO_MODE=false` (demo uses fake 72%/28%).  
2. Confirm Results are from live API (`demo: false` in analysis result).  
3. Compare same image: CLI `grade.py` vs `POST /api/v1/grade`.

## Practical recommendation for CnEL / client

1. Do **Level 1** on 15 client trays this week.  
2. Tune threshold (**Level 2**) with one QC person.  
3. Only if Level 1 fails often → plan labeled data + retrain (**Level 3**).

Until Level 1 is signed off by a domain expert, treat model output as **assistive**, not absolute truth.
