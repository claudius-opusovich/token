import { MatrixClient, Preset, Visibility } from 'matrix-js-sdk';
import { addRoomIdToMDirect } from './matrix';

export const SAVED_MESSAGES_ROOM_NAME = 'Избранное';
const SAVED_MESSAGES_LS_KEY = 'token_saved_messages_room';

export const getSavedMessagesRoomId = (): string | null =>
  localStorage.getItem(SAVED_MESSAGES_LS_KEY);

export const isSavedMessagesRoom = (roomId: string): boolean =>
  getSavedMessagesRoomId() === roomId;

/**
 * Ensures a "Saved Messages" (Избранное) self-chat room exists for the user.
 * Creates one if it doesn't exist. Returns the room ID.
 */
export async function ensureSavedMessagesRoom(mx: MatrixClient): Promise<string> {
  const myUserId = mx.getSafeUserId();

  // 1. Check localStorage cache
  const cached = getSavedMessagesRoomId();
  if (cached && mx.getRoom(cached)) return cached;

  // 2. Check existing DM rooms for self-chat
  const mDirectEvent = mx.getAccountData('m.direct' as any);
  if (mDirectEvent) {
    const content = mDirectEvent.getContent() as Record<string, string[]>;
    const selfRoomIds = content[myUserId] || [];
    for (const rid of selfRoomIds) {
      if (mx.getRoom(rid)) {
        localStorage.setItem(SAVED_MESSAGES_LS_KEY, rid);
        return rid;
      }
    }
  }

  // 3. Create new self-chat room
  const result = await mx.createRoom({
    is_direct: true,
    visibility: Visibility.Private,
    preset: Preset.TrustedPrivateChat,
    name: SAVED_MESSAGES_ROOM_NAME,
    invite: [],
  });

  const roomId = result.room_id;
  await addRoomIdToMDirect(mx, roomId, myUserId);
  localStorage.setItem(SAVED_MESSAGES_LS_KEY, roomId);
  return roomId;
}
