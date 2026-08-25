import {
  getHorizontalDragDelta,
  getHorizontalWheelDelta,
  getVerticalDragDelta,
} from '../src/utils/webScrollNavigation';

const assertEqual = <T>(actual: T, expected: T, message: string) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
};

assertEqual(
  getHorizontalWheelDelta({ deltaX: 0, deltaY: 120 }),
  120,
  'mouse wheel vertical movement maps to horizontal scrolling'
);

assertEqual(
  getHorizontalWheelDelta({ deltaX: 35, deltaY: 8 }),
  35,
  'trackpad horizontal movement stays horizontal'
);

assertEqual(
  getVerticalDragDelta(240, 180),
  60,
  'dragging upward moves vertical content down'
);

assertEqual(
  getHorizontalDragDelta(180, 240),
  -60,
  'dragging right moves horizontal content toward the previous section'
);
