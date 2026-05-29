// Live latency probe. Measures real round-trip time to a host using a HEAD
// request (resolves on any HTTP status, so 4xx/5xx still yield a valid RTT).
// Returns milliseconds, or null on network failure / timeout.
export async function pingHost(url, timeout = 3500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const start = Date.now();
  try {
    await fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller.signal });
    return Math.round(Date.now() - start);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Ping many servers in parallel; calls onResult(id, ms) as each completes.
export async function pingAll(servers, onResult) {
  await Promise.all(
    servers.map(async (s) => {
      const ms = await pingHost(s.host);
      if (onResult) onResult(s.id, ms);
    })
  );
}
