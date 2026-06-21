"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDisplayText = void 0;
const DIRECT_REPLACEMENTS = [
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
const normalizeDisplayText = (value) => {
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
exports.normalizeDisplayText = normalizeDisplayText;
