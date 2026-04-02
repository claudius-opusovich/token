import { atom } from 'jotai';

const PINNED_KEY = 'token_pinned_rooms';

const loadPinned = (): string[] => {
  try {
    const stored = localStorage.getItem(PINNED_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
};

export const pinnedRoomsAtom = atom<string[]>(loadPinned());

export const togglePinnedRoomAtom = atom(null, (get, set, roomId: string) => {
  const current = get(pinnedRoomsAtom);
  const next = current.includes(roomId)
    ? current.filter((id) => id !== roomId)
    : [roomId, ...current];
  localStorage.setItem(PINNED_KEY, JSON.stringify(next));
  set(pinnedRoomsAtom, next);
});
