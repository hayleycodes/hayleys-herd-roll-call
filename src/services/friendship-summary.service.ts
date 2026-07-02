import { supabase } from '../../utils/supabase-client';
import type { Pig } from './pigs.types';
import {
  bondEventLabel,
  tierFor,
  parseTs,
  FRIENDSHIP_MONTHS,
  type FriendData,
} from './friendship';

const DAY_MS = 24 * 60 * 60 * 1000;
// How many recent days count as "lately" for the recency signal.
const RECENT_WINDOW_DAYS = 7;

// Turn the computed friend data into a compact, name-resolved payload for the
// summary model. Keeps the request small and the summary grounded in real names.
export const buildFriendshipFacts = (data: FriendData, pigs: Pig[]) => {
  const nameById = new Map(pigs.map((p) => [Number(p.id), p.name]));
  const name = (id: number) => nameById.get(id) ?? `#${id}`;

  // Per-pig recency from the full event history (bond + proximity moments).
  const now = Date.now();
  const lastTsById = new Map<number, number>();
  const recentCountById = new Map<number, number>();
  for (const ev of data.historyEvents) {
    const t = parseTs(ev.ts);
    if (Number.isNaN(t)) continue;
    const isRecent = now - t <= RECENT_WINDOW_DAYS * DAY_MS;
    for (const id of ev.pigIds) {
      if (t > (lastTsById.get(id) ?? -Infinity)) lastTsById.set(id, t);
      if (isRecent)
        recentCountById.set(id, (recentCountById.get(id) ?? 0) + 1);
    }
  }

  return {
    windowMonths: FRIENDSHIP_MONTHS,
    recentWindowDays: RECENT_WINDOW_DAYS,
    pairs: data.friendPairs.map((p) => ({
      pigs: [p.pigA.name, p.pigB.name],
      tier: tierFor(p.points).label,
      points: p.points,
    })),
    perPig: [...data.statsByPig.entries()].map(([id, stats]) => {
      const lastTs = lastTsById.get(id);
      return {
        name: name(id),
        ...stats,
        daysSinceLastInteraction:
          lastTs != null ? Math.floor((now - lastTs) / DAY_MS) : null,
        interactionsLast7Days: recentCountById.get(id) ?? 0,
      };
    }),
    // Newest events first; cap so the payload stays small.
    recentEvents: data.historyEvents.slice(0, 40).map((ev) => ({
      what: bondEventLabel(ev),
      when: ev.ts,
      pigs: ev.pigIds.map(name),
    })),
  };
};

// Ask the friendship-summary Edge Function (Gemini) for a natural-language
// digest of the herd's recent friendships. Runs on demand.
export const getFriendshipSummary = async (
  data: FriendData,
  pigs: Pig[],
  question?: string
): Promise<string> => {
  const facts = buildFriendshipFacts(data, pigs);
  const { data: res, error } = await supabase.functions.invoke(
    'friendship-summary',
    { body: { facts, question } }
  );
  if (error) throw new Error(error.message);
  return (res as { summary: string }).summary;
};
