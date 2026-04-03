import React, { MouseEventHandler, TouchEventHandler, forwardRef, useRef, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import {
  Avatar,
  Box,
  Icon,
  IconButton,
  Icons,
  Text,
  Menu,
  MenuItem,
  config,
  PopOut,
  toRem,
  Line,
  RectCords,
  Badge,
  Spinner,
} from 'folds';
import { useFocusWithin, useHover } from 'react-aria';
import FocusTrap from 'focus-trap-react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { pinnedRoomsAtom, togglePinnedRoomAtom } from '../../state/pinnedRooms';
import { NavItem, NavItemContent, NavItemOptions, NavLink } from '../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { getDirectRoomAvatarUrl, getRoomAvatarUrl } from '../../utils/room';
import { nameInitials } from '../../utils/common';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomUnread } from '../../state/hooks/unread';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { usePowerLevels } from '../../hooks/usePowerLevels';
import { copyToClipboard } from '../../utils/dom';
import { markAsRead } from '../../utils/notifications';
import { UseStateProvider } from '../../components/UseStateProvider';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { TypingIndicator } from '../../components/typing-indicator';
import { stopPropagation } from '../../utils/keyboard';
import { getMatrixToRoom } from '../../plugins/matrix-to';
import { getCanonicalAliasOrRoomId, guessDmRoomUserId, isRoomAlias } from '../../utils/matrix';
import { useUserPresence, Presence } from '../../hooks/useUserPresence';
import { getViaServers } from '../../plugins/via-servers';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import {
  getRoomNotificationModeIcon,
  RoomNotificationMode,
} from '../../hooks/useRoomsNotificationPreferences';
import { RoomNotificationModeSwitcher } from '../../components/RoomNotificationSwitcher';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { useRoomName } from '../../hooks/useRoomMeta';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { useCallEmbed, useCallStart } from '../../hooks/useCallEmbed';
import { callChatAtom } from '../../state/callEmbed';
import { useCallPreferencesAtom } from '../../state/hooks/callPreferences';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { livekitSupport } from '../../hooks/useLivekitSupport';
import { useRoomLastMessage } from '../../hooks/useRoomLastMessage';
import { roomIdToMsgDraftAtomFamily } from '../../state/room/roomInputDrafts';
import { Descendant } from 'slate';
import dayjs from 'dayjs';

function getDraftText(nodes: Descendant[]): string {
  return nodes.reduce((acc: string, node: Descendant) => {
    if ('text' in node) return acc + (node as { text: string }).text;
    if ('children' in node) return acc + getDraftText((node as { children: Descendant[] }).children);
    return acc;
  }, '');
}

