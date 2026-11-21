import { useEffect, useState } from 'react';

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable (private mode) — keep in memory only */
    }
  }, [key, value]);
  return [value, setValue];
}

const readHash = () =>
  window.location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);

export function useHashRoute() {
  const [route, setRoute] = useState(readHash);
  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const navigate = (path) => {
  window.location.hash = path;
};

/** Strumming patterns the user saved in the Strum studio: [{id, name, pattern}]. */
export const useMyPatterns = () => useLocalStorage('riyaaz.patterns', []);

export const dayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * How many times each strumming pattern has been played through (saved on the phone).
 * Returns { forPattern(p), today, total, add(p), reset(p), resetAll() }.
 */
export function useStrumCounts() {
  const [c, setC] = useLocalStorage('riyaaz.strum.counts', { byPattern: {}, days: {}, total: 0 });
  return {
    byPattern: c.byPattern || {},
    forPattern: (p) => c.byPattern?.[p] || 0,
    today: c.days?.[dayKey()] || 0,
    days: c.days || {},
    total: c.total || 0,
    add: (p) =>
      setC((x) => ({
        byPattern: { ...x.byPattern, [p]: (x.byPattern?.[p] || 0) + 1 },
        days: { ...x.days, [dayKey()]: (x.days?.[dayKey()] || 0) + 1 },
        total: (x.total || 0) + 1,
      })),
    reset: (p) => setC((x) => ({ ...x, byPattern: { ...x.byPattern, [p]: 0 } })),
    resetAll: () => setC({ byPattern: {}, days: {}, total: 0 }),
  };
}
