// Extract a human-readable message from an unknown thrown value, so callers can
// `catch (err: unknown)` instead of `catch (err: any)` and still surface a
// sensible string to the user.
export const getErrorMessage = (
  err: unknown,
  fallback = 'Something went wrong'
): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
};
