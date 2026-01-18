import type { StoredData } from '../types/mindMap';

const STORAGE_KEY = 'markdown-mindmap-data';

export const storage = {
  load(): StoredData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
  },

  save(data: StoredData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
