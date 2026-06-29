# Proximity-based friendship (design notes)

Deriving friendship strength from pigs being **near each other** on the map, not
just explicitly recorded together.

## Built

Implemented in `src/services/friendship-proximity.ts` and folded into the Best
Friends ranking on the Friends page:

- **Window:** two pigs sighted within **5 minutes** of each other and within
  **1 cell** (Chebyshev ≤ 1) on the **same level** = a proximity moment.
- **Cooldown:** repeats for a pair within **1 hour** collapse to one point.
- **Weight:** each counted moment is worth **0.5** (vs 1 for a deliberate event).
- **Double counting:** not specially handled — the 5-min window + 1-hour
  cooldown are considered sufficient. A group event of pigs at one spot does also
  earn a small proximity bump on top of its +1; accepted for now.
- Derived on the fly from `sighting_events` (no proximity table). Cleared events
  are ignored.

The rest of this doc is the original exploration that led to the above.

## The idea

Two pigs sighted **within 1 cell of each other** (in any direction) on the
**same level**, around the **same time**, should count as a bonding event — an
internal, hidden category called `proximity`. It's never shown to the user as a
behaviour option; it only feeds the Best Friends ranking.

- **Distance:** `|Δcol| <= 1 && |Δrow| <= 1` (Chebyshev ≤ 1, i.e. the 8
  neighbours + same cell), **same `level`** (upstairs ≠ downstairs even at the
  same x/y).
- **Derived, not stored:** compute proximity pairs on the fly from the raw
  `sighting_events` when building the ranking. No proximity table, no background
  job. `proximity` is just an internal label.

## Why timing is the hard part

A sighting is a snapshot of where a pig was at one moment. Without a time
constraint, a pig seen at the kibble station this morning would be "near" a pig
seen there last week — meaningless. Proximity needs **space AND time**: only
compare sightings that fall in the same time bucket.

## Options for the time window

### A. Per-day buckets (recommended starting point)
All sightings on the same calendar day are one "session". Within a day, any two
pigs whose sightings are within 1 cell (same level) → 1 proximity point.
Simple, predictable, matches a daily "walk round and note where everyone is"
habit.

### B. Time-cluster / sliding window
Two sightings count if they're within N minutes of each other (e.g. 30–60 min)
and within 1 cell. More precise (won't lump a whole day together) but fuzzier to
tune, and windows can overlap.

### C. Explicit sessions ("rollcall")
You start/finish a round; everything marked in it is one snapshot. Most
accurate, but adds a manual step.

## Recommended rule

**Per-day buckets, one proximity point per pair per day.**

> For each day, for each pair of pigs that has a sighting within 1 cell
> (Chebyshev ≤ 1) on the same level that day → **+1 proximity point**, counted
> **once per pair per day**.

The once-per-day cap is the important bit: without it, marking the same two pigs
near each other five times in an afternoon would award five points and drown out
deliberate observations. "They were neighbours today" = +1. Pigs that are
*consistently* near each other rise naturally over weeks.

## Open decisions

1. **Weight.** Should proximity count the same as an explicit event (+1) or less
   (e.g. 0.5)? Leaning lighter — "spotted near" is weaker evidence than "seen
   snacking together", so deliberate observations should dominate.
2. **Double-counting.** If two pigs are marked *together* in one group event
   (already +1) and are also within 1 cell that day, do they also get the
   proximity point? Cleanest: the group event already implies proximity, so skip
   the proximity point for that pair that day.

## Implementation sketch

- Bucket `sighting_events` by **date** (use `created_at`; `observed_at` is
  currently always null — or start stamping it when marking).
- For each day bucket: collect each pig's cell(s) + level that day. For every
  pair within Chebyshev ≤ 1 and same level, add 1 (deduped per pair per day,
  and skip pairs already credited by a same-day group event).
- Fold these proximity points into the existing pair-points map in the friends
  ranking, alongside logged events and map group events.
- Optionally weight at 0.5.

## Related current behaviour

- A map sighting of **2+ pigs in one marking** already counts as a bonding event
  (+1 per pair) — that's explicit co-occurrence, distinct from proximity.
- Single-pig sightings contribute nothing today; proximity is what would let
  separately-marked-but-nearby pigs start to count.
