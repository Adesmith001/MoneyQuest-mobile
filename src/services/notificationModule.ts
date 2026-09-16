export function loadNotificationModule<T>(
  isExpoGo: boolean,
  loadNativeModule: () => T,
  expoGoFallback: T
): T {
  return isExpoGo ? expoGoFallback : loadNativeModule();
}
