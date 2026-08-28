"""Configuration, all via environment variables (Fly secrets in production)."""
import os


def _f(name, default):
    return float(os.environ.get(name, default))


def _i(name, default):
    return int(os.environ.get(name, default))


# --- Supabase (worker uses the service-role key, which bypasses RLS) ---------
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Where crops are stored + the path prefix inside that bucket.
CROP_BUCKET = os.environ.get("CROP_BUCKET", "pig_photos")
CROP_PREFIX = os.environ.get("CROP_PREFIX", "recognition")

# --- Cameras: name -> rtsp url. Add more as env vars CAM_<NAME>_RTSP. ---------
CAMERAS = {}
if os.environ.get("PIG_CAM_RTSP"):
    CAMERAS["topdown"] = os.environ["PIG_CAM_RTSP"]
if os.environ.get("PIG_CAM_B_RTSP"):
    CAMERAS["closeup"] = os.environ["PIG_CAM_B_RTSP"]

# --- Loop / daylight gate ----------------------------------------------------
INTERVAL_SECONDS = _i("INTERVAL_SECONDS", 600)      # 10 minutes
TZ = os.environ.get("TZ", "Australia/Adelaide")
DAYLIGHT_START_HOUR = _i("DAYLIGHT_START_HOUR", 6)  # inclusive
DAYLIGHT_END_HOUR = _i("DAYLIGHT_END_HOUR", 20)     # exclusive

# --- Models ------------------------------------------------------------------
# Smaller YOLO-World keeps the Fly RAM tier low; bump to m/x for more recall.
DETECTOR_MODEL = os.environ.get("DETECTOR_MODEL", "yolov8s-worldv2.pt")
DETECTOR_PROMPTS = ["guinea pig", "small animal", "rodent"]
DETECTION_CONF = _f("DETECTION_CONF", 0.05)         # up from 0.02 to trim merged two-pig blobs, but low since camera pigs score low
EMBED_MODEL = os.environ.get("EMBED_MODEL", "facebook/dinov2-small")  # 384-dim

# --- Decision thresholds -----------------------------------------------------
# NOTE: these MUST be recalibrated once we have real camera crops. The album
# experiment gave same-pig ~0.65 / different-pig ~0.42, but lookalikes reached
# ~0.76 — which is why AUTO_CONFIRM leans on the MARGIN, not similarity alone.
# Conservative defaults: precision over recall. Cold start (empty gallery) sends
# everything to review, which is exactly what we want.
REVIEW_MIN_SIM = _f("REVIEW_MIN_SIM", 0.45)   # below this, treat as unknown pig
AUTO_CONFIRM_SIM = _f("AUTO_CONFIRM_SIM", 0.70)  # top guess must be at least this
AUTO_CONFIRM_MARGIN = _f("AUTO_CONFIRM_MARGIN", 0.10)  # top must beat #2 by this
AUTO_CONFIRM_MIN_REFS = _i("AUTO_CONFIRM_MIN_REFS", 3)  # pig needs >= N references

FRAMES_PER_RUN = _i("FRAMES_PER_RUN", 1)  # multi-frame agreement is a later boost
