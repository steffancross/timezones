// Friendly handle generator (spec 2). Used purely to PREFILL the name field in
// the contribute modal so a visitor isn't staring at an empty box — the user
// edits it freely. No crypto strength, no collision avoidance (the claimable
// list's distinguisher handles real dupes); Math.random is fine.

const ADJECTIVES = [
  'Teal',
  'Amber',
  'Coral',
  'Olive',
  'Indigo',
  'Crimson',
  'Jade',
  'Hazel',
  'Slate',
  'Plum',
  'Rust',
  'Mint',
  'Cobalt',
  'Maroon',
  'Ivory',
  'Sage',
  'Russet',
  'Azure',
  'Ochre',
  'Violet',
];

const ANIMALS = [
  'Fox',
  'Otter',
  'Heron',
  'Lynx',
  'Wren',
  'Marten',
  'Falcon',
  'Bison',
  'Badger',
  'Crane',
  'Stoat',
  'Raven',
  'Hare',
  'Ibis',
  'Moth',
  'Newt',
  'Vole',
  'Finch',
  'Seal',
  'Tern',
];

function pick<T>(arr: readonly T[]): T {
  // Length is fixed and non-empty, so the index is always in range.
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/** A friendly "Adjective Animal" handle, e.g. "Teal Fox". */
export function randomHandle(): string {
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}
