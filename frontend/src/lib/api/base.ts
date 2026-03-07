// Prefer Vite env variable, fallback to localhost for dev
const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;

function computeApiBase() {
  const raw = (VITE_API_URL && String(VITE_API_URL).trim()) || "";
  if (raw) return raw;

  // Development fallback only (local dev convenience)
  if (import.meta.env.DEV) {
    return "http://localhost:5050";
  }

  // Production: use your deployed backend
  return "https://crm-backend.healthspire.org";
}

export const API_BASE = computeApiBase();

export function api(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}${path}`;
}
