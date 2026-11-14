type ErrorAction = {
  label: string;
  onPress: () => void;
  cancelLabel?: string;
};

let current: { title: string; message: string; action?: ErrorAction } | null = null;
const listeners = new Set<() => void>();

export function showErrorAlert(title: string, message: string, action?: ErrorAction) {
  current = { title, message, action };
  listeners.forEach(listener => listener());
}

export function getErrorAlert() {
  return current;
}

export function subscribeToErrorAlerts(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function dismissErrorAlert(alert: NonNullable<typeof current>) {
  if (current !== alert) return false;
  current = null;
  listeners.forEach(listener => listener());
  return true;
}
