# Social Order — Feature Ideas

## What the data is

The `social_order` table stores **directed pairwise dominance observations**:

| Column              | Meaning                                            |
| ------------------- | -------------------------------------------------- |
| `dominant_pig_id`   | the pig that "won" / dominated                     |
| `submissive_pig_id` | the pig that yielded                               |
| `observed_at`       | when it was observed                               |
| `notes`             | free-text context (currently unused in the UI)     |
| `created_at`        | row creation timestamp                             |

Each row is one edge "A ▸ B" in a **directed dominance graph**. Today the page only
stores and lists these edges as a flat list with add/delete — none of the structure
in the graph is surfaced.

---

## 1. Pecking order (ranked hierarchy) — _highest value_

Turn the pairwise edges into a single ranked list: "who is top pig?" This is the
core payoff of collecting the data and it's pure aggregation — no new tables.

**Scoring options**

- **Copeland score** (recommended): `# pigs you dominate − # pigs that dominate you`.
  Simple, intuitive, handles incomplete data gracefully.
- **Win rate**: dominance wins ÷ total observed interactions. Good when some pairs
  are observed far more than others.
- **Elo / ranking model**: each observation updates ratings. Best if you log lots of
  repeat matchups over time, overkill for small datasets.

**UI**: a leaderboard from 👑 top pig down to the bottom, each row showing the pig
card + score (and maybe a record like "dominates 4, yields to 1").

**Effort**: low. Aggregate in a `useMemo` over data already loaded on the page.

---

## 2. Dominance graph visualization

Render the dominance network visually instead of as a linear list.

- Reuse the existing **ReactFlow** setup from the Family Tree page.
- Nodes = pigs, directed arrows = "dominates", laid out top-to-bottom by computed rank.
- Crown / highlight the top of the hierarchy.

Much more legible than the list once there are more than a handful of relationships,
and it makes non-linear structure (clusters, lone dominant pigs) obvious at a glance.

**Effort**: medium. Layout logic + reusing ReactFlow; depends on #1 for the ranking
used to position nodes.

---

## 3. Per-pig social panel (on PigPage)

Surface each pig's social standing where people actually look — the pig detail page.

- "**Dominates:** X, Y" and "**Submissive to:** Z"
- The pig's overall **rank** in the herd (from #1).
- Optional: a quick "add a dominance observation involving this pig" shortcut.

Makes the data discoverable instead of hidden behind a dedicated page.

**Effort**: low–medium. A new panel on PigPage querying social order edges for one pig.

---

## 4. Cycle / inconsistency detection

Real guinea pig hierarchies aren't always transitive. Detect and flag loops such as
**A ▸ B ▸ C ▸ A** ("standoff triangle").

- Fun insight into genuinely non-linear social dynamics.
- Doubles as a **data-quality check** — surfaces conflicting or stale observations
  that might need a second look or a fresh observation to break the tie.

**Effort**: medium. Cycle detection over the edge set (DFS); UI to highlight the loop.

---

## 5. Hierarchy over time / "coups"

We capture `observed_at` but currently ignore it.

- Show how the order has **shifted over time**.
- Highlight **"coups"** — when a previously submissive pig flips to dominate a pig it
  used to yield to.
- A good home for the **`notes`** field, which is collected but never shown.

**Effort**: medium–high. Needs time-bucketing of observations and a before/after view.

---

## Suggested order

1. **#1 Pecking order** — core insight, lowest effort, unlocks ranking used elsewhere.
2. **#3 Per-pig panel** — cheap, high discoverability, fits work already happening on PigPage.
3. **#2 Graph viz** — most visually impressive showcase feature.
4. **#4 / #5** — nice-to-have analytics once the basics are in.
