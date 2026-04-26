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

export const getPigColorClass = (pigId: number, isSick = false): string =>
  isSick ? PIG_COLOR_SICK : PIG_COLOR_CLASSES[pigId % PIG_COLOR_CLASSES.length];
