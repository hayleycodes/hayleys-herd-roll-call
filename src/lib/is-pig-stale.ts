import type { Pig } from '../services/pigs.types';

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// A pig is "stale" once it hasn't been sighted for more than two days (or has
// never been sighted at all). Stale pigs get flagged and floated to the top.
export const isPigStale = (pig: Pig): boolean => {
  if (!pig.last_sighted) return true;
  return Date.now() - new Date(pig.last_sighted).getTime() > TWO_DAYS_MS;
};
