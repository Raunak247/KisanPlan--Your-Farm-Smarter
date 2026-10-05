import base64
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import torch
import torch.nn as nn
from PIL import Image
import torchvision.models as models
import torchvision.transforms as transforms

ROOT = Path(__file__).resolve().parents[1]
SERVER_DIR = Path(__file__).resolve().parent

# Candidate paths for model weights (first match wins)
MODEL_CANDIDATE_PATHS = [
    ROOT / "weights" / "crop_disease_model.pt",                          # primary ✓
    Path(r"E:\kisanplan_ml_training\models\crop_disease_model.pt"),      # training folder
    ROOT / "weights" / "disease.pt",                                     # YOLO fallback
    ROOT / "weights" / "best.pt",                                        # YOLO fallback 2
]

# Knowledge base and class mappings
DISEASE_INFO_PATHS = [
    SERVER_DIR / "disease_info.json",
    Path(r"E:\code\disease_info.json"),
]

CLASSES_JSON_PATHS = [
    SERVER_DIR / "crop_disease_classes.json",
    Path(r"E:\kisanplan_ml_training\models\crop_disease_classes.json"),
]


def load_disease_kb() -> Dict[str, Any]:
    for path in DISEASE_INFO_PATHS:
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return data.get("entries", data)
            except Exception as e:
                print(f"[WARN] Failed to load disease KB from {path}: {e}")
    return {}


def load_classes_map() -> Dict[str, str]:
    for path in CLASSES_JSON_PATHS:
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return {str(k): v for k, v in data.items()}
            except Exception as e:
                print(f"[WARN] Failed to load classes map from {path}: {e}")
    return {}


DISEASE_KB = load_disease_kb()
CLASSES_MAP = load_classes_map()


def format_title(text: str) -> str:
    """Converts snake_case or messy labels to clean Title Case."""
    if not text:
        return ""
    clean = re.sub(r"[_\-]+", " ", text).strip()
    return " ".join(word.capitalize() for word in clean.split())


