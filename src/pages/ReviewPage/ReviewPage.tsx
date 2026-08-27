import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './ReviewPage.css';
import {
  getPendingCandidates,
  confirmCandidate,
  rejectCandidate,
  markCandidateUnknown,
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
  // Which card in the carousel is currently shown.
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      // On first load a freshly-issued JWT can have an `iat` a fraction of a
      // second ahead of Supabase's auth clock, which is rejected as "JWT
      // issued at future". It self-heals within a second, so retry once
      // before surfacing the error to the page.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const [cands, allPigs] = await Promise.all([
            getPendingCandidates(),
            getAllPigsIncludingPassed(),
          ]);
          setCandidates(cands);
          setPigs(allPigs);
          break;
        } catch (err: any) {
          const isClockSkew = /issued at future/i.test(err?.message ?? '');
          if (isClockSkew && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          setError(err.message);
          break;
        }
      }
      setLoading(false);
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

  // Drop a resolved card. Keep the index pointing at whatever slides into its
  // place (the next card), clamping so it never runs off the end.
  const remove = (id: number) =>
    setCandidates((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () => setIndex((i) => Math.min(candidates.length - 1, i + 1));

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

  // Too hard to tell: permanently set the candidate aside as 'unknown' so it
  // leaves the queue for good, without labelling it as a pig or rejecting it.
  const handleUnknown = async (candidateId: number) => {
    setBusyId(candidateId);
    try {
      await markCandidateUnknown(candidateId);
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
          (() => {
            const c = candidates[index];
            const busy = busyId === c.id;
            const guesses = (c.top_guesses ?? []).filter((g) =>
              pigsById.has(g.pig_id)
            );
            const selectedPigId = selection[c.id];
            const selectedPig =
              selectedPigId != null ? pigsById.get(selectedPigId) : undefined;
            return (
              <div className="reviewCarousel">
                <button
                  type="button"
                  className="reviewArrow reviewArrowPrev"
                  aria-label="Previous candidate"
                  disabled={index === 0}
                  onClick={goPrev}
                >
                  ‹
                </button>

                <div
                  key={c.id}
                  className={`reviewCard ${busy ? 'reviewCardBusy' : ''}`}
                >
                  <CropImage path={c.crop_path} />

                  <div className="reviewCardBody">
                    <div className="reviewGuesses">
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
                      <PigPicker
                        pigs={livingPigs}
                        selectedPigId={selectedPigId ?? ''}
                        onSelect={(pigId) =>
                          pigId !== '' && select(c.id, pigId)
                        }
                        theme="blue"
                        title="Someone else?"
                      />
                    </div>

                    <div className="reviewActions">
                      <Button
                        variant="default"
                        disabled={busy}
                        onClick={() => handleUnknown(c.id)}
                      >
                        I don't know 🤷‍♀️
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busy}
                        onClick={() => handleReject(c.id)}
                      >
                        Not a pig 🙅‍♀️
                      </Button>
                    </div>

                    {/* Always reserve this row so selecting a pig doesn't
                        resize the card and jump the layout. */}
                    <div className="reviewSave">
                      {selectedPig && (
                        <>
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
                        </>
                      )}
                    </div>

                    <div className="reviewFooter">
                      {c.created_at && (
                        <span className="reviewMuted">
                          {formatDistanceToNow(new Date(c.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                      <span className="reviewMuted">
                        {index + 1} / {candidates.length}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="reviewArrow reviewArrowNext"
                  aria-label="Next candidate"
                  disabled={index >= candidates.length - 1}
                  onClick={goNext}
                >
                  ›
                </button>
              </div>
            );
          })()
        )}
      </Panel>
    </div>
  );
};

export default ReviewPage;
