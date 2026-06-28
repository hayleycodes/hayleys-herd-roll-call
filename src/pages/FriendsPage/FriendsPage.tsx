import { useEffect, useMemo, useState } from 'react';
import PigCard from '../../components/PigList/PigCard/PigCard';
import Loading from '../../components/ui/Loading/Loading';
import Button from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import Panel from '../../components/ui/Panel/Panel';
import PigPicker from '../../components/PigPicker/PigPicker';
import type {
  FriendCategory,
  FriendObservation,
  Pig,
} from '../../services/pigs.types';
import {
  createFriendObservation,
  deleteFriendObservation,
  getFriendObservations,
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

// Relationship strength: 1 point per bonding event. Tiers are just a friendly
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
  const [observations, setObservations] = useState<FriendObservation[]>([]);
  const [allPigs, setAllPigs] = useState<Pig[]>([]);
  const [pigIdA, setPigIdA] = useState<number | ''>('');
  const [pigIdB, setPigIdB] = useState<number | ''>('');
  const [category, setCategory] = useState<FriendCategory>('snacking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<FriendObservation | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'observations'>(
    'friends'
  );

  // Rank pig pairs by how many friendship observations they share.
  const friendPairs = useMemo(() => {
    const pairs = new Map<string, FriendPair>();
    for (const obs of observations) {
      if (!obs.pig_a || !obs.pig_b) continue;
      const [lo, hi] =
        obs.pig_id_a < obs.pig_id_b
          ? [obs.pig_a, obs.pig_b]
          : [obs.pig_b, obs.pig_a];
      const key = `${lo.id}-${hi.id}`;
      const existing = pairs.get(key);
      if (existing) existing.points += 1;
      else pairs.set(key, { key, pigA: lo, pigB: hi, points: 1 });
    }
    return [...pairs.values()].sort((a, b) => b.points - a.points);
  }, [observations]);

  const pigsForA = useMemo(
    () =>
      allPigs
        .filter((p) => p.id !== pigIdB)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allPigs, pigIdB]
  );

  const pigsForB = useMemo(
    () =>
      allPigs
        .filter((p) => p.id !== pigIdA)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allPigs, pigIdA]
  );

  const load = async () => {
    try {
      setLoading(true);
      const [obsData, pigsData] = await Promise.all([
        getFriendObservations(),
        getAllPigs(),
      ]);
      setObservations(obsData);
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

  const handleAdd = async () => {
    if (!pigIdA || !pigIdB) return;
    try {
      setSubmitting(true);
      setFormError(null);
      await createFriendObservation(pigIdA, pigIdB, category);
      setPigIdA('');
      setPigIdB('');
      setObservations(await getFriendObservations());
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to add observation'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleting(true);
      await deleteFriendObservation(deletingItem.id);
      setObservations((prev) =>
        prev.filter((item) => item.id !== deletingItem.id)
      );
      setDeletingItem(null);
    } catch {
      setObservations(await getFriendObservations());
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
            Observations 👀
          </button>
        </div>

        {activeTab === 'friends' && (
          <div className="friendsRanking">
            {friendPairs.length === 0 ? (
              <p className="muted friendsEmpty">
                No friendship observations yet. Add some in the Observations tab.
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
              <p>Pig</p>
              <PigPicker
                pigs={pigsForA}
                selectedPigId={pigIdA}
                onSelect={setPigIdA}
                theme="purple"
              />
              <p>Friend</p>
              <PigPicker
                pigs={pigsForB}
                selectedPigId={pigIdB}
                onSelect={setPigIdB}
                theme="purple"
              />
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
              {formError && <p className="formError">{formError}</p>}
              <Button
                onClick={handleAdd}
                disabled={submitting || !pigIdA || !pigIdB}
              >
                {submitting ? 'Saving...' : 'Add'}
              </Button>
            </div>
            <div className="friendObsList">
              {observations.map((obs) => (
                <div className="friendObsItem" key={obs.id}>
                  <button
                    className="friendObsDelete"
                    onClick={() => setDeletingItem(obs)}
                    aria-label="Delete"
                  >
                    🗑️
                  </button>
                  <div className="friendObsPig">
                    <PigCard pig={obs.pig_a} hideLastSeen />
                  </div>
                  <span className="friendObsCategory">
                    {categoryLabel(obs.category)}
                  </span>
                  <div className="friendObsPig">
                    <PigCard pig={obs.pig_b} hideLastSeen />
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
              Remove {deletingItem.pig_a.name} &amp; {deletingItem.pig_b.name} (
              {categoryLabel(deletingItem.category)})?
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
