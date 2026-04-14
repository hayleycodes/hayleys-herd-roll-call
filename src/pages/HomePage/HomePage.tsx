import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import './HomePage.css';
import PigList from '../../components/PigList/PigList';
import { getAllPigs, getPassedPigs } from '../../services/pigs.service';
import { getOutstandingTaskCount } from '../../services/tasks.service';
import { getAllPigTags } from '../../services/pig-tags.service';
import type { Pig } from '../../services/pigs.types';
import Loading from '../../components/ui/Loading/Loading';

const HomePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [passedPigs, setPassedPigs] = useState<Pig[]>([]);
  const [sickPigIds, setSickPigIds] = useState<Set<number>>(new Set());
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadPigs = async () => {
    try {
      setLoading(true);
      const [allPigs, passed, tasks, allTags] = await Promise.all([
        getAllPigs(),
        getPassedPigs(),
        getOutstandingTaskCount(),
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
      setTaskCount(tasks);
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
  const unseenCount = pigs.filter(
    (p) => !p.last_sighted || new Date(p.last_sighted).toDateString() !== today
  ).length;

  return (
    <div>
      {unseenCount > 0 && (
        <div className="unseenBanner">
          👀 {unseenCount} pig{unseenCount === 1 ? '' : 's'} not sighted today
        </div>
      )}
      {sickPigIds.size > 0 && (
        <div className="sickBanner">
          🤒 {sickPigIds.size} sick pig{sickPigIds.size === 1 ? '' : 's'}
        </div>
      )}
      {taskCount > 0 && (
        <Link to="/tasks" className="tasksBanner">
          📝 {taskCount} task{taskCount === 1 ? '' : 's'} to do
        </Link>
      )}
      <PigList pigs={pigs} passedPigs={passedPigs} setPigs={setPigs} sickPigIds={sickPigIds} />
    </div>
  );
};

export default HomePage;
