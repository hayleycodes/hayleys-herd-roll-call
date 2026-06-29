import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { subMonths } from 'date-fns';
import PigCard from '../../components/PigList/PigCard/PigCard';
import Loading from '../../components/ui/Loading/Loading';
import Button from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import Panel from '../../components/ui/Panel/Panel';
import { PigThumb } from '../../components/PigPicker/PigPicker';
import type {
  FriendCategory,
  FriendEvent,
  Pig,
  SightingEvent,
} from '../../services/pigs.types';
import {
  createFriendEvent,
  deleteFriendEvent,
  getFriendEvents,
} from '../../services/pig-friends.service';
import {
  deleteSightingEvent,
  getSightingEvents,
} from '../../services/pig-sightings.service';
import {
  computeProximityEvents,
  computeProximityPoints,
} from '../../services/friendship-proximity';
import { createPigSighting, getAllPigs } from '../../services/pigs.service';
import {
  FRIEND_CATEGORIES,
  friendCategoryLabel,
} from '../../constants/friend-categories';
import './FriendsPage.css';

// Friendship strength only reflects the last 2 months — relationships change.
const FRIENDSHIP_MONTHS = 2;
const parseTs = (ts: string | null) => Date.parse((ts ?? '').replace(' ', 'T'));

// Relationship strength: 1 point per shared event. Tiers are just a friendly
// label over the raw points total. Ordered strongest first.
const TIERS = [
  { key: 'inseparable', icon: '💞', label: 'Inseparable', min: 10 },
  { key: 'close', icon: '💖', label: 'Close Friends', min: 6 },
  { key: 'friends', icon: '💕', label: 'Friends', min: 3 },
  { key: 'acquaintances', icon: '🌱', label: 'Acquaintances', min: 0 },
] as const;

type TierKey = (typeof TIERS)[number]['key'];

const tierFor = (points: number) =>
  TIERS.find((t) => points >= t.min) ?? TIERS[TIERS.length - 1];

type FriendPair = {
  key: string;
  pigA: Pig;
  pigB: Pig;
  points: number;
};

// A bonding event from any source: a logged friend event, a map sighting of
// 2+ pigs together, or a derived proximity moment (pigs sighted near each
// other). Proximity events aren't stored, so they can't be deleted.
type BondEvent = {
  uid: string;
  rawId: number;
  source: 'logged' | 'map' | 'proximity';
  category: FriendCategory | null;
  pigIds: number[];
  ts: string;
};

