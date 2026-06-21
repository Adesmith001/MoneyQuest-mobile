import { normalizeDisplayText } from '../src/utils/displayText';

const assertEqual = (actual: string, expected: string, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

assertEqual(
  normalizeDisplayText('Practice each day so your streak wonâ€™t reset'),
  "Practice each day so your streak won't reset",
  'normalizes mojibake apostrophes in display copy'
);

assertEqual(
  normalizeDisplayText('□ You know exactly how your money is used'),
  '- You know exactly how your money is used',
  'converts unsupported square bullets into standard list markers'
);

assertEqual(
  normalizeDisplayText('1. Track your spending\n2. Review the pattern'),
  '1. Track your spending\n2. Review the pattern',
  'preserves numbered lesson content'
);
