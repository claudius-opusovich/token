import React, { useCallback, useEffect, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Dialog,
  Overlay,
  OverlayCenter,
  OverlayBackdrop,
  Header,
  config,
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  color,
  Button,
  Spinner,
  Checkbox,
} from 'folds';
import { MatrixClient, MatrixError, Room } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { stopPropagation } from '../../utils/keyboard';
import { isSavedMessagesRoom } from '../../utils/savedMessages';
import { mDirectAtom } from '../../state/mDirectList';
import { guessDmRoomUserId } from '../../utils/matrix';
import { getMemberDisplayName } from '../../utils/room';

type LeaveRoomPromptProps = {
  roomId: string;
  onDone: () => void;
  onCancel: () => void;
};

// ── Shared dialog shell ──────────────────────────────────────────────
function PromptShell({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: onCancel,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">{title}</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              {children}
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

// ── DM delete dialog ─────────────────────────────────────────────────
function DmDeletePrompt({
  room,
  roomId,
  mx,
  onDone,
  onCancel,
}: {
  room: Room;
  roomId: string;
  mx: MatrixClient;
  onDone: () => void;
  onCancel: () => void;
}) {
  const otherUserId = guessDmRoomUserId(room, mx.getSafeUserId());
  const otherName =
    (otherUserId ? getMemberDisplayName(room, otherUserId) : undefined) ??
    otherUserId ??
    'собеседника';

  // Check if current user can kick
  const plEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const pls = plEvent?.getContent() ?? {};
  const myPl =
    (pls.users as Record<string, number> | undefined)?.[mx.getSafeUserId()] ??
    (pls.users_default as number | undefined) ??
    0;
  const canKick = myPl >= ((pls.kick as number | undefined) ?? 50);

  const [deleteForBoth, setDeleteForBoth] = useState(false);

  const [deleteState, doDelete] = useAsyncCallback<undefined, MatrixError, []>(
    useCallback(async () => {
      if (deleteForBoth && otherUserId) {
        await mx.kick(roomId, otherUserId);
      }
      await mx.leave(roomId);
      await mx.forget(roomId);
    }, [mx, roomId, deleteForBoth, otherUserId])
  );

  useEffect(() => {
    if (deleteState.status === AsyncStatus.Success) onDone();
  }, [deleteState, onDone]);

  const loading =
    deleteState.status === AsyncStatus.Loading ||
    deleteState.status === AsyncStatus.Success;

  return (
    <PromptShell title="Удалить чат" onCancel={onCancel}>
      <Box direction="Column" gap="200">
        <Text priority="400">Удалить чат с {otherName}?</Text>
        {canKick && otherUserId && (
          <Box as="label" alignItems="Center" gap="200" style={{ cursor: 'pointer' }}>
            <Checkbox
              checked={deleteForBoth}
              onChange={(e) => setDeleteForBoth(e.target.checked)}
              size="300"
            />
            <Text size="T300">Также удалить для {otherName}</Text>
          </Box>
        )}
        {deleteState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T300">
            Ошибка: {deleteState.error.message}
          </Text>
        )}
      </Box>
      <Button
        type="submit"
        variant="Critical"
        onClick={doDelete}
        before={loading ? <Spinner fill="Solid" variant="Critical" size="200" /> : undefined}
        aria-disabled={loading}
      >
        <Text size="B400">
          {loading
            ? 'Удаление...'
            : deleteForBoth
            ? 'Удалить для обоих'
            : 'Удалить только для меня'}
        </Text>
      </Button>
    </PromptShell>
  );
}

// ── Group leave dialog ───────────────────────────────────────────────
function GroupLeavePrompt({
  roomId,
  mx,
  onDone,
  onCancel,
}: {
  roomId: string;
  mx: MatrixClient;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [leaveState, leaveRoom] = useAsyncCallback<undefined, MatrixError, []>(
    useCallback(async () => {
      await mx.leave(roomId);
      await mx.forget(roomId);
    }, [mx, roomId])
  );

  useEffect(() => {
    if (leaveState.status === AsyncStatus.Success) onDone();
  }, [leaveState, onDone]);

  const loading =
    leaveState.status === AsyncStatus.Loading ||
    leaveState.status === AsyncStatus.Success;

  return (
    <PromptShell title="Покинуть чат" onCancel={onCancel}>
      <Box direction="Column" gap="200">
        <Text priority="400">Вы уверены, что хотите покинуть этот чат?</Text>
        {leaveState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T300">
            Не удалось покинуть чат: {leaveState.error.message}
          </Text>
        )}
      </Box>
      <Button
        type="submit"
        variant="Critical"
        onClick={leaveRoom}
        before={loading ? <Spinner fill="Solid" variant="Critical" size="200" /> : undefined}
        aria-disabled={loading}
      >
        <Text size="B400">{loading ? 'Выход...' : 'Покинуть'}</Text>
      </Button>
    </PromptShell>
  );
}

// ── Main export ──────────────────────────────────────────────────────
export function LeaveRoomPrompt({ roomId, onDone, onCancel }: LeaveRoomPromptProps) {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);

  // Safety: never allow leaving Избранное
  if (isSavedMessagesRoom(roomId)) {
    onCancel();
    return null;
  }

  const room = mx.getRoom(roomId);
  const isDm = mDirects.has(roomId);

  if (!room) return null;

  if (isDm) {
    return (
      <DmDeletePrompt
        room={room}
        roomId={roomId}
        mx={mx}
        onDone={onDone}
        onCancel={onCancel}
      />
    );
  }

  return <GroupLeavePrompt roomId={roomId} mx={mx} onDone={onDone} onCancel={onCancel} />;
}
