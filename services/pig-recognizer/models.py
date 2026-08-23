"""Load the detector and embedder once, keep them warm for the process life."""
import numpy as np
import torch
from PIL import Image
from ultralytics import YOLO
from transformers import AutoImageProcessor, AutoModel

import config

_detector = None
_embed_proc = None
_embed_model = None


def _load():
    global _detector, _embed_proc, _embed_model
    if _detector is None:
        _detector = YOLO(config.DETECTOR_MODEL)
        _detector.set_classes(config.DETECTOR_PROMPTS)
        _embed_proc = AutoImageProcessor.from_pretrained(config.EMBED_MODEL)
        _embed_model = AutoModel.from_pretrained(config.EMBED_MODEL)
        _embed_model.eval()


def detect(frame_bgr):
    """Return a list of (x1, y1, x2, y2) boxes for every detected animal."""
    _load()
    res = _detector.predict(frame_bgr, conf=config.DETECTION_CONF, iou=0.5, verbose=False)[0]
    boxes = []
    for b in res.boxes:
        x1, y1, x2, y2 = map(int, b.xyxy[0])
        boxes.append((x1, y1, x2, y2))
    return boxes


def embed(crop_rgb):
    """Return an L2-normalised DINOv2 CLS embedding for one crop (RGB ndarray)."""
    _load()
    im = Image.fromarray(crop_rgb)
    inputs = _embed_proc(images=im, return_tensors="pt")
    with torch.no_grad():
        out = _embed_model(**inputs)
    vec = out.last_hidden_state[:, 0, :].squeeze(0).numpy()
    return vec / (np.linalg.norm(vec) + 1e-9)
