"""All reads/writes to Supabase: matching, candidates, gallery, crops."""
from datetime import datetime, timezone

from supabase import create_client

import config

_client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)


def _vec_literal(vec):
    """pgvector text input format: '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


def match_references(embedding, k=20):
    """Nearest references to `embedding`, as a list of {pig_id, similarity, source}."""
    res = _client.rpc(
        "match_pig_references",
        {"query_embedding": _vec_literal(embedding), "match_count": k},
    ).execute()
    return res.data or []


def upload_crop(crop_jpeg_bytes, camera, index):
    """Upload a crop JPEG and return its storage path."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    path = f"{config.CROP_PREFIX}/{camera}/{ts}_{index}.jpg"
    _client.storage.from_(config.CROP_BUCKET).upload(
        path, crop_jpeg_bytes, {"content-type": "image/jpeg"}
    )
    return path


def create_candidate(crop_path, embedding, best_pig_id, top_guesses, confidence, status, camera):
    _client.table("sighting_candidates").insert(
        {
            "crop_path": crop_path,
            "embedding": _vec_literal(embedding),
            "best_pig_id": best_pig_id,
            "top_guesses": top_guesses,
            "confidence": confidence,
            "status": status,
            "camera": camera,
        }
    ).execute()


def add_reference(pig_id, embedding, crop_path, camera, source="auto"):
    _client.table("pig_reference_embeddings").insert(
        {
            "pig_id": pig_id,
            "embedding": _vec_literal(embedding),
            "crop_path": crop_path,
            "camera": camera,
            "source": source,
        }
    ).execute()


def update_last_sighted(pig_id):
    now = datetime.now(timezone.utc).isoformat()
    _client.table("pigs").update({"last_sighted": now}).eq("id", pig_id).execute()
