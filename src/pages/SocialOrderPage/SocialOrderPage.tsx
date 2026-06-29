import { useEffect, useMemo, useState } from 'react';
import PigCard from '../../components/PigList/PigCard/PigCard';
import Loading from '../../components/ui/Loading/Loading';
import type { Pig, SocialOrderItem } from '../../services/pigs.types';
import {
  createSocialOrderItem,
  deleteSocialOrderItem,
  getSocialOrder,
} from '../../services/pig-social-order.service';
import { createPigSighting, getAllPigs } from '../../services/pigs.service';
import {
  computePeckingOrder,
  type PeckingEntry,
} from '../../services/social-order-ranking';
import './SocialOrderPage.css';
import PigPicker from '../../components/PigPicker/PigPicker';
import Button from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import Panel from '../../components/ui/Panel/Panel';
import SocialGraph from './SocialGraph';

const SocialOrderPage = () => {
  const [socialOrder, setSocialOrder] = useState<SocialOrderItem[]>([]);
  const [allPigs, setAllPigs] = useState<Pig[]>([]);
  const [dominantPigId, setDominantPigId] = useState<number | ''>('');
  const [submissivePigId, setSubmissivePigId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<SocialOrderItem | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'ranking' | 'graph' | 'observations'
  >('ranking');

  const { ranked, unranked } = useMemo(
    () => computePeckingOrder(allPigs, socialOrder),
    [allPigs, socialOrder]
  );

  // Group consecutive entries that share a rank so ties render side by side.
  const rankGroups = useMemo(() => {
    const groups: PeckingEntry[][] = [];
    for (const entry of ranked) {
      const last = groups[groups.length - 1];
      if (last && last[0].rank === entry.rank) last.push(entry);
      else groups.push([entry]);
    }
    return groups;
  }, [ranked]);

  const dominantPigs = useMemo(
    () =>
      allPigs
        .filter((p) => p.id !== submissivePigId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allPigs, submissivePigId]
  );

  const submissivePigs = useMemo(
    () =>
      allPigs
        .filter((p) => p.id !== dominantPigId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allPigs, dominantPigId]
  );

  const loadSocialOrder = async () => {
    try {
      setLoading(true);
      const [socialOrderData, pigsData] = await Promise.all([
        getSocialOrder(),
        getAllPigs(),
      ]);
      setSocialOrder(socialOrderData);
      setAllPigs(pigsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      setDeleting(true);
      await deleteSocialOrderItem(deletingItem.id);
      setSocialOrder((prev) =>
        prev.filter((item) => item.id !== deletingItem.id)
      );
      setDeletingItem(null);
    } catch {
      const updatedOrder = await getSocialOrder();
      setSocialOrder(updatedOrder);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddNewSocialOrder = async () => {
    if (!submissivePigId || !dominantPigId) return;
    try {
      setSubmitting(true);
      setFormError(null);
      await createSocialOrderItem(dominantPigId, submissivePigId);
      // Recording an observation also counts as sighting both pigs.
      await Promise.all(
        [dominantPigId, submissivePigId].map((id) =>
          createPigSighting(Number(id))
        )
      );
      setDominantPigId('');
      setSubmissivePigId('');
      const updatedOrder = await getSocialOrder();
      setSocialOrder(updatedOrder);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to add social order item'
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadSocialOrder();
  }, []);

  if (error) return <p>{error}</p>;
  if (loading) return <Loading />;

  return (
    <div className="socialOrderPage">
      <Panel heading="Social Order 👑" theme="purple">
      <div className="tabs">
        <button
          className={activeTab === 'ranking' ? 'active' : ''}
          onClick={() => setActiveTab('ranking')}
        >
          Pecking Order 👑
        </button>
        <button
          className={activeTab === 'graph' ? 'active' : ''}
          onClick={() => setActiveTab('graph')}
        >
          Graph 🕸️
        </button>
        <button
          className={activeTab === 'observations' ? 'active' : ''}
          onClick={() => setActiveTab('observations')}
        >
          Observations 👀
        </button>
      </div>

      {activeTab === 'ranking' && (
        <div className="peckingOrder">
          {ranked.length === 0 ? (
            <p className="muted peckingEmpty">
              No dominance observations yet. Add some in the Observations tab.
            </p>
          ) : (
            <ol className="peckingList">
              {rankGroups.map((group) => (
                <li
                  className={`peckingRow${group[0].rank === 1 ? ' peckingTop' : ''}${group.length > 1 ? ' peckingTie' : ''}${group.length > 4 ? ' peckingCrowded' : ''}`}
                  key={group[0].rank}
                >
                  <span className="peckingRank">
                    {group[0].rank === 1 ? '👑' : group[0].rank}
                  </span>
                  <div className="peckingMembers">
                    {group.map((entry) => (
                      <div className="peckingMember" key={entry.pig.id}>
                        <div className="peckingPigCard">
                          <PigCard pig={entry.pig} hideLastSeen />
                        </div>
                        <span className="peckingRecord">
                          <span className="peckingWins">▲ {entry.dominates}</span>
                          <span className="peckingLosses">
                            ▼ {entry.yieldsTo}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {unranked.length > 0 && (
            <div className="peckingUnranked">
              <p className="muted peckingUnrankedHeading">Not ranked yet</p>
              <div className="peckingUnrankedList">
                {unranked.map((pig) => (
                  <div className="peckingPigCard" key={pig.id}>
                    <PigCard pig={pig} hideLastSeen />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'graph' && (
        <SocialGraph pigs={allPigs} socialOrder={socialOrder} />
      )}

      {activeTab === 'observations' && (
        <>
          <div id="newSocialOrderForm">
            <p>Dominant</p>
            <PigPicker
              pigs={dominantPigs}
              selectedPigId={dominantPigId}
              onSelect={setDominantPigId}
              theme="purple"
            />
            <p>Submissive</p>
            <PigPicker
              pigs={submissivePigs}
              selectedPigId={submissivePigId}
              onSelect={setSubmissivePigId}
              theme="purple"
            />
            {formError && <p className="formError">{formError}</p>}
            <Button
              onClick={() => handleAddNewSocialOrder()}
              disabled={submitting || !submissivePigId || !dominantPigId}
            >
              {submitting ? 'Saving...' : 'Add'}
            </Button>
          </div>
          <div className="socialOrderList">
            {socialOrder.map((relationship) => (
              <div className="socialOrderItem" key={relationship.id}>
                <button
                  className="socialOrderDelete"
                  onClick={() => setDeletingItem(relationship)}
                  aria-label="Delete"
                >
                  🗑️
                </button>
                <div className="socialOrderPig dominant">
                  <span className="socialOrderCrown">👑</span>
                  <PigCard pig={relationship.dominant_pig} hideLastSeen />
                </div>
                <span className="socialOrderArrow">▸</span>
                <div className="socialOrderPig submissive">
                  <PigCard pig={relationship.submissive_pig} hideLastSeen />
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
              Remove {deletingItem.dominant_pig.name} →{' '}
              {deletingItem.submissive_pig.name}?
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

export default SocialOrderPage;