const FriendsPage = () => {
  const [friendEvents, setFriendEvents] = useState<FriendEvent[]>([]);
  const [sightingEvents, setSightingEvents] = useState<SightingEvent[]>([]);
  const [allPigs, setAllPigs] = useState<Pig[]>([]);
  const [selectedPigs, setSelectedPigs] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState<FriendCategory>('snacking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<BondEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedPig, setSelectedPig] = useState<Pig | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'observations'>(
    'friends'
  );

  const pigById = useMemo(
    () => new Map(allPigs.map((p) => [Number(p.id), p])),
    [allPigs]
  );

  const sortedPigs = useMemo(
    () => [...allPigs].sort((a, b) => a.name.localeCompare(b.name)),
    [allPigs]
  );

  // Only count events from the last 2 months.
  const cutoff = useMemo(
    () => subMonths(new Date(), FRIENDSHIP_MONTHS).getTime(),
    []
  );

  // Logged friend events + map sightings of 2+ pigs (last 2 months), newest
  // first.
  const bondEvents = useMemo<BondEvent[]>(() => {
    const logged: BondEvent[] = friendEvents
      .filter((e) => parseTs(e.observed_at ?? e.created_at) >= cutoff)
      .map((e) => ({
        uid: `f-${e.id}`,
        rawId: e.id,
        source: 'logged',
        category: e.category,
        pigIds: e.pig_ids,
        ts: e.observed_at ?? e.created_at ?? '',
      }));
    const fromMap: BondEvent[] = sightingEvents
      .filter(
        (s) =>
          s.pig_ids.length >= 2 &&
          parseTs(s.observed_at ?? s.created_at) >= cutoff
      )
      .map((s) => ({
        uid: `s-${s.id}`,
        rawId: s.id,
        source: 'map',
        category: (s.behaviour as FriendCategory | null) ?? null,
        pigIds: s.pig_ids,
        ts: s.observed_at ?? s.created_at ?? '',
      }));
    return [...logged, ...fromMap].sort((a, b) => b.ts.localeCompare(a.ts));
  }, [friendEvents, sightingEvents, cutoff]);

  // Sightings within the scoring window, shared by proximity calculations.
  const recentSightings = useMemo(
    () =>
      sightingEvents.filter(
        (s) => parseTs(s.observed_at ?? s.created_at) >= cutoff
      ),
    [sightingEvents, cutoff]
  );

  // Proximity points (pigs sighted near each other) from the last 2 months.
  const proximityPoints = useMemo(
    () => computeProximityPoints(recentSightings),
    [recentSightings]
  );

  // Proximity moments as displayable events for the history list.
  const proximityEvents = useMemo<BondEvent[]>(
    () =>
      computeProximityEvents(recentSightings).map((ev) => ({
        uid: `p-${ev.pigIds[0]}-${ev.pigIds[1]}-${ev.t}`,
        rawId: 0,
        source: 'proximity',
        category: null,
        pigIds: ev.pigIds,
        ts: new Date(ev.t).toISOString(),
      })),
    [recentSightings]
  );

  // All events shown in the history, newest first.
  const historyEvents = useMemo(
    () =>
      [...bondEvents, ...proximityEvents].sort(
        (a, b) => parseTs(b.ts) - parseTs(a.ts)
      ),
    [bondEvents, proximityEvents]
  );

  // Rank pairs by total points: +1 for each explicit event they shared, plus
  // their proximity points (0.5 each).
  const friendPairs = useMemo(() => {
    const points = new Map<string, number>();
    const add = (key: string, n: number) =>
      points.set(key, (points.get(key) ?? 0) + n);

    for (const ev of bondEvents) {
      const ids = ev.pigIds.filter((id) => pigById.has(id));
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          add(
            ids[i] < ids[j] ? `${ids[i]}-${ids[j]}` : `${ids[j]}-${ids[i]}`,
            1
          );
        }
      }
    }
    for (const [key, pts] of proximityPoints) add(key, pts);

    const pairs: FriendPair[] = [];
    for (const [key, pts] of points) {
      const [lo, hi] = key.split('-').map(Number);
      const pigA = pigById.get(lo);
      const pigB = pigById.get(hi);
      if (pigA && pigB) pairs.push({ key, pigA, pigB, points: pts });
    }
    return pairs.sort((a, b) => b.points - a.points);
  }, [bondEvents, proximityPoints, pigById]);

  // For each pig, how many friends fall into each strength tier.
  const statsByPig = useMemo(() => {
    const stats = new Map<number, Record<TierKey, number>>();
    const ensure = (id: number) => {
      let s = stats.get(id);
      if (!s) {
        s = { inseparable: 0, close: 0, friends: 0, acquaintances: 0 };
        stats.set(id, s);
      }
      return s;
    };
    for (const pair of friendPairs) {
      const tier = tierFor(pair.points);
      ensure(Number(pair.pigA.id))[tier.key]++;
      ensure(Number(pair.pigB.id))[tier.key]++;
    }
    return stats;
  }, [friendPairs]);

  // Order pigs by relationship strength: most friends in the strongest tier
  // first, falling back to the next tier down, then alphabetically.
  const pigsByStrength = useMemo(() => {
    const countsFor = (pig: Pig) =>
      statsByPig.get(Number(pig.id)) ?? {
        inseparable: 0,
        close: 0,
        friends: 0,
        acquaintances: 0,
      };
    return [...sortedPigs].sort((a, b) => {
      const ca = countsFor(a);
      const cb = countsFor(b);
      for (const t of TIERS) {
        if (cb[t.key] !== ca[t.key]) return cb[t.key] - ca[t.key];
      }
      return a.name.localeCompare(b.name);
    });
  }, [sortedPigs, statsByPig]);

  // Friends of the pig whose modal is open, strongest first, for the bar chart.
  const selectedPigRels = useMemo(() => {
    if (!selectedPig) return [];
    return friendPairs
      .filter(
        (p) =>
          Number(p.pigA.id) === Number(selectedPig.id) ||
          Number(p.pigB.id) === Number(selectedPig.id)
      )
      .map((p) => {
        const partner =
          Number(p.pigA.id) === Number(selectedPig.id) ? p.pigB : p.pigA;
        return { partner, points: p.points, tier: tierFor(p.points) };
      });
  }, [selectedPig, friendPairs]);

  const load = async () => {
    try {
      setLoading(true);
      const [friendData, sightingData, pigsData] = await Promise.all([
        getFriendEvents(),
        getSightingEvents(),
        getAllPigs(),
      ]);
      setFriendEvents(friendData);
      setSightingEvents(sightingData);
      setAllPigs(pigsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePig = (id: number) => {
    setSelectedPigs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedPigs.size < 2) return;
    try {
      setSubmitting(true);
      setFormError(null);
      const ids = [...selectedPigs];
      await createFriendEvent(category, ids);
      // Logging an event also counts as sighting those pigs.
      await Promise.all(ids.map((id) => createPigSighting(Number(id))));
      setSelectedPigs(new Set());
      setFriendEvents(await getFriendEvents());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleting(true);
      if (deletingItem.source === 'logged') {
        await deleteFriendEvent(deletingItem.rawId);
        setFriendEvents((prev) =>
          prev.filter((e) => e.id !== deletingItem.rawId)
        );
      } else {
        await deleteSightingEvent(deletingItem.rawId);
        setSightingEvents((prev) =>
          prev.filter((e) => e.id !== deletingItem.rawId)
        );
      }
      setDeletingItem(null);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <p>{error}</p>;
  if (loading) return <Loading />;

  return (
    <div className="friendsPage">
      <Panel heading="Friends 💕" theme="pink">
        <div className="tabs">
          <button
            className={activeTab === 'friends' ? 'active' : ''}
            onClick={() => setActiveTab('friends')}
          >
            Best Friends 💕
          </button>
          <button
            className={activeTab === 'observations' ? 'active' : ''}
            onClick={() => setActiveTab('observations')}
          >
            Events 👀
          </button>
        </div>

        {activeTab === 'friends' && (
          <div className="friendsStatsGrid">
            {pigsByStrength.map((pig) => {
              const stats = statsByPig.get(Number(pig.id));
              const total = stats
                ? TIERS.reduce((sum, t) => sum + stats[t.key], 0)
                : 0;
              return (
                <div
                  className="friendStatCard"
                  key={pig.id}
                  role="button"
                  tabIndex={0}
                  // Capture the click before PigCard's <Link> so we open the
                  // relationships modal instead of navigating to the pig page.
                  onClickCapture={(e) => {
                    e.preventDefault();
                    setSelectedPig(pig);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPig(pig);
                    }
                  }}
                >
                  <div className="friendStatPig">
                    <PigCard pig={pig} hideLastSeen />
                  </div>
                  {total === 0 ? (
                    <p className="friendStatEmpty">No friends yet 🌱</p>
                  ) : (
                    <ul className="friendStatList">
                      {TIERS.filter((t) => stats && stats[t.key] > 0).map(
                        (t) => (
                          <li className="friendStatRow" key={t.key}>
                            <span className="friendStatLabel">
                              {t.icon} {t.label}
                            </span>
                            <span className="friendStatCount">
                              {stats![t.key]}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'observations' && (
          <>
            <div id="newFriendForm">
              <p>What were they doing?</p>
              <div className="friendCategories">
                {FRIEND_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`friendCategory${category === c.value ? ' active' : ''}`}
                    onClick={() => setCategory(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <p>Who was involved?</p>
              <div className="pigChips">
                {sortedPigs.map((pig) => (
                  <button
                    key={pig.id}
                    type="button"
                    className={`pigChip${selectedPigs.has(pig.id) ? ' selected' : ''}`}
                    onClick={() => togglePig(pig.id)}
                  >
                    <PigThumb imagePath={pig.image_paths?.[0] ?? null} />
                    <span>{pig.name}</span>
                  </button>
                ))}
              </div>
              {formError && <p className="formError">{formError}</p>}
              <Button
                onClick={handleAdd}
                disabled={submitting || selectedPigs.size < 2}
              >
                {submitting
                  ? 'Saving...'
                  : `Add${selectedPigs.size ? ` (${selectedPigs.size})` : ''}`}
              </Button>
            </div>
            <div className="friendObsList">
              {historyEvents.map((ev) => (
                <div className="friendEvent" key={ev.uid}>
                  {ev.source !== 'proximity' && (
                    <button
                      className="friendObsDelete"
                      onClick={() => setDeletingItem(ev)}
                      aria-label="Delete"
                    >
                      🗑️
                    </button>
                  )}
                  <div className="friendEventCategory">
                    {ev.source === 'proximity' ? (
                      '👀 Spotted nearby'
                    ) : (
                      <>
                        {ev.source === 'map' ? '📍 ' : ''}
                        {ev.category
                          ? friendCategoryLabel(ev.category)
                          : 'Spotted together'}
                      </>
                    )}
                  </div>
                  <div className="friendEventPigs">
                    {ev.pigIds
                      .map((id) => pigById.get(id))
                      .filter((p): p is Pig => !!p)
                      .map((pig) => (
                        <div className="friendEventPig" key={pig.id}>
                          <PigThumb imagePath={pig.image_paths?.[0] ?? null} />
                          <span>{pig.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>

      <Modal
        isOpen={!!selectedPig}
        onClose={() => setSelectedPig(null)}
        variant="large"
        showClose
      >
        {selectedPig &&
          (() => {
            // Bar widths are scaled against the strongest relationship.
            const maxPoints = selectedPigRels.reduce(
              (m, r) => Math.max(m, r.points),
              0
            );
            return (
              <>
                <h3 className="friendRelHeading">
                  <PigThumb imagePath={selectedPig.image_paths?.[0] ?? null} />
                  {selectedPig.name}'s Friends
                </h3>
                {selectedPigRels.length === 0 ? (
                  <p className="friendStatEmpty">No friends yet 🌱</p>
                ) : (
                  <div className="friendBars">
                    {selectedPigRels.map((r) => (
                      <Link
                        key={r.partner.id}
                        to={`/pigs/${r.partner.id}`}
                        className="friendBarRow"
                        title={r.tier.label}
                      >
                        <span className="friendBarLabel">
                          <PigThumb
                            imagePath={r.partner.image_paths?.[0] ?? null}
                          />
                          <span className="friendBarName">{r.partner.name}</span>
                        </span>
                        <span className="friendBarTrack">
                          <span
                            className="friendBarFill"
                            style={{
                              width: `${maxPoints ? (r.points / maxPoints) * 100 : 0}%`,
                            }}
                          />
                          <span className="friendBarValue">
                            {r.tier.icon} {r.points}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
      </Modal>

      <Modal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)}>
        {deletingItem && (
          <>
            <p>
              Remove this{' '}
              {deletingItem.category
                ? friendCategoryLabel(deletingItem.category)
                : 'sighting'}{' '}
              event ({deletingItem.pigIds.length} pigs)?
            </p>
            <div className="confirmActions">
              <Button onClick={() => setDeletingItem(null)}>Cancel</Button>
              <Button onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default FriendsPage;
