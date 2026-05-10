export type MatchingCardTone =
  | 'default'
  | 'selected'
  | 'matched'
  | 'highlighted'
  | 'correct'
  | 'incorrect';

export const getMatchingCardTone = ({
  selected = false,
  matched = false,
  highlighted = false,
  feedback = null,
  showResults = false,
  result = null,
}: {
  selected?: boolean;
  matched?: boolean;
  highlighted?: boolean;
  feedback?: 'correct' | 'incorrect' | null;
  showResults?: boolean;
  result?: 'correct' | 'incorrect' | null;
}): MatchingCardTone => {
  if (feedback === 'correct' || (showResults && result === 'correct')) {
    return 'correct';
  }

  if (feedback === 'incorrect' || (showResults && result === 'incorrect')) {
    return 'incorrect';
  }

  if (selected) {
    return 'selected';
  }

  if (matched && !showResults) {
    return 'matched';
  }

  if (highlighted) {
    return 'highlighted';
  }

  return 'default';
};
