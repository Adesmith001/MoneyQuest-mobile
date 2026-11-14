import React, { useSyncExternalStore } from 'react';
import { dismissErrorAlert, getErrorAlert, subscribeToErrorAlerts } from '../services/errorAlerts';
import ErrorModal from './modals/ErrorModal';

export default function ErrorAlertHost() {
  const alert = useSyncExternalStore(subscribeToErrorAlerts, getErrorAlert, getErrorAlert);
  if (!alert) return null;

  const { title, message, action } = alert;
  const confirm = () => {
    if (dismissErrorAlert(alert)) action?.onPress();
  };

  return (
    <ErrorModal
      title={title}
      message={message}
      dismissLabel={action?.cancelLabel ?? action?.label ?? 'OK'}
      onDismiss={action?.cancelLabel ? () => dismissErrorAlert(alert) : confirm}
      action={action?.cancelLabel ? { label: action.label, onPress: confirm } : undefined}
    />
  );
}
