import { useEffect, useMemo, useState } from 'react';
import PigCard from '../../components/PigList/PigCard/PigCard';
import Loading from '../../components/ui/Loading/Loading';
import Button from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import Panel from '../../components/ui/Panel/Panel';
import { PigThumb } from '../../components/PigPicker/PigPicker';
import type { FriendCategory, FriendEvent, Pig } from '../../services/pigs.types';
import {
  createFriendEvent,
  deleteFriendEvent,
  getFriendEvents,
} from '../../services/pig-friends.service';
import { getAllPigs } from '../../services/pigs.service';
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

// Relationship strength: 1 point per shared event. Tiers are just a friendly
// label over the raw points total.
const strengthTier = (points: number) => {
  if (points >= 10) return { icon: '💞', label: 'Inseparable' };
  if (points >= 6) return { icon: '💖', label: 'Close Friends' };
  if (points >= 3) return { icon: '💕', label: 'Friends' };
  return { icon: '🌱', label: 'Acquaintances' };
};

type FriendPair = {
  key: string;
  pigA: Pig;
  pigB: Pig;
  points: number;
};

const FriendsPage = () => {
  const [events, setEvents] = useState<FriendEvent[]>([]);
  const [allPigs, setAllPigs] = useState<Pig[]>([]);
  const [selectedPigs, setSelectedPigs] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState<FriendCategory>('snacking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<FriendEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'observations'>(
    'friends'
  );

  const pigById = useMemo(
    () => new Map(allPigs.map((p) => [p.id, p])),
    [allPigs]
  );

  const sortedPigs = useMemo(
    () => [...allPigs].sort((a, b) => a.name.localeCompare(b.name)),
    [allPigs]
  );

  // Rank pig pairs by how many events they've shared. Each event adds a point
  // to every pair of pigs that attended it.
  const friendPairs = useMemo(() => {
    const pairs = new Map<string, FriendPair>();
    for (const ev of events) {
      const ids = ev.pig_ids.filter((id) => pigById.has(id));
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [lo, hi] =
            ids[i] < ids[j] ? [ids[i], ids[j]] : [ids[j], ids[i]];
          const key = `${lo}-${hi}`;
          const existing = pairs.get(key);
          if (existing) existing.points += 1;
          else
            pairs.set(key, {
              key,
              pigA: pigById.get(lo)!,
              pigB: pigById.get(hi)!,
              points: 1,
            });
        }
      }
    }
    return [...pairs.values()].sort((a, b) => b.points - a.points);
  }, [events, pigById]);

  const load = async () => {
    try {
      setLoading(true);
      const [eventData, pigsData] = await Promise.all([
        getFriendEvents(),
        getAllPigs(),
      ]);
      setEvents(eventData);
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
      await createFriendEvent(category, [...selectedPigs]);
      setSelectedPigs(new Set());
      setEvents(await getFriendEvents());
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
      await deleteFriendEvent(deletingItem.id);
      setEvents((prev) => prev.filter((item) => item.id !== deletingItem.id));
      setDeletingItem(null);
    } catch {
      setEvents(await getFriendEvents());
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
          <div className="friendsRanking">
            {friendPairs.length === 0 ? (
              <p className="muted friendsEmpty">
                No friendship events yet. Add some in the Events tab.
              </p>
            ) : (
              <ol className="friendsList">
                {friendPairs.map((pair, i) => {
                  const tier = strengthTier(pair.points);
                  return (
                    <li
                      className={`friendsRow${i === 0 ? ' friendsTop' : ''}`}
                      key={pair.key}
                    >
                      <span className="friendsRank">{i + 1}</span>
                      <div className="friendsPigCard">
                        <PigCard pig={pair.pigA} hideLastSeen />
                      </div>
                      <span className="friendsHeart">💕</span>
                      <div className="friendsPigCard">
                        <PigCard pig={pair.pigB} hideLastSeen />
                      </div>
                      <span className="friendsStrength">
                        <span className="friendsStrengthPoints">
                          {tier.icon} {pair.points}
                        </span>
                        <span className="friendsStrengthLabel">
                          {tier.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
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
              {events.map((ev) => (
                <div className="friendEvent" key={ev.id}>
                  <button
                    className="friendObsDelete"
                    onClick={() => setDeletingItem(ev)}
                    aria-label="Delete"
                  >
                    🗑️
                  </button>
                  <div className="friendEventCategory">
                    {categoryLabel(ev.category)}
                  </div>
                  <div className="friendEventPigs">
                    {ev.pig_ids
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
              Remove this {categoryLabel(deletingItem.category)} event (
              {deletingItem.pig_ids.length} pigs)?
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
