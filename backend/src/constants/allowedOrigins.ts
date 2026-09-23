const devLocalOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

/** Allows Flutter web, Vite, and other local dev servers on random ports. */
export function isOriginAllowed(origin: string, nodeEnv: string): boolean {
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  if (nodeEnv !== 'production' && devLocalOriginPattern.test(origin)) {
    return true;
  }
  return false;
}

export const allowedOrigins: string[] = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:4175',
  'http://localhost:4176',
  'http://localhost:4177',
  'http://localhost:4178',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://127.0.0.1:4175',
  'http://127.0.0.1:4176',
  'http://127.0.0.1:4177',
  'http://127.0.0.1:4178',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:4000',
  'http://127.0.0.1:4000'
];
