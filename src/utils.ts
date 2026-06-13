/**
 * Helper to dynamically target the API endpoints based on environment hostnames.
 * If running on a third-party domain like Vercel, it routes requests to our
 * secure Cloud Run production backend.
 */
export function getApiUrl(path: string): string {
  const hostname = window.location.hostname;
  
  // Check if we are running locally, via IP address, or on our dedicated Cloud Run app.
  const isLocalOrCloudRun = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.endsWith('.run.app') ||
    hostname.includes('192.168.') ||
    hostname.startsWith('10.');
    
  if (isLocalOrCloudRun) {
    return path;
  }
  
  // Custom static-hosting deployment fallback (Vercel, Netlify, etc.)
  // We route API requests directly to our full-stack service host.
  const BACKEND_URL = 'https://ais-pre-ql6og5ytqfagsz6ab6hxmi-985046012348.asia-southeast1.run.app';
  return `${BACKEND_URL}${path}`;
}
