import { MMKV } from 'react-native-mmkv';
import * as FileSystem from 'expo-file-system';

export type UserTemplate = {
  id: string;
  title: string;
  category: string;
  pngUri: string; // file:// uri
  createdAt: number;
};

const storage = new MMKV({ id: 'colouring_user_templates' });
const KEY = 'user_templates_v1';

function loadAll(): UserTemplate[] {
  try {
    const raw = storage.getString(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as UserTemplate[];
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

function saveAll(list: UserTemplate[]) {
  storage.set(KEY, JSON.stringify(list));
}

export const UserTemplatesService = {
  list(): UserTemplate[] { return loadAll(); },
  async addFromBase64(title: string, category: string, dataUrl: string): Promise<UserTemplate> {
    const id = 'user_' + Date.now();
    const path = FileSystem.documentDirectory! + id + '.png';
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
    const tpl: UserTemplate = { id, title, category, pngUri: path, createdAt: Date.now() };
    const list = loadAll();
    list.unshift(tpl);
    saveAll(list);
    return tpl;
  },
  remove(id: string) {
    const list = loadAll();
    const idx = list.findIndex(t => t.id === id);
    if (idx >= 0) {
      const [tpl] = list.splice(idx, 1);
      saveAll(list);
      // best-effort delete file
      FileSystem.deleteAsync(tpl.pngUri).catch(() => {});
    }
  }
};
