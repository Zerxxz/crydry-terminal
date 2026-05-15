/**
 * Tiny client wrapper. Throws on non-2xx so React Query surfaces errors.
 */
export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    const msg = typeof body === "object" && body && "error" in body
      ? String((body as { error: unknown }).error)
      : `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
}
