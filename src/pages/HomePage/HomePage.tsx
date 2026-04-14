import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import './HomePage.css';
import PigList from '../../components/PigList/PigList';
import { getAllPigs, getPassedPigs } from '../../services/pigs.service';
import { getOutstandingTaskCount } from '../../services/tasks.service';
import type { Pig } from '../../services/pigs.types';
import Loading from '../../components/ui/Loading/Loading';

const HomePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [passedPigs, setPassedPigs] = useState<Pig[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadPigs = async () => {
    try {
      setLoading(true);
      const [allPigs, passed, tasks] = await Promise.all([
        getAllPigs(),
        getPassedPigs(),
        getOutstandingTaskCount(),
      ]);
      setPigs(allPigs);
      setPassedPigs(passed);
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
      {taskCount > 0 && (
        <Link to="/tasks" className="tasksBanner">
          📝 {taskCount} task{taskCount === 1 ? '' : 's'} to do
        </Link>
      )}
      <PigList pigs={pigs} passedPigs={passedPigs} setPigs={setPigs} />
    </div>
  );
};

export default HomePage;
