/**
 * Helper to dynamically target the API endpoints.
 * Since we are running full-stack under Vercel, both frontend and backend
 * are hosted on the same origin domain. Relative paths work out of the box!
 */
export function getApiUrl(path: string): string {
  return path;
}
