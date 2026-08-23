"""One recognition run: grab a frame per camera, detect pigs, and act on each."""
import subprocess
import tempfile
from collections import defaultdict

import cv2

import config
import models
import supabase_io as db


def grab_frame(rtsp_url):
    """Pull a single frame from an RTSP stream via ffmpeg. Returns a BGR ndarray."""
    with tempfile.NamedTemporaryFile(suffix=".jpg") as tf:
        cmd = [
            "ffmpeg", "-nostdin", "-rtsp_transport", "tcp",
            "-i", rtsp_url, "-frames:v", "1", "-q:v", "2",
            "-y", tf.name, "-loglevel", "error",
        ]
        subprocess.run(cmd, check=True, timeout=60)
        return cv2.imread(tf.name)


def _aggregate(matches):
    """Collapse per-reference matches into per-pig scores (best sim + ref count),
    sorted best-first."""
    best = {}
    counts = defaultdict(int)
    for m in matches:
        pid, sim = m["pig_id"], m["similarity"]
        counts[pid] += 1
        if pid not in best or sim > best[pid]:
            best[pid] = sim
    guesses = [
        {"pig_id": pid, "similarity": round(sim, 4), "n_refs": counts[pid]}
        for pid, sim in best.items()
    ]
    guesses.sort(key=lambda g: g["similarity"], reverse=True)
    return guesses


def _decide(guesses):
    """Return (status, best_pig_id, confidence). Precision over recall."""
    if not guesses or guesses[0]["similarity"] < config.REVIEW_MIN_SIM:
        # Empty gallery or nothing close enough -> unknown, send to review.
        return "pending", None, (guesses[0]["similarity"] if guesses else None)

    top = guesses[0]
    second = guesses[1]["similarity"] if len(guesses) > 1 else 0.0
    margin = top["similarity"] - second

    very_confident = (
        top["similarity"] >= config.AUTO_CONFIRM_SIM
        and margin >= config.AUTO_CONFIRM_MARGIN
        and top["n_refs"] >= config.AUTO_CONFIRM_MIN_REFS
    )
    status = "auto" if very_confident else "pending"
    return status, top["pig_id"], top["similarity"]


def _process_crop(crop_bgr, camera, index):
    crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
    embedding = models.embed(crop_rgb)
    guesses = _aggregate(db.match_references(embedding))
    status, best_pig_id, confidence = _decide(guesses)

    ok, buf = cv2.imencode(".jpg", crop_bgr)
    crop_path = db.upload_crop(buf.tobytes(), camera, index)

    db.create_candidate(
        crop_path=crop_path,
        embedding=embedding,
        best_pig_id=best_pig_id,
        top_guesses=guesses[:5],
        confidence=confidence,
        status=status,
        camera=camera,
    )

    if status == "auto":
        db.update_last_sighted(best_pig_id)
        db.add_reference(best_pig_id, embedding, crop_path, camera, source="auto")

    return status, best_pig_id, confidence


def run_once():
    """Process one frame from every configured camera."""
    for camera, url in config.CAMERAS.items():
        try:
            frame = grab_frame(url)
        except Exception as e:
            print(f"[{camera}] frame grab failed: {e}")
            continue
        if frame is None:
            print(f"[{camera}] no frame")
            continue

        boxes = models.detect(frame)
        print(f"[{camera}] {len(boxes)} detection(s)")
        h, w = frame.shape[:2]
        for i, (x1, y1, x2, y2) in enumerate(boxes):
            pad = int(0.05 * max(x2 - x1, y2 - y1))
            x1, y1 = max(0, x1 - pad), max(0, y1 - pad)
            x2, y2 = min(w, x2 + pad), min(h, y2 + pad)
            crop = frame[y1:y2, x1:x2]
            if crop.size == 0:
                continue
            try:
                status, pid, conf = _process_crop(crop, camera, i)
                print(f"[{camera}] crop {i}: {status} pig={pid} conf={conf}")
            except Exception as e:
                print(f"[{camera}] crop {i} failed: {e}")
