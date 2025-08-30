import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'colouring_settings' });

const KEYS = {
  GEMINI_API_KEY: 'gemini_api_key',
  GEMINI_GUIDE_SEEN: 'gemini_guide_seen',
} as const;

export const SettingsService = {
  getGeminiApiKey(): string | null {
    try { return storage.getString(KEYS.GEMINI_API_KEY) || null; } catch { return null; }
  },
  setGeminiApiKey(key: string) {
    storage.set(KEYS.GEMINI_API_KEY, key);
  },
  clearGeminiApiKey() {
    try { storage.delete(KEYS.GEMINI_API_KEY); } catch { storage.set(KEYS.GEMINI_API_KEY, ''); }
  },
  getGuideSeen(): boolean {
    try { return storage.getBoolean(KEYS.GEMINI_GUIDE_SEEN) || false; } catch { return false; }
  },
  setGuideSeen(seen: boolean) {
    storage.set(KEYS.GEMINI_GUIDE_SEEN, seen);
  },
};
