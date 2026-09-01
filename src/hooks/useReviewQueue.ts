import { useCallback, useEffect, useState } from 'react';
import {
  getPendingCandidates,
  subscribeToPendingCandidates,
  type SightingCandidate,
} from '../services/sighting-candidates.service';
import { getErrorMessage } from '../lib/get-error-message';

// Newest-first, matching getPendingCandidates' `order('created_at', desc)`.
// A null created_at sorts last so it never jumps above real timestamps.
const byNewest = (a: SightingCandidate, b: SightingCandidate) => {
  const ta = a.created_at ? Date.parse(a.created_at) : -Infinity;
  const tb = b.created_at ? Date.parse(b.created_at) : -Infinity;
  return tb - ta;
};

// Owns the pending review queue: the initial load plus a live Supabase Realtime
// subscription that reconciles inserts/updates/deletes into the list.
//
// Reconciliation deliberately keeps the array stable for the reviewer: an
// upsert of a row already in the list updates it in place (no reordering), and
// a genuinely new row is inserted at its sorted position. The consuming carousel
// tracks the *card* it's viewing by id, so it survives these mutations.
export const useReviewQueue = () => {
  const [candidates, setCandidates] = useState<SightingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      // On first load a freshly-issued JWT can have an `iat` a fraction of a
      // second ahead of Supabase's auth clock, which is rejected as "JWT issued
      // at future". It self-heals within a second, so retry once before
      // surfacing the error to the page.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const cands = await getPendingCandidates();
          if (alive) setCandidates(cands);
          break;
        } catch (err) {
          const isClockSkew = /issued at future/i.test(getErrorMessage(err, ''));
          if (isClockSkew && attempt === 0) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          if (alive) setError(getErrorMessage(err));
          break;
        }
      }
      if (alive) setLoading(false);
    };
    load();

    const unsubscribe = subscribeToPendingCandidates((change) => {
      if (!alive) return;
      setCandidates((prev) => {
        if (change.kind === 'remove') {
          return prev.filter((c) => c.id !== change.id);
        }
        const { candidate } = change;
        const existing = prev.findIndex((c) => c.id === candidate.id);
        if (existing !== -1) {
          // Update in place — don't reorder a card the reviewer may be on.
          const next = [...prev];
          next[existing] = candidate;
          return next;
        }
        // Genuinely new: insert at its sorted position.
        return [...prev, candidate].sort(byNewest);
      });
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  // Optimistic local removal for cards the reviewer resolves. The realtime
  // 'remove' event will also fire, but the filter is idempotent so the echo is
  // harmless — and removing immediately keeps the UI snappy.
  const removeCandidate = useCallback((id: number) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { candidates, loading, error, setError, removeCandidate };
};
