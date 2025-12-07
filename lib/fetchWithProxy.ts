// lib/fetchWithProxy.ts
export async function fetchWithProxy(url: string, opts: RequestInit = {}) {
  // Try direct fetch first (fast if CORS allowed)
  try {
    const resp = await fetch(url, { method: "GET", ...opts });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await resp.json();
    const text = await resp.text();
    try { return JSON.parse(text); } catch { return text; }
  } catch (err) {
    // Fallback to server proxy
    console.warn(
  "Direct fetch failed, using server proxy:",
  (err as any)?.message || err
);
    const proxyResp = await fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!proxyResp.ok) {
      const txt = await proxyResp.text().catch(() => "");
      throw new Error(`Proxy fetch failed ${proxyResp.status}: ${txt}`);
    }
    const ct = proxyResp.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await proxyResp.json();
    const text = await proxyResp.text();
    try { return JSON.parse(text); } catch { return text; }
  }
}
