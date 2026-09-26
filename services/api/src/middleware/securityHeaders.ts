export interface SecurityHeadersMap {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Content-Security-Policy': string;
  [key: string]: string;
}

export function getSecurityHeaders(): SecurityHeadersMap {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'",
  };
}

export function applySecurityHeaders<T extends { setHeader?: (k: string, v: string) => void }>(res: T): T {
  const headers = getSecurityHeaders();
  if (res && typeof res.setHeader === 'function') {
    for (const [key, val] of Object.entries(headers)) {
      res.setHeader(key, val);
    }
  }
  return res;
}
