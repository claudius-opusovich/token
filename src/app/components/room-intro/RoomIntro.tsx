import React, { useCallback, useState } from 'react';
import { Box, Text, as } from 'folds';
import { Room } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';
import { IRoomCreateContent, StateEvent } from '../../../types/matrix/room';
import { getStateEvent } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { timeDayMonthYear, timeHourMinute } from '../../utils/time';
import { mDirectAtom } from '../../state/mDirectList';
import { useRoomName } from '../../hooks/useRoomMeta';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { InviteUserPrompt } from '../invite-user-prompt';
import { isSavedMessagesRoom } from '../../utils/savedMessages';

export type RoomIntroProps = {
  room: Room;
};

export const RoomIntro = as<'div', RoomIntroProps>(({ room, ...props }, ref) => {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const isDirect = mDirects.has(room.roomId);
  const [invitePrompt, setInvitePrompt] = useState(false);

  const createEvent = getStateEvent(room, StateEvent.RoomCreate);
  const name = useRoomName(room);
  const createContent = createEvent?.getContent<IRoomCreateContent>();
  const ts = createEvent?.getTs();
  const prevRoomId = createContent?.predecessor?.room_id;
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

  const isSelf = isSavedMessagesRoom(room.roomId);

  if (isSelf) {
    return (
      <Box direction="Column" alignItems="Center" gap="300" {...props} ref={ref}
        style={{ padding: '48px 24px 24px', userSelect: 'none' }}
      >
        <span style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#2AABEE',
          flexShrink: 0,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21L12 18L5 21Z" fill="#fff"/>
          </svg>
        </span>
        <Text size="H4" align="Center" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Избранное
        </Text>
        <Text size="T300" align="Center" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: '260px', lineHeight: 1.5 }}>
          Сохраняйте важные сообщения, фото и ссылки — они всегда будут под рукой
        </Text>
      </Box>
    );
  }

  return (
    <Box direction="Column" alignItems="Center" gap="200" {...props} ref={ref}
      style={{ padding: '32px 16px 16px', userSelect: 'none' }}
    >
      {ts && (
        <Box
          style={{
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '4px 14px',
          }}
        >
          <Text size="T200" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {timeDayMonthYear(ts)}
          </Text>
        </Box>
      )}
      <Text size="T300" align="Center" style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '280px' }}>
        {isDirect
          ? `Начало вашего диалога с ${name}`
          : `Чат «${name}» создан`}
      </Text>
      {!isDirect && (
        <button
          onClick={() => setInvitePrompt(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#2AABEE',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '2px 8px',
          }}
        >
          + Пригласить участника
        </button>
      )}
      {invitePrompt && (
        <InviteUserPrompt room={room} requestClose={() => setInvitePrompt(false)} />
      )}
    </Box>
  );
});
