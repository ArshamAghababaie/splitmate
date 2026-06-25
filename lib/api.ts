export async function fetchJSON<T>(
  url: string,
  init?: RequestInit,
): Promise<T | null> {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  return res.json();
}
