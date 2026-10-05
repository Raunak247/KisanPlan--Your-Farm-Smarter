"""
KISANPLAN — Fertilizer Recommendation Inference
Loads fertilizer_recommendation_model.pt from the weights folder.
The .pt file is self-contained: model weights + all preprocessing params
(scaler mean/scale, ordinal encoder categories, label classes) are stored
inside the checkpoint — no extra CSV or sklearn fit required at inference.

Exposes:
    predict_fertilizer(features: dict) -> dict
        features: dict with the 19 raw column keys from the metadata.
        Returns {"recommended_fertilizer", "confidence", "top_k": [...], ...}
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn

ROOT       = Path(__file__).resolve().parents[1]
SERVER_DIR = Path(__file__).resolve().parent

# Candidate paths (first match wins)
MODEL_CANDIDATE_PATHS = [
    ROOT / "weights" / "fertilizer_recommendation_model.pt",
    Path(r"E:\kisanplan_ml_training\models\fertilizer_recommendation_model.pt"),
]

METADATA_PATHS = [
    SERVER_DIR / "fertilizer_model_metadata.json",
    Path(r"E:\kisanplan_ml_training\models\fertilizer_model_metadata.json"),
]


# ─────────────────────────────────────────────────────────────────────────────
# MLP architecture (must match training exactly)
# ─────────────────────────────────────────────────────────────────────────────
class FertilizerMLP(nn.Module):
    def __init__(self, input_dim: int, num_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ─────────────────────────────────────────────────────────────────────────────
# Wrapper — loads once, reusable across requests
# ─────────────────────────────────────────────────────────────────────────────
class FertilizerModelWrapper:
    def __init__(self):
        self.device        = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model         = None
        self.numerical_cols: List[str] = []
        self.categorical_cols: List[str] = []
        self.label_classes: List[str] = []
        self.num_mean: Optional[np.ndarray]  = None
        self.num_scale: Optional[np.ndarray] = None
        self.cat_categories: List[np.ndarray] = []
        self.loaded_path   = None
        self.metadata      = {}
        self._load()

    def _load(self):
        for p in MODEL_CANDIDATE_PATHS:
            if p.exists():
                try:
                    ckpt = torch.load(str(p), map_location=self.device)
                    if not isinstance(ckpt, dict) or "model_state_dict" not in ckpt:
                        print(f"[WARN] fertilizer: unexpected checkpoint format at {p}")
                        continue

                    self.numerical_cols   = ckpt["numerical_cols"]
                    self.categorical_cols = ckpt["categorical_cols"]
                    self.label_classes    = ckpt["label_classes"]
                    self.num_mean         = np.array(ckpt["num_scaler_mean"])
                    self.num_scale        = np.array(ckpt["num_scaler_scale"])
                    self.cat_categories   = [np.array(c) for c in ckpt["cat_encoder_categories"]]

                    input_dim   = ckpt["input_dim"]
                    num_classes = ckpt["num_classes"]

                    model = FertilizerMLP(input_dim, num_classes)
                    model.load_state_dict(ckpt["model_state_dict"])
                    model.to(self.device)
                    model.eval()
                    self.model       = model
                    self.loaded_path = str(p)

                    # Load metadata for API response context
                    for mp in METADATA_PATHS:
                        if mp.exists():
                            try:
                                self.metadata = json.loads(mp.read_text(encoding="utf-8"))
                            except Exception:
                                pass
                            break

                    print(
                        f"[OK] Loaded FertilizerMLP from {p} "
                        f"({num_classes} classes, {input_dim} features)"
                    )
                    return
                except Exception as e:
                    print(f"[WARN] fertilizer: failed to load {p}: {e}")

        print("[INFO] fertilizer: no model found yet. /api/fertilizer will return an error.")

    def _preprocess(self, features: Dict[str, Any]) -> torch.Tensor:
        """Convert a raw features dict → (1, input_dim) float32 tensor."""
        # Numerical: standardise
        num_vals = np.array(
            [float(features.get(col, 0)) for col in self.numerical_cols],
            dtype=np.float64,
        )
        num_scaled = (num_vals - self.num_mean) / (self.num_scale + 1e-9)

        # Categorical: ordinal encode
        cat_encoded = []
        for i, col in enumerate(self.categorical_cols):
            val = str(features.get(col, ""))
            cats = self.cat_categories[i]
            idx = np.where(cats == val)[0]
            cat_encoded.append(float(idx[0]) if len(idx) > 0 else -1.0)

        combined = np.hstack([num_scaled, cat_encoded]).astype(np.float32)
        return torch.tensor(combined, dtype=torch.float32).unsqueeze(0).to(self.device)

    def predict(self, features: Dict[str, Any], topk: int = 3) -> Dict[str, Any]:
        if self.model is None:
            self._load()
        if self.model is None:
            return {
                "error": "Fertilizer model is not loaded yet. Please ensure the .pt file is present.",
                "recommended_fertilizer": None,
                "confidence": 0.0,
                "top_k": [],
            }

        try:
            tensor = self._preprocess(features)
            self.model.eval()
            with torch.no_grad():
                logits = self.model(tensor)
                probs  = torch.softmax(logits, dim=1)[0]

            top_probs, top_idx = torch.topk(probs, k=min(topk, len(self.label_classes)))
            top_probs = top_probs.cpu().tolist()
            top_idx   = top_idx.cpu().tolist()

            recommendations = [
                {
                    "rank":       rank + 1,
                    "fertilizer": self.label_classes[idx],
                    "confidence": round(prob, 4),
                    "confidence_pct": f"{prob * 100:.1f}%",
                }
                for rank, (idx, prob) in enumerate(zip(top_idx, top_probs))
            ]

            best = recommendations[0]
            conf = best["confidence"]

            if conf >= 0.80:
                conf_level = "HIGH"
            elif conf >= 0.55:
                conf_level = "MODERATE"
            else:
                conf_level = "UNCERTAIN"

            return {
                "recommended_fertilizer": best["fertilizer"],
                "confidence":     conf,
                "confidence_pct": best["confidence_pct"],
                "confidence_level": conf_level,
                "top_k":          recommendations,
                "model_path":     self.loaded_path,
                "input_features": list(features.keys()),
            }

        except Exception as e:
            return {
                "error": f"Prediction failed: {e}",
                "recommended_fertilizer": None,
                "confidence": 0.0,
                "top_k": [],
            }


# ─────────────────────────────────────────────────────────────────────────────
# Global singleton
# ─────────────────────────────────────────────────────────────────────────────
FERTILIZER_WRAPPER = FertilizerModelWrapper()


def predict_fertilizer(features: Dict[str, Any]) -> Dict[str, Any]:
    """Public API — call this from sensor_bridge.py."""
    return FERTILIZER_WRAPPER.predict(features)


if __name__ == "__main__":
    import sys, json as _json
    test_features = {
        "Soil_pH": 6.5, "Soil_Moisture": 40.0, "Organic_Carbon": 0.9,
        "Electrical_Conductivity": 1.5, "Nitrogen_Level": 80,
        "Phosphorus_Level": 45, "Potassium_Level": 60,
        "Temperature": 25.0, "Humidity": 65.0, "Rainfall": 1500.0,
        "Fertilizer_Used_Last_Season": 175.0, "Yield_Last_Season": 4.5,
        "Soil_Type": "Loamy", "Crop_Type": "Wheat",
        "Crop_Growth_Stage": "Vegetative", "Season": "Rabi",
        "Irrigation_Type": "Canal", "Previous_Crop": "Rice",
        "Region": "North",
    }
    result = predict_fertilizer(test_features)
    print(_json.dumps(result, indent=2))
