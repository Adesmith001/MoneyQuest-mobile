import { loadNotificationModule } from '../src/services/notificationModule';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const fallback = { kind: 'expo-go' };
let nativeLoads = 0;

const expoGoModule = loadNotificationModule(true, () => {
  nativeLoads += 1;
  return { kind: 'native' };
}, fallback);

assert(expoGoModule === fallback, 'uses the safe fallback in Expo Go');
assert(nativeLoads === 0, 'does not load expo-notifications in Expo Go');

const nativeModule = loadNotificationModule(false, () => {
  nativeLoads += 1;
  return { kind: 'native' };
}, fallback);

assert(nativeModule.kind === 'native', 'loads expo-notifications outside Expo Go');
assert(nativeLoads === 1, 'loads the native module exactly once outside Expo Go');
