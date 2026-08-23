# pig-recognizer

Background worker that watches the guinea-pig cameras and logs sightings.

Every `INTERVAL_SECONDS` (default 10 min), during daylight hours only, it:

1. grabs a frame from each camera (RTSP via ffmpeg),
2. detects pigs (YOLO-World, zero-shot for now) and crops each one,
3. embeds each crop (DINOv2-small, 384-dim),
4. matches it against the growing gallery (`pig_reference_embeddings`, pgvector KNN),
5. **very confident** (`similarity ≥ AUTO_CONFIRM_SIM`, clear margin over #2, pig has
   ≥ `AUTO_CONFIRM_MIN_REFS` references) → updates `pigs.last_sighted` and adds the
   crop as a provisional (`auto`) reference;
   otherwise → writes a `sighting_candidate` for review in the app.

The gallery starts near-empty and **grows over time**: confirming a candidate in
the app promotes its (already-computed) embedding into the gallery. No retraining —
matching is nearest-neighbour, so learning a pig is just an insert.

## Requires the migration

`supabase/migrations/20260823_add_pig_recognition.sql` (pgvector + the two tables +
`match_pig_references`). Apply with `npx supabase db push`.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt
# set env (see below), then:
python main.py            # loop
python -c "import pipeline; pipeline.run_once()"   # single run, for testing
```

## Environment variables

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — service role; bypasses RLS
- `PIG_CAM_RTSP` — top-down camera RTSP url (`PIG_CAM_B_RTSP` for the close-up later)

Optional (defaults in `config.py`): `INTERVAL_SECONDS`, `TZ`,
`DAYLIGHT_START_HOUR`, `DAYLIGHT_END_HOUR`, `CROP_BUCKET`, `CROP_PREFIX`,
`DETECTOR_MODEL`, `DETECTION_CONF`, `EMBED_MODEL`, `REVIEW_MIN_SIM`,
`AUTO_CONFIRM_SIM`, `AUTO_CONFIRM_MARGIN`, `AUTO_CONFIRM_MIN_REFS`.

## Deploy to Fly

```bash
fly launch --no-deploy      # once, to create the app (or reuse fly.toml)
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... PIG_CAM_RTSP=...
fly deploy
```

One always-on Machine (`shared-cpu-1x`, 1 GB). If torch OOMs, bump `memory` to
`2048mb` in `fly.toml`. Daylight-only is enforced in code; to also save money you
can later stop the Machine overnight.

## Thresholds need calibrating

The `AUTO_CONFIRM_*` / `REVIEW_MIN_SIM` defaults are conservative guesses. The album
test gave same-pig ~0.65 vs different-pig ~0.42, but lookalike pairs hit ~0.76 — so
auto-confirm leans on the **margin**, not raw similarity. Recalibrate once real
camera crops exist.
