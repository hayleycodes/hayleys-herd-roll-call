import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import './HealthLogPage.css';
import '../../components/HealthPanel/HealthPanel.css';
import { getAllHealth } from '../../services/pig-health.service';
import type { HealthLogEntry } from '../../services/pig-health.service';
import { getAllPigs } from '../../services/pigs.service';
import type { Pig } from '../../services/pigs.types';
import { getPigImageUrl } from '../../services/pig-images.service';
import Loading from '../../components/ui/Loading/Loading';
import Panel from '../../components/ui/Panel/Panel';
import HealthForm from '../../components/HealthForm/HealthForm';

const PAGE_SIZE = 10;

const PigThumbnail = ({ imagePath }: { imagePath: string | null }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePath) return;
    getPigImageUrl(imagePath).then(({ signedUrl }) => setUrl(signedUrl));
  }, [imagePath]);

  if (!url)
    return <div className="healthLogThumb healthLogThumbPlaceholder">🐹</div>;
  return (
    <div
      className="healthLogThumb"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
};

const HealthLogPage = () => {
  const [records, setRecords] = useState<HealthLogEntry[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadRecords = useCallback(async (offset: number) => {
    const data = await getAllHealth(offset, PAGE_SIZE);
    if (data.length < PAGE_SIZE) setHasMore(false);
    return data;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthData, pigData] = await Promise.all([
          loadRecords(0),
          getAllPigs(),
        ]);
        setRecords(healthData);
        setPigs(pigData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadRecords]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('.panelContent');
      if (scrollContainer) scrollContainer.scrollTop = 0;
    }
  }, [loading]);

  const handleRecordAdded = async () => {
    const data = await getAllHealth(0, records.length + 1);
    setRecords(data);
  };

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          loadRecords(records.length)
            .then((data) => {
              setRecords((prev) => [...prev, ...data]);
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoadingMore(false));
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, records.length, loadRecords]);

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className="healthLogPage" ref={scrollRef}>
      <Panel heading="Health Log 🏥" theme="green">
        <HealthForm pigs={pigs} onRecordAdded={handleRecordAdded} />

        {records.length === 0 ? (
          <p className="muted">No health records yet</p>
        ) : (
          <div className="healthLogList">
            {records.map((record) => (
              <Link
                key={record.id}
                to={`/pigs/${record.pig_id}`}
                className="healthLogCard"
              >
                <PigThumbnail imagePath={record.pigs?.image_path ?? null} />

                <div className="healthLogCardBody">
                  <div>
                    <span className="healthLogPigName">
                      {record.pigs?.name ?? 'Unknown pig'}
                    </span>
                    <span className="muted healthLogDate">
                      Recorded:{' '}
                      {formatDistanceToNow(new Date(record.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {record.notes && <p>{record.notes}</p>}
                  <div className="healthLogIcons">
                    {record.nail_clip && (
                      <span className="healthBadge">💅 Nail clip</span>
                    )}
                    {record.haircut && (
                      <span className="healthBadge">✂️ Haircut</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasMore && (
          <div ref={sentinelRef} className="healthLogSentinel">
            {loadingMore && <Loading />}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default HealthLogPage;
