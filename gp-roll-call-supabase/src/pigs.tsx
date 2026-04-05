import { supabase } from "../utils/supabase-client"

// export const mainPenPigList = [
//     'Hazelnut',
//     'Chestnut',
//     'Oreo',
//     'Cookie',
//     'Honey',
//     'Banana',
//     'Banana Brown-Foot',
//     'Ginger',
//     'Pumpkin',
//     'Meatball',
//     'Starbuck',
//     'Crouton',
//     'Crumb',
//     'Honeydew',
//     'Melon',
//     'Beans',
//     'Nacho',
//     'Maple',
//     'Crumpet',
//     'Chai',
//     'Pineapple',
//     'Stylish Pig',
//     'Spice',
//     'Waffle',
//     'Fish',
//     'Muffin',
//     'Raisin',
//     'Cherry',
//     'Potato',
//     'Toast',
// ];

export const { data, error } = await supabase
  .from('pigs')
  .select()


// export const smallPensPigList = ['Spud', 'Pie', 'Tornado Pig'];
