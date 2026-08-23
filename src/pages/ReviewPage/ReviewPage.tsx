import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './ReviewPage.css';
import {
  getPendingCandidates,
  confirmCandidate,
  rejectCandidate,
  type SightingCandidate,
} from '../../services/sighting-candidates.service';
import { getAllPigsIncludingPassed } from '../../services/pigs.service';
import type { Pig } from '../../services/pigs.types';
import { getPigImageUrl } from '../../services/pig-images.service';
import Loading from '../../components/ui/Loading/Loading';
import Panel from '../../components/ui/Panel/Panel';
import Button from '../../components/ui/Button/Button';
import Modal from '../../components/ui/Modal/Modal';
import PigPicker, { PigThumb } from '../../components/PigPicker/PigPicker';

const CropImage = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    let alive = true;
    getPigImageUrl(path).then(({ signedUrl }) => alive && setUrl(signedUrl));
    return () => {
      alive = false;
    };
  }, [path]);

  if (!url) return <div className="reviewCrop reviewCropPlaceholder">🐹</div>;
  return (
    <>
      <button
        type="button"
        className="reviewCrop"
        style={{ backgroundImage: `url(${url})` }}
        aria-label="Enlarge detected pig photo"
        onClick={() => setEnlarged(true)}
      />
      <Modal
        isOpen={enlarged}
        onClose={() => setEnlarged(false)}
        variant="large"
        showClose
      >
        <img className="reviewCropFull" src={url} alt="Detected pig" />
      </Modal>
    </>
  );
};

const ReviewPage = () => {
  const [candidates, setCandidates] = useState<SightingCandidate[]>([]);
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  // Pending (not-yet-saved) pig selection per candidate id.
  const [selection, setSelection] = useState<Record<number, number>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [cands, allPigs] = await Promise.all([
          getPendingCandidates(),
          getAllPigsIncludingPassed(),
        ]);
        setCandidates(cands);
        setPigs(allPigs);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pigsById = useMemo(() => {
    const m = new Map<number, Pig>();
    for (const p of pigs) m.set(p.id, p);
    return m;
  }, [pigs]);

  // Only living pigs are pickable in the fallback selector.
  const livingPigs = useMemo(() => pigs.filter((p) => !p.passed_away), [pigs]);

  const remove = (id: number) =>
    setCandidates((prev) => prev.filter((c) => c.id !== id));

  const select = (candidateId: number, pigId: number) =>
    setSelection((prev) => ({ ...prev, [candidateId]: pigId }));

  const clearSelection = (candidateId: number) =>
    setSelection((prev) => {
      const next = { ...prev };
      delete next[candidateId];
      return next;
    });

  const handleConfirm = async (candidateId: number, pigId: number) => {
    setBusyId(candidateId);
    try {
      await confirmCandidate(candidateId, pigId);
      remove(candidateId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (candidateId: number) => {
    setBusyId(candidateId);
    try {
      await rejectCandidate(candidateId);
      remove(candidateId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className="reviewPage">
      <Panel heading="Who's this? 📷" theme="blue">
        {candidates.length === 0 ? (
          <p className="reviewAllCaughtUp">All caught up! 🎉</p>
        ) : (
          <div className="reviewList">
            {candidates.map((c) => {
              const busy = busyId === c.id;
              const guesses = (c.top_guesses ?? []).filter((g) =>
                pigsById.has(g.pig_id)
              );
              const selectedPigId = selection[c.id];
              const selectedPig =
                selectedPigId != null ? pigsById.get(selectedPigId) : undefined;
              return (
                <div
                  key={c.id}
                  className={`reviewCard ${busy ? 'reviewCardBusy' : ''}`}
                >
                  <CropImage path={c.crop_path} />

                  <div className="reviewCardBody">
                    <div className="reviewMeta">
                      {c.camera && (
                        <span className="reviewBadge">📷 {c.camera}</span>
                      )}
                      {c.created_at && (
                        <span className="reviewMuted">
                          {formatDistanceToNow(new Date(c.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>

                    {guesses.length > 0 ? (
                      <div className="reviewGuesses">
                        <span className="reviewMuted">Best guesses:</span>
                        {guesses.slice(0, 3).map((g) => {
                          const pig = pigsById.get(g.pig_id)!;
                          const active = selectedPigId === g.pig_id;
                          return (
                            <button
                              key={g.pig_id}
                              type="button"
                              className={`reviewGuess ${active ? 'reviewGuessActive' : ''}`}
                              disabled={busy}
                              onClick={() => select(c.id, g.pig_id)}
                            >
                              <PigThumb
                                imagePath={pig.image_paths?.[0] ?? null}
                              />
                              <span className="reviewGuessName">{pig.name}</span>
                              <span className="reviewGuessSim">
                                {Math.round(g.similarity * 100)}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="reviewMuted reviewNoGuess">
                        No confident guess yet — pick the pig below.
                      </p>
                    )}

                    <div className="reviewActions">
                      <PigPicker
                        pigs={livingPigs}
                        selectedPigId={selectedPigId ?? ''}
                        onSelect={(pigId) =>
                          pigId !== '' && select(c.id, pigId)
                        }
                        theme="blue"
                        title="Someone else?"
                      />
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => handleReject(c.id)}
                      >
                        Not a pig 🙅
                      </Button>
                    </div>

                    {selectedPig && (
                      <div className="reviewSave">
                        <span className="reviewSaveLabel">
                          Save as <strong>{selectedPig.name}</strong>?
                        </span>
                        <Button
                          variant="default"
                          disabled={busy}
                          onClick={() => clearSelection(c.id)}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="success"
                          disabled={busy}
                          onClick={() => handleConfirm(c.id, selectedPig.id)}
                        >
                          Save ✅
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

export default ReviewPage;
