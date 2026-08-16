const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password1',
  'password123',
  'qwerty123',
  'qwertyui',
  'letmein12',
  'welcome1',
  'iloveyou',
  'admin123',
  'football',
  'monkey123',
]);

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 265;

export function getPasswordValidationError(password: string): string {
  if (password.length === 0) return '';
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    return 'Password must be between 8 and 265 characters long.';
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    return 'This password is too common. Please choose a stronger password.';
  }

  return '';
}
