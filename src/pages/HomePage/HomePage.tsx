import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import './HomePage.css';
import PigList from '../../components/PigList/PigList';
import { getAllPigs, getPassedPigs } from '../../services/pigs.service';
import { getAllCareTasks } from '../../services/recurring-tasks.service';
import { getAllPigTags } from '../../services/pig-tags.service';
import type { Pig } from '../../services/pigs.types';
import Loading from '../../components/ui/Loading/Loading';

const HomePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [passedPigs, setPassedPigs] = useState<Pig[]>([]);
  const [sickPigIds, setSickPigIds] = useState<Set<number>>(new Set());
  const [careCount, setCareCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'unseen' | 'sick' | null>(null);
  const loadPigs = async () => {
    try {
      setLoading(true);
      const [allPigs, passed, careData, allTags] = await Promise.all([
        getAllPigs(),
        getPassedPigs(),
        getAllCareTasks(),
        getAllPigTags(),
      ]);

      const sickIds = new Set<number>();
      for (const [pigId, tags] of allTags) {
        if (tags.includes('sick')) sickIds.add(pigId);
      }

      // Sort sick pigs to the top, then by last_sighted
      const sorted = [...allPigs].sort((a, b) => {
        const aSick = sickIds.has(a.id) ? 0 : 1;
        const bSick = sickIds.has(b.id) ? 0 : 1;
        if (aSick !== bSick) return aSick - bSick;
        return new Date(a.last_sighted ?? 0).getTime() - new Date(b.last_sighted ?? 0).getTime();
      });

      setPigs(sorted);
      setPassedPigs(passed);
      setSickPigIds(sickIds);
      setCareCount(careData.overdue.length + careData.oneOffs.length);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPigs();
  }, []);


  if (loading) {
    return <Loading />;
  }
  if (error) return <p>{error}</p>;

  const today = new Date().toDateString();
  const unseenPigs = pigs.filter(
    (p) => !p.last_sighted || new Date(p.last_sighted).toDateString() !== today
  );
  const unseenCount = unseenPigs.length;

  const filteredPigs = filter === 'unseen'
    ? unseenPigs
    : filter === 'sick'
      ? pigs.filter((p) => sickPigIds.has(p.id))
      : pigs;

  return (
    <div>
      {unseenCount > 0 && (
        <button
          className={`unseenBanner${filter === 'unseen' ? ' bannerActive' : ''}`}
          onClick={() => setFilter(filter === 'unseen' ? null : 'unseen')}
        >
          👀 {unseenCount} pig{unseenCount === 1 ? '' : 's'} not sighted today
        </button>
      )}
      {sickPigIds.size > 0 && (
        <button
          className={`sickBanner${filter === 'sick' ? ' bannerActive' : ''}`}
          onClick={() => setFilter(filter === 'sick' ? null : 'sick')}
        >
          🤒 {sickPigIds.size} sick pig{sickPigIds.size === 1 ? '' : 's'}
        </button>
      )}
      {careCount > 0 && (
        <Link to="/health-log" className="tasksBanner">
          🏥 {careCount} care item{careCount === 1 ? '' : 's'} due
        </Link>
      )}
      <PigList pigs={filteredPigs} passedPigs={filter ? [] : passedPigs} setPigs={setPigs} sickPigIds={sickPigIds} />
    </div>
  );
};

export default HomePage;
