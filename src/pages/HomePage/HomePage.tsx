import { useEffect, useRef, useState } from 'react';

import './HomePage.css';
import PigCam from '../../components/PigCam/PigCam';
import PigList from '../../components/PigList/PigList';
import { getAllPigs, getPassedPigs } from '../../services/pigs.service';
import { getAllCareTasks } from '../../services/recurring-tasks.service';
import { getAllPigTags } from '../../services/pig-tags.service';
import { getTopPigIds } from '../../services/pig-social-order.service';
import type { Pig } from '../../services/pigs.types';
import EmojiButton from '../../components/ui/EmojiButton/EmojiButton';
import Loading from '../../components/ui/Loading/Loading';

type HomePageProps = {
  refreshKey?: number;
};

const HomePage = ({ refreshKey }: HomePageProps) => {
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [passedPigs, setPassedPigs] = useState<Pig[]>([]);
  const [sickPigIds, setSickPigIds] = useState<Set<number>>(new Set());
  const [topPigIds, setTopPigIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'unseen' | 'sick' | null>(null);
  const [search, setSearch] = useState('');
  const [camVisible, setCamVisible] = useState(true);
  const [rotated, setRotated] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const loadPigs = async () => {
    try {
      setLoading(true);
      const [allPigs, passed, , allTags, topIds] = await Promise.all([
        getAllPigs(),
        getPassedPigs(),
        getAllCareTasks(),
        getAllPigTags(),
        getTopPigIds(),
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
        return (
          new Date(a.last_sighted ?? 0).getTime() -
          new Date(b.last_sighted ?? 0).getTime()
        );
      });

      setPigs(sorted);
      setPassedPigs(passed);
      setSickPigIds(sickIds);
      setTopPigIds(topIds);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPigs();
  }, [refreshKey]);

  if (loading) {
    return <Loading />;
  }
  if (error) return <p>{error}</p>;

  const today = new Date().toDateString();
  const unseenPigs = pigs.filter(
    (p) => !p.last_sighted || new Date(p.last_sighted).toDateString() !== today
  );
  const unseenCount = unseenPigs.length;

  const query = search.toLowerCase().trim();

  const filteredPigs = (
    filter === 'unseen'
      ? unseenPigs
      : filter === 'sick'
        ? pigs.filter((p) => sickPigIds.has(p.id))
        : pigs
  ).filter((p) => !query || p.name.toLowerCase().includes(query));

  return (
    <div className={rotated ? 'homePage rotatedMode' : 'homePage'}>
      <PigCam
        visible={rotated || camVisible}
        rotated={rotated}
        onRotateToggle={() => setRotated(!rotated)}
      />
      <div className="homePageRight">
        <div ref={modalContainerRef} className="homePageModalTarget" />
        <div className="homePageRightScroll">
          <div className="homePageFilters">
            {!rotated && (
              <EmojiButton
                className="pigCamToggle"
                onClick={() => setCamVisible(!camVisible)}
                size="sm"
              >
                🎥
              </EmojiButton>
            )}
            {unseenCount > 0 && (
              <button
                className={`homePageFilter filterBtn${filter === 'unseen' ? ' filterBtnActive' : ''}`}
                onClick={() => setFilter(filter === 'unseen' ? null : 'unseen')}
              >
                👀 {unseenCount}
              </button>
            )}
            <div className="homePageFilter pigSearchWrapper">
              <input
                type="text"
                className="pigSearch"
                placeholder="Search pigs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="pigSearchClear"
                  onClick={() => setSearch('')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <PigList
            pigs={filteredPigs}
            passedPigs={filter || query ? [] : passedPigs}
            setPigs={setPigs}
            sickPigIds={sickPigIds}
            topPigIds={topPigIds}
            unseenFilterActive={filter === 'unseen'}
            modalContainer={modalContainerRef}
          />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
