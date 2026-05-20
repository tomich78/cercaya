const KEY = "estamosCerca_recent_searches";
const MAX = 5;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export function saveRecentSearch(query: string): string[] {
  const q = query.trim();
  if (!q || q.length < 2) return getRecentSearches();
  try {
    const prev = getRecentSearches().filter(s => s.toLowerCase() !== q.toLowerCase());
    const next = [q, ...prev].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

export function removeRecentSearch(query: string): string[] {
  try {
    const next = getRecentSearches().filter(s => s !== query);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

export function clearRecentSearches(): void {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}
