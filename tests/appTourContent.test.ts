import { getAppTourSlides } from '../src/config/appTourSlides';

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const updateSlides = getAppTourSlides('update');
const firstRunSlides = getAppTourSlides('first-run');
const updateCopy = JSON.stringify(updateSlides).toLowerCase();
const firstRunCopy = JSON.stringify(firstRunSlides).toLowerCase();

for (const feature of ['quest', 'chest', 'badge']) {
  assert(updateCopy.includes(feature), `update tour explains ${feature}s`);
  assert(firstRunCopy.includes(feature), `first-run tour explains ${feature}s`);
}

assert(
  updateSlides.length === 3,
  'existing users receive a concise three-slide update tour'
);

assert(
  firstRunSlides.length > updateSlides.length,
  'new users still receive the broader onboarding walkthrough'
);
