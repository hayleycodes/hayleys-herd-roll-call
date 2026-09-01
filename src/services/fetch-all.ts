// PostgREST caps a single response at 1000 rows by default. Selects that feed
// whole-dataset computations (friendship, social order, weights) must page past
// that cap, or they silently operate on a truncated subset and produce wrong
// results with no error.

const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Page through a Supabase select until fewer than PAGE_SIZE rows come back,
 * accumulating every row. `buildPage(from, to)` should return the query for the
 * inclusive row range [from, to] (i.e. `query.range(from, to)`).
 */
export const fetchAllRows = async <T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> => {
  const all: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    all.push(...rows);

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
};
