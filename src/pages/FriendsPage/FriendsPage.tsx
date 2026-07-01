import { useEffect, useMemo, useState } from 'react';
import PigCard from '../../components/PigList/PigCard/PigCard';
import Loading from '../../components/ui/Loading/Loading';
import Button from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import Panel from '../../components/ui/Panel/Panel';
import FriendBars from '../../components/FriendBars/FriendBars';
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
import { createPigSighting, getAllPigs } from '../../services/pigs.service';
import {
  FRIEND_CATEGORIES,
  friendCategoryLabel,
} from '../../constants/friend-categories';
import {
  computeFriendData,
  relsForPig,
  TIERS,
  type BondEvent,
} from '../../services/friendship';
import './FriendsPage.css';

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

  // Derive ranked pairs, per-pig tier stats and the full event history from
  // the raw friend/sighting data (scoped to the last 2 months).
  const { historyEvents, friendPairs, statsByPig } = useMemo(
    () => computeFriendData(friendEvents, sightingEvents, allPigs),
    [friendEvents, sightingEvents, allPigs]
  );

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
  const selectedPigRels = useMemo(
    () => (selectedPig ? relsForPig(Number(selectedPig.id), friendPairs) : []),
    [selectedPig, friendPairs]
  );

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
        {selectedPig && (
          <>
            <h3 className="friendRelHeading">
              <PigThumb imagePath={selectedPig.image_paths?.[0] ?? null} />
              {selectedPig.name}'s Friends
            </h3>
            <FriendBars
              selfId={Number(selectedPig.id)}
              rels={selectedPigRels}
              historyEvents={historyEvents}
            />
          </>
        )}
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
