import { useEffect, useMemo, useState } from 'react';
import PigCard from '../../components/PigList/PigCard/PigCard';
import Loading from '../../components/ui/Loading/Loading';
import type { Pig, SocialOrderItem } from '../../services/pigs.types';
import {
  createSocialOrderItem,
  getSocialOrder,
} from '../../services/pig-social-order.service';
import { getAllPigs } from '../../services/pigs.service';
import './SocialOrderPage.css';
import PigPicker from '../../components/PigPicker/PigPicker';
import Button from '../../components/ui/Button/Button';

const SocialOrderPage = () => {
  const [socialOrder, setSocialOrder] = useState<SocialOrderItem[]>([]);
  const [allPigs, setAllPigs] = useState<Pig[]>([]);
  const [dominantPigId, setDominantPigId] = useState<number | ''>('');
  const [submissivePigId, setSubmissivePigId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dominantPigs = useMemo(
    () => allPigs.filter((p) => p.id !== submissivePigId),
    [allPigs, submissivePigId]
  );

  const submissivePigs = useMemo(
    () => allPigs.filter((p) => p.id !== dominantPigId),
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

  const handleAddNewSocialOrder = async () => {
    if (!submissivePigId || !dominantPigId) return;
    try {
      setSubmitting(true);
      await createSocialOrderItem(submissivePigId, dominantPigId);
    } catch (err) {
      console.error('Failed to add social order item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadSocialOrder();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="socialOrderPage">
      <h2>Social Order</h2>
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
            <div className="socialOrderPig">
              <span className="socialOrderCrown">👑</span>
              <PigCard pig={relationship.dominant_pig} hideLastSeen />
            </div>
            <span className="socialOrderArrow">▸</span>
            <div className="socialOrderPig">
              <PigCard pig={relationship.submissive_pig} hideLastSeen />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialOrderPage;
