import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { useAllOrphanRooms } from '../../../state/hooks/roomList';

export const useHomeRooms = () => {
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const rooms = useAllOrphanRooms(mx, allRoomsAtom, roomToParents);
  return rooms;
};
