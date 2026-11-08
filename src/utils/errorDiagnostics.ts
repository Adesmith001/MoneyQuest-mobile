export const sanitizeDiagnosticText = (value: unknown, maxLength = 2000): string =>
  String(value || '')
    .replace(/authorization:\s*bearer\s+\S+/gi, 'Authorization: Bearer [redacted-token]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .slice(0, maxLength);

export const buildErrorDiagnostics = (
  error: Error,
  componentStack = '',
  releaseId = 'unknown',
) => ({
  error_message: sanitizeDiagnosticText(error?.message, 500),
  error_stack: sanitizeDiagnosticText(error?.stack),
  component_stack: sanitizeDiagnosticText(componentStack),
  release_id: releaseId,
});
