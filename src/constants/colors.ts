export const PIG_COLOR_CLASSES = [
  'pig-color-seafoam',
  'pig-color-lavender',
  'pig-color-mint',
  'pig-color-sky',
  'pig-color-coral',
  'pig-color-rose',
  'pig-color-lemon',
];

export const PIG_COLOR_SICK = 'pig-color-sick';
export const PIG_COLOR_STALE = 'pig-color-stale';

export const getPigColorClass = (
  pigId: number,
  isSick = false,
  isStale = false
): string =>
  isSick
    ? PIG_COLOR_SICK
    : isStale
      ? PIG_COLOR_STALE
      : PIG_COLOR_CLASSES[pigId % PIG_COLOR_CLASSES.length];