type RoomNavItemMenuProps = {
  room: Room;
  requestClose: () => void;
  notificationMode?: RoomNotificationMode;
  isPinned: boolean;
  onTogglePin: () => void;
};
const RoomNavItemMenu = forwardRef<HTMLDivElement, RoomNavItemMenuProps>(
  ({ room, requestClose, notificationMode, isPinned, onTogglePin }, ref) => {
    const mx = useMatrixClient();
    const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
    const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
    const powerLevels = usePowerLevels(room);
    const creators = useRoomCreators(room);

    const permissions = useRoomPermissions(creators, powerLevels);
    const canInvite = permissions.action('invite', mx.getSafeUserId());
    const openRoomSettings = useOpenRoomSettings();
    const space = useSpaceOptionally();

    const [invitePrompt, setInvitePrompt] = useState(false);

    const handleMarkAsRead = () => {
      markAsRead(mx, room.roomId, hideActivity);
      requestClose();
    };

    const handleInvite = () => {
      setInvitePrompt(true);
    };

    const handleCopyLink = () => {
      const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, room.roomId);
      const viaServers = isRoomAlias(roomIdOrAlias) ? undefined : getViaServers(room);
      copyToClipboard(getMatrixToRoom(roomIdOrAlias, viaServers));
      requestClose();
    };

    const handleRoomSettings = () => {
      openRoomSettings(room.roomId, space?.roomId);
      requestClose();
    };

    return (
      <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
        {invitePrompt && room && (
          <InviteUserPrompt
            room={room}
            requestClose={() => {
              setInvitePrompt(false);
              requestClose();
            }}
          />
        )}
        <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
          <MenuItem
            onClick={() => { onTogglePin(); requestClose(); }}
            size="300"
            after={<Icon size="100" src={Icons.Pin} />}
            radii="300"
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              {isPinned ? 'Открепить' : 'Закрепить'}
            </Text>
          </MenuItem>
          <MenuItem
            onClick={handleMarkAsRead}
            size="300"
            after={<Icon size="100" src={Icons.CheckTwice} />}
            radii="300"
            disabled={!unread}
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Отметить как прочитанное
            </Text>
          </MenuItem>
          <RoomNotificationModeSwitcher roomId={room.roomId} value={notificationMode}>
            {(handleOpen, opened, changing) => (
              <MenuItem
                size="300"
                after={
                  changing ? (
                    <Spinner size="100" variant="Secondary" />
                  ) : (
                    <Icon size="100" src={getRoomNotificationModeIcon(notificationMode)} />
                  )
                }
                radii="300"
                aria-pressed={opened}
                onClick={handleOpen}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  Уведомления
                </Text>
              </MenuItem>
            )}
          </RoomNotificationModeSwitcher>
        </Box>
        <Line variant="Surface" size="300" />
        <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
          <MenuItem
            onClick={handleInvite}
            variant="Primary"
            fill="None"
            size="300"
            after={<Icon size="100" src={Icons.UserPlus} />}
            radii="300"
            aria-pressed={invitePrompt}
            disabled={!canInvite}
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Пригласить
            </Text>
          </MenuItem>
          <MenuItem
            onClick={handleCopyLink}
            size="300"
            after={<Icon size="100" src={Icons.Link} />}
            radii="300"
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Копировать ссылку
            </Text>
          </MenuItem>
          <MenuItem
            onClick={handleRoomSettings}
            size="300"
            after={<Icon size="100" src={Icons.Setting} />}
            radii="300"
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Настройки чата
            </Text>
          </MenuItem>
        </Box>
        <Line variant="Surface" size="300" />
        <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
          <UseStateProvider initial={false}>
            {(promptLeave, setPromptLeave) => (
              <>
                <MenuItem
                  onClick={() => setPromptLeave(true)}
                  variant="Critical"
                  fill="None"
                  size="300"
                  after={<Icon size="100" src={Icons.ArrowGoLeft} />}
                  radii="300"
                  aria-pressed={promptLeave}
                >
                  <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                    Покинуть чат
                  </Text>
                </MenuItem>
                {promptLeave && (
                  <LeaveRoomPrompt
                    roomId={room.roomId}
                    onDone={requestClose}
                    onCancel={() => setPromptLeave(false)}
                  />
                )}
              </>
            )}
          </UseStateProvider>
        </Box>
      </Menu>
    );
  }
);

function CallChatToggle() {
  const [chat, setChat] = useAtom(callChatAtom);

  return (
    <IconButton
      onClick={() => setChat(!chat)}
      aria-pressed={chat}
      aria-label="Открыть чат"
      variant="Background"
      fill="None"
      size="300"
      radii="300"
    >
      <Icon size="50" src={Icons.Message} filled={chat} />
    </IconButton>
  );
}

