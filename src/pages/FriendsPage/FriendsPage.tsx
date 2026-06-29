import { useEffect, useMemo, useState } from 'react';
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
import { computeProximityPoints } from '../../services/friendship-proximity';
import { createPigSighting, getAllPigs } from '../../services/pigs.service';
import './FriendsPage.css';

const CATEGORIES: { value: FriendCategory; label: string }[] = [
  { value: 'snacking', label: '🍴 Snacking' },
  { value: 'grooming', label: '🧼 Grooming' },
  { value: 'following', label: '🐾 Following' },
  { value: 'sharing_house', label: '🏠 Sharing a house' },
  { value: 'booping_noses', label: '👃 Booping noses' },
  { value: 'resting_together', label: '😴 Resting together' },
];

const categoryLabel = (value: FriendCategory) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

// Friendship strength only reflects the last 2 months — relationships change.
const FRIENDSHIP_MONTHS = 2;
const parseTs = (ts: string | null) =>
  Date.parse((ts ?? '').replace(' ', 'T'));

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

// A bonding event from either source: a logged friend event or a map sighting
// of 2+ pigs together.
type BondEvent = {
  uid: string;
  rawId: number;
  source: 'logged' | 'map';
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

  // Proximity points (pigs sighted near each other) from the last 2 months.
  const proximityPoints = useMemo(
    () =>
      computeProximityPoints(
        sightingEvents.filter(
          (s) => parseTs(s.observed_at ?? s.created_at) >= cutoff
        )
      ),
    [sightingEvents, cutoff]
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
          add(ids[i] < ids[j] ? `${ids[i]}-${ids[j]}` : `${ids[j]}-${ids[i]}`, 1);
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
      setFormError(
        err instanceof Error ? err.message : 'Failed to add event'
      );
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
            {sortedPigs.map((pig) => {
              const stats = statsByPig.get(Number(pig.id));
              const total = stats
                ? TIERS.reduce((sum, t) => sum + stats[t.key], 0)
                : 0;
              return (
                <div className="friendStatCard" key={pig.id}>
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
                {CATEGORIES.map((c) => (
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
              {bondEvents.map((ev) => (
                <div className="friendEvent" key={ev.uid}>
                  <button
                    className="friendObsDelete"
                    onClick={() => setDeletingItem(ev)}
                    aria-label="Delete"
                  >
                    🗑️
                  </button>
                  <div className="friendEventCategory">
                    {ev.source === 'map' ? '📍 ' : ''}
                    {ev.category ? categoryLabel(ev.category) : 'Spotted together'}
                  </div>
                  <div className="friendEventPigs">
                    {ev.pigIds
                      .map((id) => pigById.get(id))
                      .filter((p): p is Pig => !!p)
                      .map((pig) => (
                        <div className="friendEventPig" key={pig.id}>
                          <PigThumb
                            imagePath={pig.image_paths?.[0] ?? null}
                          />
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

      <Modal isOpen={!!deletingItem} onClose={() => setDeletingItem(null)}>
        {deletingItem && (
          <>
            <p>
              Remove this{' '}
              {deletingItem.category
                ? categoryLabel(deletingItem.category)
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
