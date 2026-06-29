import type { FriendCategory } from '../services/pigs.types';

// Shared list of friendship behaviours, used when logging friend events and
// when marking pigs together on the map.
export const FRIEND_CATEGORIES: { value: FriendCategory; label: string }[] = [
  { value: 'snacking', label: '🍴 Snacking' },
  { value: 'grooming', label: '🧼 Grooming' },
  { value: 'following', label: '🐾 Following' },
  { value: 'sharing_house', label: '🏠 Sharing a house' },
  { value: 'booping_noses', label: '👃 Booping noses' },
  { value: 'resting_together', label: '😴 Resting together' },
];

export const friendCategoryLabel = (value: FriendCategory) =>
  FRIEND_CATEGORIES.find((c) => c.value === value)?.label ?? value;
