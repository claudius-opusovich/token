import React, { useCallback, useRef } from 'react';
import { MessageSelectionProvider, useMessageSelection } from './MessageSelectionContext';
import { Box, Icon, IconButton, Icons, Text, config } from 'folds';
import { EventType } from 'matrix-js-sdk';
import { ReactEditor } from 'slate-react';
import { isKeyHotkey } from 'is-hotkey';
import { useStateEvent } from '../../hooks/useStateEvent';
import { StateEvent } from '../../../types/matrix/room';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useEditor } from '../../components/editor';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { RoomTimeline } from './RoomTimeline';
import { RoomViewTyping } from './RoomViewTyping';
import { RoomTombstone } from './RoomTombstone';
import { RoomInput } from './RoomInput';
import { RoomViewFollowing, RoomViewFollowingPlaceholder } from './RoomViewFollowing';
import { Page } from '../../components/page';
import { useKeyDown } from '../../hooks/useKeyDown';
import { editableActiveElement } from '../../utils/dom';
import { settingsAtom } from '../../state/settings';
import { useSetting } from '../../state/hooks/settings';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoom } from '../../hooks/useRoom';

const FN_KEYS_REGEX = /^F\d+$/;
const shouldFocusMessageField = (evt: KeyboardEvent): boolean => {
  const { code } = evt;
  if (evt.metaKey || evt.altKey || evt.ctrlKey) {
    return false;
  }

  if (FN_KEYS_REGEX.test(code)) return false;

  if (
    code.startsWith('OS') ||
    code.startsWith('Meta') ||
    code.startsWith('Shift') ||
    code.startsWith('Alt') ||
    code.startsWith('Control') ||
    code.startsWith('Arrow') ||
    code.startsWith('Page') ||
    code.startsWith('End') ||
    code.startsWith('Home') ||
    code === 'Tab' ||
    code === 'Space' ||
    code === 'Enter' ||
    code === 'NumLock' ||
    code === 'ScrollLock'
  ) {
    return false;
  }

  return true;
};

function SelectionBar({ roomId }: { roomId: string }) {
  const mx = useMatrixClient();
  const selection = useMessageSelection();
  if (!selection.active) return null;

  const count = selection.selected.size;

  const handleDelete = async () => {
    const ids = [...selection.selected];
    selection.clear();
    for (const eventId of ids) {
      try {
        await mx.redactEvent(roomId, eventId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: `${config.space.S300} ${config.space.S400}`,
        background: '#17212b',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      }}
      alignItems="Center"
      justifyContent="SpaceBetween"
      gap="300"
    >
      <IconButton size="300" variant="SurfaceVariant" radii="300" onClick={selection.clear}>
        <Icon src={Icons.Cross} size="100" />
      </IconButton>
      <Text size="B400">{count} выбрано</Text>
      <IconButton
        size="300"
        variant="Critical"
        radii="300"
        onClick={handleDelete}
        aria-label="Удалить выбранные"
      >
        <Icon src={Icons.Delete} size="100" />
      </IconButton>
    </Box>
  );
}

export function RoomView({ eventId }: { eventId?: string }) {
  const roomInputRef = useRef<HTMLDivElement>(null);
  const roomViewRef = useRef<HTMLDivElement>(null);

  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');

  const room = useRoom();
  const { roomId } = room;
  const editor = useEditor();

  const mx = useMatrixClient();

  const tombstoneEvent = useStateEvent(room, StateEvent.RoomTombstone);
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canMessage = permissions.event(EventType.RoomMessage, mx.getSafeUserId());

  useKeyDown(
    window,
    useCallback(
      (evt) => {
        if (editableActiveElement()) return;
        const portalContainer = document.getElementById('portalContainer');
        if (portalContainer && portalContainer.children.length > 0) {
          return;
        }
        if (shouldFocusMessageField(evt) || isKeyHotkey('mod+v', evt)) {
          ReactEditor.focus(editor);
        }
      },
      [editor]
    )
  );

  return (
    <MessageSelectionProvider>
      <SelectionBar roomId={roomId} />
      <Page ref={roomViewRef}>
        <Box grow="Yes" direction="Column" className="chat-bg">
          <RoomTimeline
            key={roomId}
            room={room}
            eventId={eventId}
            roomInputRef={roomInputRef}
            editor={editor}
          />
          <RoomViewTyping room={room} />
        </Box>
        <Box shrink="No" direction="Column">
          <div style={{ padding: `0 ${config.space.S400}` }}>
            {tombstoneEvent ? (
              <RoomTombstone
                roomId={roomId}
                body={tombstoneEvent.getContent().body}
                replacementRoomId={tombstoneEvent.getContent().replacement_room}
              />
            ) : (
              <>
                {canMessage && (
                  <RoomInput
                    room={room}
                    editor={editor}
                    roomId={roomId}
                    fileDropContainerRef={roomViewRef}
                    ref={roomInputRef}
                  />
                )}
                {!canMessage && (
                  <RoomInputPlaceholder
                    style={{ padding: config.space.S200 }}
                    alignItems="Center"
                    justifyContent="Center"
                  >
                    <Text align="Center">У вас нет прав для отправки сообщений в этой комнате</Text>
                  </RoomInputPlaceholder>
                )}
              </>
            )}
          </div>
          {hideActivity ? <RoomViewFollowingPlaceholder /> : <RoomViewFollowing room={room} />}
        </Box>
      </Page>
    </MessageSelectionProvider>
  );
}
