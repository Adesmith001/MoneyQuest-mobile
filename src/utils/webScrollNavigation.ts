export interface WheelDelta {
  deltaX?: number;
  deltaY?: number;
}

export const getHorizontalWheelDelta = ({ deltaX = 0, deltaY = 0 }: WheelDelta): number =>
  Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

export const getHorizontalDragDelta = (previousClientX: number, nextClientX: number): number =>
  previousClientX - nextClientX;

export const getVerticalDragDelta = (previousClientY: number, nextClientY: number): number =>
  previousClientY - nextClientY;