type RoomNavItemProps = {
  room: Room;
  selected: boolean;
  linkPath: string;
  notificationMode?: RoomNotificationMode;
  showAvatar?: boolean;
  direct?: boolean;
};
export function RoomNavItem({
  room,
  selected,
  showAvatar,
  direct,
  notificationMode,
  linkPath,
}: RoomNavItemProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const dmUserId = direct ? guessDmRoomUserId(room, mx.getSafeUserId()) : undefined;
  const dmPresence = useUserPresence(dmUserId ?? '');
  const isOnline = dmPresence?.presence === Presence.Online || dmPresence?.active === true;
  const pinnedRooms = useAtomValue(pinnedRoomsAtom);
  const togglePin = useSetAtom(togglePinnedRoomAtom);
  const isPinned = pinnedRooms.includes(room.roomId);
  const [hover, setHover] = useState(false);
  const { hoverProps } = useHover({ onHoverChange: setHover });
  const { focusWithinProps } = useFocusWithin({ onFocusWithinChange: setHover });
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
  const typingMember = useRoomTypingMember(room.roomId).filter(
    (receipt) => receipt.userId !== mx.getUserId()
  );

  const roomName = useRoomName(room);
  const lastMessage = useRoomLastMessage(room, mx);
  const msgDraftAtom = roomIdToMsgDraftAtomFamily(room.roomId);
  const msgDraft = useAtomValue(msgDraftAtom);
  const draftText = getDraftText(msgDraft).trim();

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleContextMenu: MouseEventHandler<HTMLElement> = (evt) => {
    evt.preventDefault();
    setMenuAnchor({
      x: evt.clientX,
      y: evt.clientY,
      width: 0,
      height: 0,
    });
  };

  const handleTouchStart: TouchEventHandler<HTMLElement> = (evt) => {
    const touch = evt.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      setMenuAnchor({
        x: touch.clientX,
        y: touch.clientY,
        width: 0,
        height: 0,
      });
    }, 500);
  };

  const handleTouchEnd: TouchEventHandler<HTMLElement> = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  };

  const handleTouchMove: TouchEventHandler<HTMLElement> = (evt) => {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const touch = evt.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    // Cancel long press if user scrolls
    if (dx > 8 || dy > 8) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const optionsVisible = hover || !!menuAnchor;
  const callSession = useCallSession(room);
  const callMembers = useCallMembers(room, callSession);
  const startCall = useCallStart(direct);
  const callEmbed = useCallEmbed();
  const callPref = useAtomValue(useCallPreferencesAtom());
  const autoDiscoveryInfo = useAutoDiscoveryInfo();

  const handleStartCall: MouseEventHandler<HTMLAnchorElement> = (evt) => {
    // Do not join if no livekit support or call is not started by others
    if (!livekitSupport(autoDiscoveryInfo) && callMembers.length === 0) {
      return;
    }

    // Do not join if already in call
    if (callEmbed) {
      return;
    }
    // Start call in second click
    if (selected) {
      evt.preventDefault();
      startCall(room, callPref);
    }
  };

  return (
    <NavItem
      variant="Background"
      radii="400"
      highlight={unread !== undefined}
      aria-selected={selected}
      data-hover={!!menuAnchor}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      {...hoverProps}
      {...focusWithinProps}
    >
      <NavLink to={linkPath} onClick={room.isCallRoom() ? handleStartCall : undefined}>
        <NavItemContent>
          <Box as="span" grow="Yes" alignItems="Center" gap="300">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar size="400" radii="Pill" style={{ width: 54, height: 54 }}>
                {showAvatar ? (
                  <RoomAvatar
                    roomId={room.roomId}
                    src={
                      direct
                        ? getDirectRoomAvatarUrl(mx, room, 96, useAuthentication)
                        : getRoomAvatarUrl(mx, room, 96, useAuthentication)
                    }
                    alt={roomName}
                    renderFallback={() => (
                      <Text as="span" size="H5">
                        {nameInitials(roomName)}
                      </Text>
                    )}
                  />
                ) : (
                  <RoomIcon
                    style={{
                      opacity: unread ? config.opacity.P500 : config.opacity.P300,
                    }}
                    filled={selected}
                    size="200"
                    joinRule={room.getJoinRule()}
                    roomType={room.getType()}
                  />
                )}
              </Avatar>
              {direct && dmPresence && isOnline && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    right: 1,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#3fc26d',
                    border: '2px solid var(--bg-surface, #17212b)',
                    display: 'block',
                  }}
                />
              )}
            </div>
            <Box as="span" grow="Yes" direction="Column" gap="100" style={{ minWidth: 0, overflow: 'hidden' }}>
              <Box as="span" alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Text
                  priority={unread ? '500' : '300'}
                  as="span"
                  size="T400"
                  truncate
                  style={{ fontWeight: unread ? 600 : 400 }}
                >
                  {roomName}
                </Text>
                <Box as="span" shrink="No" alignItems="Center" gap="100">
                  {isPinned && (
                    <Icon size="50" src={Icons.Pin} style={{ opacity: 0.45 }} />
                  )}
                  {lastMessage && (
                    <Text as="span" size="T200" priority="300" style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      {lastMessage.isOutgoing && (
                        <span style={{
                          fontSize: '13px',
                          color: lastMessage.isRead ? '#4fc3f7' : 'rgba(255,255,255,0.45)',
                          lineHeight: 1,
                        }}>
                          {lastMessage.isRead ? '✓✓' : '✓'}
                        </span>
                      )}
                      {dayjs(lastMessage.timestamp).format('HH:mm')}
                    </Text>
                  )}
                </Box>
              </Box>
              <Box as="span" alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Text as="span" size="T200" priority="300" truncate style={{ minWidth: 0 }}>
                  {typingMember.length > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <TypingIndicator size="300" disableAnimation />
                      <span>печатает...</span>
                    </span>
                  ) : draftText ? (
                    <span>
                      <span style={{ color: '#e57373', fontWeight: 500 }}>Черновик: </span>
                      <span style={{ opacity: 0.75 }}>{draftText}</span>
                    </span>
                  ) : lastMessage ? (
                    <span>
                      {!direct && <span style={{ fontWeight: 500 }}>{lastMessage.senderName}: </span>}
                      {lastMessage.preview}
                    </span>
                  ) : null}
                </Text>
                <Box as="span" shrink="No" alignItems="Center" gap="100">
                  {notificationMode !== RoomNotificationMode.Unset && (
                    <Icon
                      size="50"
                      src={getRoomNotificationModeIcon(notificationMode)}
                      aria-label={notificationMode}
                    />
                  )}
                  {unread && (
                    <UnreadBadgeCenter>
                      <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
                    </UnreadBadgeCenter>
                  )}
                </Box>
              </Box>
            </Box>
            {room.isCallRoom() && callMembers.length > 0 && (
              <Badge variant="Critical" fill="Solid" size="400">
                <Text as="span" size="L400" truncate>
                  {callMembers.length} Прямой эфир
                </Text>
              </Badge>
            )}
          </Box>
        </NavItemContent>
      </NavLink>
      {optionsVisible && (
        <NavItemOptions>
          {selected && (callEmbed?.roomId === room.roomId || room.isCallRoom()) && (
            <CallChatToggle />
          )}
          <PopOut
            id={`menu-${room.roomId}`}
            aria-expanded={!!menuAnchor}
            anchor={menuAnchor}
            offset={menuAnchor?.width === 0 ? 0 : undefined}
            alignOffset={menuAnchor?.width === 0 ? 0 : -5}
            position="Bottom"
            align={menuAnchor?.width === 0 ? 'Start' : 'End'}
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  returnFocusOnDeactivate: false,
                  onDeactivate: () => setMenuAnchor(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <RoomNavItemMenu
                  room={room}
                  requestClose={() => setMenuAnchor(undefined)}
                  notificationMode={notificationMode}
                  isPinned={isPinned}
                  onTogglePin={() => togglePin(room.roomId)}
                />
              </FocusTrap>
            }
          >
            <IconButton
              onClick={handleOpenMenu}
              aria-pressed={!!menuAnchor}
              aria-controls={`menu-${room.roomId}`}
              aria-label="Ещё"
              variant="Background"
              fill="None"
              size="300"
              radii="300"
            >
              <Icon size="50" src={Icons.VerticalDots} />
            </IconButton>
          </PopOut>
        </NavItemOptions>
      )}
    </NavItem>
  );
}
