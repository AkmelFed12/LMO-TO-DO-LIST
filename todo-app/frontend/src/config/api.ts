// In production on Vercel, use same-origin /api and rewrite to backend.
// In local dev, keep direct backend access on port 5000.
const isLocalhost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isLocalhost
  ? `${window.location.protocol}//${window.location.hostname}:5000/api`
  : '/api';
