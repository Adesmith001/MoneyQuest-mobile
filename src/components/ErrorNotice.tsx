import React, { useState } from 'react';
import ErrorModal from './modals/ErrorModal';

interface Props {
  title: string;
  message?: string | null;
  occurrence?: object | null;
  onDismiss?: () => void;
}

export default function ErrorNotice({ title, message, occurrence, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState<string | object | null>();
  const current = occurrence ?? message;

  if (!message || dismissed === current) return null;

  return (
    <ErrorModal
      title={title}
      message={message}
      onDismiss={onDismiss ?? (() => setDismissed(current))}
    />
  );
}
