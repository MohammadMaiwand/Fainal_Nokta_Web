const API_PORTS = [8081, 4000];

function normalizeApiBase(url: string) {
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function getApiBaseCandidates(): string[] {
  if (typeof window === 'undefined') {
    return API_PORTS.map((apiPort) => normalizeApiBase(`http://127.0.0.1:${apiPort}`));
  }

  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  const { protocol, hostname, origin, port } = window.location;
  const candidates = new Set<string>();

  const devFrontendPorts = new Set(['4173', '5173', '5174', '5175', '5176', '5177', '5178', '5179']);
  const usesDevProxy = devFrontendPorts.has(port);

  if (envUrl) {
    candidates.add(normalizeApiBase(String(envUrl)));
  }

  for (const apiPort of API_PORTS) {
    candidates.add(normalizeApiBase(`http://127.0.0.1:${apiPort}`));
    candidates.add(normalizeApiBase(`http://localhost:${apiPort}`));
    if (port !== String(apiPort)) {
      candidates.add(normalizeApiBase(`${protocol}//${hostname}:${apiPort}`));
    }
  }

  candidates.add(normalizeApiBase(`${origin}/api`));

  const ordered = [...candidates];
  if (usesDevProxy) {
    // Prefer same-origin Vite proxy first to avoid CORS on custom headers (e.g. Idempotency-Key).
    const proxyBase = normalizeApiBase(`${origin}/api`);
    const direct = API_PORTS.flatMap((apiPort) => [
      normalizeApiBase(`http://127.0.0.1:${apiPort}`),
      normalizeApiBase(`http://localhost:${apiPort}`)
    ]);
    const rest = ordered.filter((item) => item !== proxyBase && !direct.includes(item));
    return [proxyBase, ...direct, ...rest];
  }

  return ordered;
}

function healthUrlFromApiBase(apiBase: string) {
  return apiBase.replace(/\/api\/?$/, '/health');
}

async function probeApiBase(base: string, timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetch(healthUrlFromApiBase(base), {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs)
    });
    return response.ok ? base : null;
  } catch {
    return null;
  }
}

/**
 * Probe API bases in parallel (short timeout) so cold start stays fast
 * even when some candidates are unreachable.
 */
export async function findReachableApiBase(timeoutMs = 1200): Promise<string | null> {
  const candidates = getApiBaseCandidates();
  if (!candidates.length) return null;

  // Prefer first successful candidate in priority order without waiting for all failures.
  const pending = candidates.map((base, index) =>
    probeApiBase(base, timeoutMs).then((hit) => (hit ? { hit, index } : null))
  );

  const results = await Promise.all(pending);
  const winners = results.filter(Boolean) as Array<{ hit: string; index: number }>;
  if (!winners.length) return null;
  winners.sort((a, b) => a.index - b.index);
  return winners[0].hit;
}
