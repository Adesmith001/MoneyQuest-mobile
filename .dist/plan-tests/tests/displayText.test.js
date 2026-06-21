"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const displayText_1 = require("../src/utils/displayText");
const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
};
assertEqual((0, displayText_1.normalizeDisplayText)('Practice each day so your streak wonâ€™t reset'), "Practice each day so your streak won't reset", 'normalizes mojibake apostrophes in display copy');
assertEqual((0, displayText_1.normalizeDisplayText)('□ You know exactly how your money is used'), '- You know exactly how your money is used', 'converts unsupported square bullets into standard list markers');
assertEqual((0, displayText_1.normalizeDisplayText)('1. Track your spending\n2. Review the pattern'), '1. Track your spending\n2. Review the pattern', 'preserves numbered lesson content');
