export const PIG_COLOR_CLASSES = [
  'pig-color-pink',
  'pig-color-yellow',
  'pig-color-lavender',
  'pig-color-mint',
  'pig-color-sky',
  'pig-color-peach',
  'pig-color-rose',
  'pig-color-sage',
];

export const PIG_COLOR_SICK = 'pig-color-sick';

export const getPigColorClass = (pigId: number, isSick = false): string =>
  isSick ? PIG_COLOR_SICK : PIG_COLOR_CLASSES[pigId % PIG_COLOR_CLASSES.length];
