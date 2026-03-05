export function readLocalStorageItem(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorageItem(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

export function readLocalStorageJson<T>(key: string, fallback: T): T {
  const raw = readLocalStorageItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocalStorageJson(key: string, value: unknown) {
  writeLocalStorageItem(key, JSON.stringify(value));
}

