const generateCode = () => `MQ-${Date.now().toString(36).slice(-5).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

let supportCode = generateCode();
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    supportCode = window.sessionStorage.getItem('moneyquest_support_code') || supportCode;
    window.sessionStorage.setItem('moneyquest_support_code', supportCode);
  }
} catch {
  // Private browsing may block sessionStorage; the in-memory code still works.
}

export const getSupportCode = () => supportCode;
