const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

export const API_BASE_URL = `${API_ORIGIN}/api`;

