import { atom } from 'jotai';

const WALLPAPER_KEY = 'token_room_wallpapers';

const load = (): Record<string, string> => {
  try {
    const s = localStorage.getItem(WALLPAPER_KEY);
    return s ? (JSON.parse(s) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

export const roomWallpapersAtom = atom<Record<string, string>>(load());

export const setRoomWallpaperAtom = atom(
  null,
  (get, set, { roomId, value }: { roomId: string; value: string | null }) => {
    const current = get(roomWallpapersAtom);
    const next = { ...current };
    if (value === null) {
      delete next[roomId];
    } else {
      next[roomId] = value;
    }
    localStorage.setItem(WALLPAPER_KEY, JSON.stringify(next));
    set(roomWallpapersAtom, next);
  }
);
