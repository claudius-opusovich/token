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
            color: '#5288c1',
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
