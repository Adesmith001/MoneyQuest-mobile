import { getMatchingCardTone } from '../src/components/questions/matchingQuestionStyleState';

const assertEqual = (actual: string, expected: string, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
};

assertEqual(
  getMatchingCardTone({ selected: true }),
  'selected',
  'selected cards use the primary selected tone'
);

assertEqual(
  getMatchingCardTone({ feedback: 'correct' }),
  'correct',
  'correct feedback takes priority over neutral states'
);

assertEqual(
  getMatchingCardTone({ matched: true, showResults: false }),
  'matched',
  'matched cards keep a selected-style tone before final results'
);

assertEqual(
  getMatchingCardTone({ highlighted: true }),
  'highlighted',
  'available right-side cards highlight after a left card is selected'
);
