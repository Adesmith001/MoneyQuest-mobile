const DIRECT_REPLACEMENTS: Array<[string, string]> = [
  ['â€™', "'"],
  ['â€˜', "'"],
  ['â€œ', '"'],
  ['â€\u009d', '"'],
  ['â€“', '-'],
  ['â€”', '-'],
  ['â€¢', '•'],
  ['Ã°Å¸â€Â¥', '\u{1F525}'],
];

const UNSUPPORTED_BULLET_PREFIX = /^[\s]*[□▢◻◽◾▫▪☐]\s+/gm;

export const normalizeDisplayText = (value: string | null | undefined): string => {
  if (!value) {
    return '';
  }

  let normalized = value;

  DIRECT_REPLACEMENTS.forEach(([from, to]) => {
    normalized = normalized.split(from).join(to);
  });

  normalized = normalized.replace(UNSUPPORTED_BULLET_PREFIX, '- ');

  return normalized;
};
