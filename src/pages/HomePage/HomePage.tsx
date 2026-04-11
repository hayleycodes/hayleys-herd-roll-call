import { useEffect, useState } from 'react';

import './HomePage.css';
import PigList from '../../components/PigList/PigList';
import { getAllPigs, getPassedPigs } from '../../services/pigs.service';
import { getAllPigTags } from '../../services/pig-tags.service';
import type { Pig } from '../../services/pigs.types';
import Loading from '../../components/ui/Loading/Loading';

const HomePage = () => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [passedPigs, setPassedPigs] = useState<Pig[]>([]);
  const [pigTags, setPigTags] = useState<Map<number, string[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPigs = async () => {
    try {
      setLoading(true);
      const [allPigs, passed, tags] = await Promise.all([
        getAllPigs(),
        getPassedPigs(),
        getAllPigTags(),
      ]);
      setPigs(allPigs);
      setPassedPigs(passed);
      setPigTags(tags);
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
      <PigList
        pigs={pigs}
        passedPigs={passedPigs}
        setPigs={setPigs}
        pigTags={pigTags}
      />{' '}
    </div>
  );
};

export default HomePage;