class ModelWrapper:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.model_type = None  # "torch_efficientnet", "yolo", etc.
        self.idx_to_class = {}
        self.preprocess = None
        self.image_size = 224
        self.loaded_path = None
        self._load()

    def _load(self):
        # 1. Try PyTorch crop_disease_model.pt first
        pt_path = None
        for p in MODEL_CANDIDATE_PATHS:
            if p.exists() and p.name == "crop_disease_model.pt":
                pt_path = p
                break

        if pt_path:
            try:
                checkpoint = torch.load(str(pt_path), map_location=self.device)
                if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                    self.image_size = checkpoint.get("image_size", 224)
                    self.idx_to_class = checkpoint.get("idx_to_class", CLASSES_MAP)
                    num_classes = checkpoint.get("num_classes", len(self.idx_to_class))
                    mean = checkpoint.get("mean", [0.485, 0.456, 0.406])
                    std = checkpoint.get("std", [0.229, 0.224, 0.225])

                    net = models.efficientnet_b0(weights=None)
                    in_features = net.classifier[1].in_features
                    net.classifier = nn.Sequential(
                        nn.Dropout(p=0.3, inplace=True),
                        nn.Linear(in_features, num_classes),
                    )
                    net.load_state_dict(checkpoint["model_state_dict"])
                    net.to(self.device)
                    net.eval()
                    self.model = net
                    self.model_type = "torch_efficientnet"
                    self.loaded_path = str(pt_path)

                    self.preprocess = transforms.Compose([
                        transforms.Resize(int(self.image_size * 1.143)),
                        transforms.CenterCrop(self.image_size),
                        transforms.ToTensor(),
                        transforms.Normalize(mean=mean, std=std),
                    ])
                    print(f"[OK] Loaded PyTorch EfficientNet-B0 model from {pt_path} ({num_classes} classes)")
                    return
            except Exception as e:
                print(f"[WARN] Failed to load PyTorch checkpoint {pt_path}: {e}")

        # 2. Try YOLO models as fallback
        for yolo_cand in [ROOT / "weights" / "best.pt", ROOT / "weights" / "disease.pt"]:
            if yolo_cand.exists():
                try:
                    from ultralytics import YOLO
                    self.model = YOLO(str(yolo_cand))
                    self.model_type = "yolo"
                    self.loaded_path = str(yolo_cand)
                    print(f"[OK] Loaded YOLO model from {yolo_cand}")
                    return
                except Exception as e:
                    print(f"[WARN] Failed to load YOLO from {yolo_cand}: {e}")

        print("[INFO] No ML model checkpoint found yet. Ready to load updated .pt when provided.")

    def predict(self, image_path: str, topk: int = 5) -> Dict[str, Any]:
        # If model is not loaded, attempt to reload in case file was just added
        if self.model is None:
            self._load()

        if self.model_type == "torch_efficientnet":
            return self._predict_torch(image_path, topk)
        elif self.model_type == "yolo":
            return self._predict_yolo(image_path, topk)
        else:
            return self._fallback_prediction(image_path)

    def _predict_torch(self, image_path: str, topk: int = 5) -> Dict[str, Any]:
        img = Image.open(image_path).convert("RGB")
        tensor = self.preprocess(img).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1)[0]

        top_probs, top_indices = torch.topk(probs, k=min(topk, len(self.idx_to_class)))
        top_probs = top_probs.cpu().tolist()
        top_indices = top_indices.cpu().tolist()

        predictions = []
        for rank, (idx, prob) in enumerate(zip(top_indices, top_probs)):
            cls_name = self.idx_to_class.get(str(idx), self.idx_to_class.get(idx, f"Class_{idx}"))
            parts = cls_name.split("__", 1)
            crop = parts[0] if len(parts) >= 1 else "Unknown"
            disease = parts[1] if len(parts) >= 2 else "Unknown"
            predictions.append({
                "rank": rank + 1,
                "class": cls_name,
                "crop": format_title(crop),
                "disease": format_title(disease),
                "confidence": round(prob, 4),
            })

        best = predictions[0]
        raw_class = best["class"]
        crop = best["crop"]
        disease_title = best["disease"]
        conf = best["confidence"]

        # Parse detected name
        is_healthy = "healthy" in raw_class.lower()
        if is_healthy:
            detected = f"{crop} Healthy"
            status = "HEALTHY"
        else:
            detected = f"{crop} {disease_title}"
            status = "DISEASE DETECTED"

        if conf >= 0.90:
            conf_level = "HIGH"
        elif conf >= 0.75:
            conf_level = "MODERATE"
        else:
            conf_level = "UNCERTAIN"
            if not is_healthy:
                status = "DISEASE UNCERTAIN"

        # Lookup in knowledge base
        kb_entry = self._lookup_kb(raw_class, crop, disease_title)

        treatment = kb_entry.get("treatment", [])
        if isinstance(treatment, str):
            treatment = [treatment]
        prevention = kb_entry.get("prevention", [])
        if isinstance(prevention, str):
            prevention = [prevention]

        # Default treatment/prevention fallback if not in KB
        if not treatment:
            if is_healthy:
                treatment = ["No disease treatment is indicated from this class."]
            else:
                treatment = [
                    "Remove severely infected leaves and crop debris.",
                    "Improve airflow and canopy spacing around plants.",
                    "Follow locally approved fungicide label/guidance if required.",
                ]
        if not prevention:
            prevention = [
                "Avoid prolonged leaf wetness and overhead watering.",
                "Remove and safely dispose of infected plant debris.",
                "Maintain adequate plant spacing and inspect crop regularly.",
            ]

        return {
            "crop": crop,
            "detected": detected,
            "disease": disease_title,
            "raw_class": raw_class,
            "confidence": conf,
            "confidence_pct": f"{conf * 100:.1f}%",
            "confidence_level": conf_level,
            "status": status,
            "treatment": treatment,
            "prevention": prevention,
            "spraying_suitability": "CHECK",
            "spraying_reason": "Weather conditions required before spraying",
            "top_predictions": predictions,
            "model_type": self.model_type,
            # Backwards compatibility fields
            "crop_class": crop.lower(),
            "disease_confidence": conf,
            "disease_status": "healthy" if is_healthy else ("detected" if conf >= 0.75 else "uncertain"),
            "disease_note": kb_entry.get("important_note", "Confirm diagnosis with local agronomy extension before chemical application."),
        }

    def _predict_yolo(self, image_path: str, topk: int = 5) -> Dict[str, Any]:
        result = self.model.predict(source=image_path, verbose=False)[0]
        top_indices = result.probs.top5[:topk]
        names = result.names
        predictions = []

        for rank, idx in enumerate(top_indices):
            cls_name = names[idx]
            prob = float(result.probs.data[idx])
            parts = cls_name.split("__", 1) if "__" in cls_name else cls_name.split(" ", 1)
            crop = parts[0] if len(parts) >= 1 else "Unknown"
            disease = parts[1] if len(parts) >= 2 else "Unknown"
            predictions.append({
                "rank": rank + 1,
                "class": cls_name,
                "crop": format_title(crop),
                "disease": format_title(disease),
                "confidence": round(prob, 4),
            })

        best = predictions[0]
        raw_class = best["class"]
        crop = best["crop"]
        disease_title = best["disease"]
        conf = best["confidence"]

        is_healthy = "healthy" in raw_class.lower() or disease_title.lower() in ("healthy", "normal")
        if is_healthy:
            detected = f"{crop} Healthy"
            status = "HEALTHY"
        else:
            detected = f"{crop} {disease_title}"
            status = "DISEASE DETECTED"

        if conf >= 0.90:
            conf_level = "HIGH"
        elif conf >= 0.75:
            conf_level = "MODERATE"
        else:
            conf_level = "UNCERTAIN"
            if not is_healthy:
                status = "DISEASE UNCERTAIN"

        kb_entry = self._lookup_kb(raw_class, crop, disease_title)

        treatment = kb_entry.get("treatment", [])
        if isinstance(treatment, str):
            treatment = [treatment]
        prevention = kb_entry.get("prevention", [])
        if isinstance(prevention, str):
            prevention = [prevention]

        if not treatment:
            if is_healthy:
                treatment = ["No disease treatment is indicated from this class."]
            else:
                treatment = [
                    "Remove severely infected leaves and crop debris.",
                    "Improve airflow and canopy spacing around plants.",
                    "Follow locally approved fungicide label/guidance if required.",
                ]
        if not prevention:
            prevention = [
                "Avoid prolonged leaf wetness and overhead watering.",
                "Remove and safely dispose of infected plant debris.",
                "Maintain adequate plant spacing and inspect crop regularly.",
            ]

        return {
            "crop": crop,
            "detected": detected,
            "disease": disease_title,
            "raw_class": raw_class,
            "confidence": conf,
            "confidence_pct": f"{conf * 100:.1f}%",
            "confidence_level": conf_level,
            "status": status,
            "treatment": treatment,
            "prevention": prevention,
            "spraying_suitability": "CHECK",
            "spraying_reason": "Weather conditions required before spraying",
            "top_predictions": predictions,
            "model_type": "yolo",
            "crop_class": crop.lower(),
            "disease_confidence": conf,
            "disease_status": "healthy" if is_healthy else ("detected" if conf >= 0.75 else "uncertain"),
            "disease_note": kb_entry.get("important_note", "Confirm diagnosis with local agronomy extension before chemical application."),
        }

    def _fallback_prediction(self, image_path: str) -> Dict[str, Any]:
        return {
            "crop": "Tomato",
            "detected": "Model Checkpoint Pending",
            "disease": "unknown",
            "confidence": 0.0,
            "confidence_pct": "0.0%",
            "confidence_level": "UNCERTAIN",
            "status": "MODEL NOT READY",
            "treatment": ["Model weights .pt file is being uploaded. Waiting for updated model."],
            "prevention": ["Keep plant canopy dry and maintain good field sanitation."],
            "spraying_suitability": "CHECK",
            "spraying_reason": "Weather conditions required before spraying",
            "top_predictions": [],
            "model_type": "none",
        }

    def _lookup_kb(self, raw_class: str, crop: str, disease: str) -> Dict[str, Any]:
        # 1. Exact match on raw_class (e.g. Tomato__early_blight)
        if raw_class in DISEASE_KB:
            return DISEASE_KB[raw_class]

        # 2. Match with double underscore variation
        candidate_key = f"{crop}__{disease.replace(' ', '_').lower()}"
        if candidate_key in DISEASE_KB:
            return DISEASE_KB[candidate_key]

        # 3. Case insensitive match on all keys
        lower_raw = raw_class.lower()
        for k, v in DISEASE_KB.items():
            if k.lower() == lower_raw:
                return v

        # 4. Search by crop and disease attributes
        crop_lower = crop.lower()
        disease_lower = disease.lower()
        for k, v in DISEASE_KB.items():
            entry_crop = str(v.get("crop", "")).lower()
            entry_dis = str(v.get("disease", "")).lower()
            if entry_crop == crop_lower and (entry_dis in disease_lower or disease_lower in entry_dis):
                return v

        return {}


# Global instance
MODEL_WRAPPER = ModelWrapper()


def predict_crop(image_path: str) -> Dict[str, Any]:
    return MODEL_WRAPPER.predict(image_path)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(json.dumps(predict_crop(sys.argv[1]), indent=2))
    else:
        print("Usage: python predict_crop.py <image_path>")