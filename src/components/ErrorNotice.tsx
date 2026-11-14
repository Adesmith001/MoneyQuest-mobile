import React, { useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions } from 'react-native';
import ErrorModal from './modals/ErrorModal';

export function useMobileErrorModal() {
  const { width } = useWindowDimensions();
  return Platform.OS !== 'web' || width < 768;
}

interface Props {
  title: string;
  message?: string | null;
  occurrence?: object | null;
  onDismiss?: () => void;
  desktopContent?: React.ReactNode;
}

export default function ErrorNotice({ title, message, occurrence, onDismiss, desktopContent }: Props) {
  const useModal = useMobileErrorModal();
  const [dismissed, setDismissed] = useState<string | object | null>();
  const current = occurrence ?? message;

  if (!message) return null;
  if (!useModal) {
    return desktopContent ?? <Text accessibilityRole="alert" style={styles.error}>{message}</Text>;
  }
  if (dismissed === current) return null;

  return (
    <ErrorModal
      title={title}
      message={message}
      onDismiss={onDismiss ?? (() => setDismissed(current))}
    />
  );
}

const styles = StyleSheet.create({
  error: { color: '#B3261E' },
});
