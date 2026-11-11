import type { AspectRatioKey, BackgroundState } from '../types/editor';

export interface SavedCustomFont {
  family: string;
  dataUrl: string;
}

export interface SavedProjectState {
  version: 1;
  savedAt: number;
  aspectRatio: AspectRatioKey;
  background: BackgroundState;
  canvasJson: Record<string, unknown>;
  customFonts?: SavedCustomFont[];
}

const DB_NAME = 'blanketeer-studio';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const PROJECT_KEY = 'autosave-v1';
const LOCAL_FALLBACK_KEY = 'blanketeer:autosave:v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB'));
  });
}

function writeLocalStorageFallback(project: SavedProjectState): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(project));
    }
  } catch {
    // Ignore quota errors on private browsing / oversized assets
  }
}

function readLocalStorageFallback(): SavedProjectState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedProjectState;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveProjectToBrowser(
  project: SavedProjectState
): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(project, PROJECT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB write aborted'));
    });
    db.close();
  } catch {
    writeLocalStorageFallback(project);
  }
}

export async function loadProjectFromBrowser(): Promise<SavedProjectState | null> {
  try {
    const db = await openDatabase();
    const record = await new Promise<SavedProjectState | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(PROJECT_KEY);
        req.onsuccess = () =>
          resolve(req.result as SavedProjectState | undefined);
        req.onerror = () => reject(req.error || new Error('IndexedDB read failed'));
      }
    );
    db.close();
    if (record && record.version === 1) {
      return record;
    }
  } catch {
    // Fall back to localStorage below
  }
  return readLocalStorageFallback();
}

export async function clearSavedProject(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_FALLBACK_KEY);
    }
  } catch {
    // ignore
  }
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(PROJECT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
    });
    db.close();
  } catch {
    // ignore
  }
}

