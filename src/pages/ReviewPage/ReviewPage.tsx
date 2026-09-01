import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './ReviewPage.css';
import {
  confirmCandidate,
  rejectCandidate,
  markCandidateUnknown,
  type SightingCandidate,
} from '../../services/sighting-candidates.service';
import { useReviewQueue } from '../../hooks/useReviewQueue';
import { getAllPigsIncludingPassed } from '../../services/pigs.service';
import type { Pig } from '../../services/pigs.types';
import { getPigImageUrl } from '../../services/pig-images.service';
import { getErrorMessage } from '../../lib/get-error-message';
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
        aria-label="Enlarge detected pig photo"
        onClick={() => setEnlarged(true)}
      >
        <img src={url} alt="Detected pig" />
      </button>
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

interface ReviewCardProps {
  candidate: SightingCandidate;
  position: number;
  total: number;
  busy: boolean;
  pigsById: Map<number, Pig>;
  livingPigs: Pig[];
  selectedPigId: number | undefined;
  onSelect: (pigId: number) => void;
  onClear: () => void;
  onConfirm: (pigId: number) => void;
  onUnknown: () => void;
  onReject: () => void;
}

const ReviewCard = ({
  candidate: c,
  position,
  total,
  busy,
  pigsById,
  livingPigs,
  selectedPigId,
  onSelect,
  onClear,
  onConfirm,
  onUnknown,
  onReject,
}: ReviewCardProps) => {
  const guesses = (c.top_guesses ?? []).filter((g) => pigsById.has(g.pig_id));
  const selectedPig =
    selectedPigId != null ? pigsById.get(selectedPigId) : undefined;

  return (
    <div className={`reviewCard ${busy ? 'reviewCardBusy' : ''}`}>
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
                onClick={() => onSelect(g.pig_id)}
              >
                <PigThumb imagePath={pig.image_paths?.[0] ?? null} />
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
            onSelect={(pigId) => pigId !== '' && onSelect(pigId)}
            theme="blue"
            title="Someone else?"
          />
        </div>

        <div className="reviewActions">
          <Button variant="default" disabled={busy} onClick={onUnknown}>
            I don't know 🤷‍♀️
          </Button>
          <Button variant="danger" disabled={busy} onClick={onReject}>
            Not a pig 🙅‍♀️
          </Button>
        </div>

        <div
          className={`reviewSave ${selectedPig ? '' : 'reviewSaveHidden'}`}
          aria-hidden={!selectedPig}
        >
          <span className="reviewSaveLabel">
            Save as <strong>{selectedPig?.name ?? ' '}</strong>?
          </span>
          <Button
            variant="default"
            disabled={busy || !selectedPig}
            onClick={onClear}
          >
            Clear
          </Button>
          <Button
            variant="success"
            disabled={busy || !selectedPig}
            onClick={() => selectedPig && onConfirm(selectedPig.id)}
          >
            Save ✅
          </Button>
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
            {position} / {total}
          </span>
        </div>
      </div>
    </div>
  );
};

const ReviewPage = () => {
  const { candidates, loading, error, setError, removeCandidate } =
    useReviewQueue();
  const [pigs, setPigs] = useState<Pig[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    getAllPigsIncludingPassed()
      .then(setPigs)
      .catch((err) => setError(getErrorMessage(err)));
  }, [setError]);

  const pigsById = useMemo(() => {
    const m = new Map<number, Pig>();
    for (const p of pigs) m.set(p.id, p);
    return m;
  }, [pigs]);

  const livingPigs = useMemo(() => pigs.filter((p) => !p.passed_away), [pigs]);

  const index = useMemo(() => {
    const i = candidates.findIndex((c) => c.id === activeId);
    return i === -1 ? 0 : i;
  }, [candidates, activeId]);

  useEffect(() => {
    const current = candidates[index];
    if (current && current.id !== activeId) setActiveId(current.id);
    if (candidates.length === 0 && activeId !== null) setActiveId(null);
  }, [candidates, index, activeId]);

  const remove = (id: number) => {
    const pos = candidates.findIndex((c) => c.id === id);
    const next = candidates.filter((c) => c.id !== id);
    const landing = next[Math.min(pos, next.length - 1)];
    setActiveId(landing ? landing.id : null);
    removeCandidate(id);
  };

  const goPrev = () => {
    const target = candidates[Math.max(0, index - 1)];
    if (target) setActiveId(target.id);
  };
  const goNext = () => {
    const target = candidates[Math.min(candidates.length - 1, index + 1)];
    if (target) setActiveId(target.id);
  };

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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (candidateId: number) => {
    setBusyId(candidateId);
    try {
      await rejectCandidate(candidateId);
      remove(candidateId);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleUnknown = async (candidateId: number) => {
    setBusyId(candidateId);
    try {
      await markCandidateUnknown(candidateId);
      remove(candidateId);
    } catch (err) {
      setError(getErrorMessage(err));
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

            <div className="reviewViewport">
              <div
                className="reviewTrack"
                style={{ transform: `translateX(-${index * 100}%)` }}
              >
                {candidates.map((c, i) => (
                  <div
                    className="reviewSlide"
                    key={c.id}
                    aria-hidden={i !== index}
                  >
                    <ReviewCard
                      candidate={c}
                      position={i + 1}
                      total={candidates.length}
                      busy={busyId === c.id}
                      pigsById={pigsById}
                      livingPigs={livingPigs}
                      selectedPigId={selection[c.id]}
                      onSelect={(pigId) => select(c.id, pigId)}
                      onClear={() => clearSelection(c.id)}
                      onConfirm={(pigId) => handleConfirm(c.id, pigId)}
                      onUnknown={() => handleUnknown(c.id)}
                      onReject={() => handleReject(c.id)}
                    />
                  </div>
                ))}
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
        )}
      </Panel>
    </div>
  );
};

export default ReviewPage;
