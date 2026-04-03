import React, { MouseEventHandler, forwardRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Avatar,
  Text,
  Overlay,
  OverlayCenter,
  OverlayBackdrop,
  IconButton,
  Icon,
  Icons,
  Tooltip,
  TooltipProvider,
  Menu,
  MenuItem,
  toRem,
  config,
  Line,
  PopOut,
  RectCords,
  Badge,
  Spinner,
} from 'folds';
import { useNavigate } from 'react-router-dom';
import { Room } from 'matrix-js-sdk';
import { useStateEvent } from '../../hooks/useStateEvent';
import { PageHeader } from '../../components/page';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { StateEvent } from '../../../types/matrix/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { getHomeSearchPath, getSpaceSearchPath, withSearchParam } from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId, isRoomAlias, mxcUrlToHttp } from '../../utils/matrix';
import { _SearchPathSearchParams } from '../../pages/paths';
import * as css from './RoomViewHeader.css';
import { useRoomUnread } from '../../state/hooks/unread';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { markAsRead } from '../../utils/notifications';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { copyToClipboard } from '../../utils/dom';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { stopPropagation } from '../../utils/keyboard';
import { getMatrixToRoom, getMatrixToUser } from '../../plugins/matrix-to';
import { getViaServers } from '../../plugins/via-servers';
import { BackRouteHandler } from '../../components/BackRouteHandler';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useRoomPinnedEvents } from '../../hooks/useRoomPinnedEvents';
import { RoomPinMenu } from './room-pin-menu';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useSetAtom } from 'jotai';
import { setRoomWallpaperAtom } from '../../state/roomWallpapers';
import { isSavedMessagesRoom } from '../../utils/savedMessages';
import { RoomNotificationModeSwitcher } from '../../components/RoomNotificationSwitcher';
import {
  getRoomNotificationMode,
  getRoomNotificationModeIcon,
  useRoomsNotificationPreferencesContext,
} from '../../hooks/useRoomsNotificationPreferences';
import { JumpToTime } from './jump-to-time';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { RoomSettingsPage } from '../../state/roomSettings';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { TypingIndicator } from '../../components/typing-indicator';
import { Presence, useUserPresence } from '../../hooks/useUserPresence';
import { guessDmRoomUserId } from '../../utils/matrix';
import { RoomInfoCard } from './RoomInfoCard';
import { useCallStart, useCallEmbed } from '../../hooks/useCallEmbed';
import { useCallPreferencesAtom } from '../../state/hooks/callPreferences';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { livekitSupport } from '../../hooks/useLivekitSupport';
import { useCallMembers, useCallSession } from '../../hooks/useCall';
import { useAtomValue } from 'jotai';

type RoomMenuProps = {
  room: Room;
  requestClose: () => void;
};
const WALLPAPER_PRESETS = [
  { label: 'По умолчанию', value: null },
  { label: '🌌 Тёмно-синий', value: 'radial-gradient(circle, #1a2b3c 1.5px, transparent 1.5px) 0 0 / 22px 22px, #0e1621' },
  { label: '🌊 Глубокий синий', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  { label: '🌆 Закат', value: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' },
  { label: '🌿 Тёмный лес', value: 'linear-gradient(135deg, #0a1628 0%, #0d2137 50%, #0f2b1e 100%)' },
  { label: '🌑 Чёрный', value: '#0d0d0d' },
];

const RoomMenu = forwardRef<HTMLDivElement, RoomMenuProps>(({ room, requestClose }, ref) => {
  const mx = useMatrixClient();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const unread = useRoomUnread(room.roomId, roomToUnreadAtom);
  const setWallpaper = useSetAtom(setRoomWallpaperAtom);
  const [showWallpaperPicker, setShowWallpaperPicker] = React.useState(false);
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canInvite = permissions.action('invite', mx.getSafeUserId());
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const notificationMode = getRoomNotificationMode(notificationPreferences, room.roomId);
  const { navigateRoom } = useRoomNavigate();

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

  const openSettings = useOpenRoomSettings();
  const parentSpace = useSpaceOptionally();
  const handleOpenSettings = () => {
    openSettings(room.roomId, parentSpace?.roomId);
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      {invitePrompt && (
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
          onClick={() => setShowWallpaperPicker(!showWallpaperPicker)}
          size="300"
          after={<Icon size="100" src={Icons.Photo} />}
          radii="300"
          aria-pressed={showWallpaperPicker}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Обои чата
          </Text>
        </MenuItem>
        {showWallpaperPicker && (
          <Box direction="Column" gap="100" style={{ padding: `0 ${config.space.S100} ${config.space.S100}` }}>
            {WALLPAPER_PRESETS.map((preset) => (
              <MenuItem
                key={preset.label}
                size="300"
                radii="300"
                before={
                  <div style={{
                    width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                    background: preset.value ?? 'radial-gradient(circle, #1a2b3c 1.5px, transparent 1.5px) 0 0 / 12px 12px, #0e1621',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }} />
                }
                onClick={() => {
                  setWallpaper({ roomId: room.roomId, value: preset.value });
                  requestClose();
                }}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  {preset.label}
                </Text>
              </MenuItem>
            ))}
          </Box>
        )}
        <MenuItem
          onClick={handleOpenSettings}
          size="300"
          after={<Icon size="100" src={Icons.Setting} />}
          radii="300"
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Настройки чата
          </Text>
        </MenuItem>
        <UseStateProvider initial={false}>
          {(promptJump, setPromptJump) => (
            <>
              <MenuItem
                onClick={() => setPromptJump(true)}
                size="300"
                after={<Icon size="100" src={Icons.RecentClock} />}
                radii="300"
                aria-pressed={promptJump}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  Перейти к дате
                </Text>
              </MenuItem>
              {promptJump && (
                <JumpToTime
                  onSubmit={(eventId) => {
                    setPromptJump(false);
                    navigateRoom(room.roomId, eventId);
                    requestClose();
                  }}
                  onCancel={() => setPromptJump(false)}
                />
              )}
            </>
          )}
        </UseStateProvider>
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
});

export function RoomViewHeader({ callView }: { callView?: boolean }) {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const screenSize = useScreenSizeContext();
  const room = useRoom();
  const space = useSpaceOptionally();
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const [pinMenuAnchor, setPinMenuAnchor] = useState<RectCords>();
  const [showInfoCard, setShowInfoCard] = useState(false);
  const direct = useIsDirectRoom();

  const pinnedEvents = useRoomPinnedEvents(room);
  const encryptionEvent = useStateEvent(room, StateEvent.RoomEncryption);
  const encryptedRoom = !!encryptionEvent;
  const avatarMxc = useRoomAvatar(room, direct);
  const name = useRoomName(room);
  const topic = useRoomTopic(room);
  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  const [peopleDrawer, setPeopleDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const typingMembers = useRoomTypingMember(room.roomId).filter(
    (r) => r.userId !== mx.getUserId()
  );
  const memberCount = room.getJoinedMemberCount();

  const dmUserId = direct ? guessDmRoomUserId(room, mx.getSafeUserId()) : undefined;
  const isSelfChat = isSavedMessagesRoom(room.roomId) || (direct && dmUserId === mx.getSafeUserId());
  const displayName = isSelfChat ? 'Избранное' : name;
  const dmPresence = useUserPresence(isSelfChat ? '' : (dmUserId ?? ''));

  // Call support
  const startCall = useCallStart(direct);
  const callEmbed = useCallEmbed();
  const callPref = useAtomValue(useCallPreferencesAtom());
  const autoDiscoveryInfo = useAutoDiscoveryInfo();
  const callSession = useCallSession(room);
  const callMembers = useCallMembers(room, callSession);
  const canCall = !isSelfChat && direct && (livekitSupport(autoDiscoveryInfo) || callMembers.length > 0);
  const handleStartCall = () => {
    if (!canCall || callEmbed) return;
    startCall(room, callPref);
  };

  // Count online members for group chats (skip large rooms for perf)
  const onlineCount = !direct && memberCount <= 300
    ? room.getJoinedMembers().filter((m) => {
        const u = m.user;
        return u && (u.presence === 'online' || (u as any).currentlyActive === true);
      }).length
    : 0;

  const presenceLabel = (() => {
    if (!direct || !dmPresence) {
      const base = `${memberCount} участников`;
      return onlineCount > 0 ? `${base}, ${onlineCount} онлайн` : base;
    }
    if (dmPresence.presence === Presence.Online || dmPresence.active) return 'в сети';
    if (dmPresence.lastActiveTs) {
      const diffMs = Date.now() - dmPresence.lastActiveTs;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'только что в сети';
      if (diffMin < 60) return `был(а) в сети ${diffMin} мин назад`;
      const diffH = Math.floor(diffMin / 60);
      if (diffH < 24) return `был(а) в сети ${diffH} ч назад`;
      const diffD = Math.floor(diffH / 24);
      return `был(а) в сети ${diffD} дн назад`;
    }
    return 'не в сети';
  })();

  const handleSearchClick = () => {
    const searchParams: _SearchPathSearchParams = {
      rooms: room.roomId,
    };
    const path = space
      ? getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))
      : getHomeSearchPath();
    navigate(withSearchParam(path, searchParams));
  };

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const handleOpenPinMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setPinMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  const openSettings = useOpenRoomSettings();
  const parentSpace = useSpaceOptionally();
  const handleMemberToggle = () => {
    if (callView) {
      openSettings(room.roomId, parentSpace?.roomId, RoomSettingsPage.MembersPage);
      return;
    }
    setPeopleDrawer(!peopleDrawer);
  };

  const latestPinnedEvent = pinnedEvents.length > 0
    ? room.findEventById(pinnedEvents[pinnedEvents.length - 1])
    : undefined;
  const pinnedPreview = latestPinnedEvent?.getContent()?.body as string | undefined;

  return (
    <>
    <PageHeader
      className={ContainerColor({ variant: 'Surface' })}
      balance={screenSize === ScreenSize.Mobile}
    >
      <Box grow="Yes" gap="300">
        {screenSize === ScreenSize.Mobile && (
          <BackRouteHandler>
            {(onBack) => (
              <Box shrink="No" alignItems="Center">
                <IconButton fill="None" onClick={onBack}>
                  <Icon src={Icons.ArrowLeft} />
                </IconButton>
              </Box>
            )}
          </BackRouteHandler>
        )}
        <Box
          grow="Yes"
          alignItems="Center"
          gap="300"
          style={{ cursor: 'pointer', minWidth: 0 }}
          onClick={() => setShowInfoCard(true)}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar size="400" radii="Pill">
              {isSelfChat ? (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  background: '#2AABEE',
                  borderRadius: '50%',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21L12 18L5 21Z" fill="#fff"/>
                  </svg>
                </span>
              ) : (
                <RoomAvatar
                  roomId={room.roomId}
                  src={avatarUrl}
                  alt={displayName}
                  renderFallback={() => (
                    <RoomIcon size="200" joinRule={room.getJoinRule()} roomType={room.getType()} />
                  )}
                />
              )}
            </Avatar>
            {!isSelfChat && direct && dmPresence && (dmPresence.presence === Presence.Online || dmPresence.active) && (
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
          <Box direction="Column" style={{ minWidth: 0 }}>
            <Text size="H5" truncate>
              {displayName}
            </Text>
            <Text size="T200" priority="300" truncate>
              {isSelfChat ? (
                <span>сохраняйте сообщения и медиа</span>
              ) : typingMembers.length > 0 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <TypingIndicator size="300" disableAnimation />
                  <span>печатает...</span>
                </span>
              ) : (
                presenceLabel
              )}
            </Text>
          </Box>
        </Box>

        <Box shrink="No">
          {/* Search */}
          <TooltipProvider
            position="Bottom"
            offset={4}
            tooltip={<Tooltip><Text>Поиск</Text></Tooltip>}
          >
            {(triggerRef) => (
              <IconButton fill="None" ref={triggerRef} onClick={handleSearchClick}>
                <Icon size="400" src={Icons.Search} />
              </IconButton>
            )}
          </TooltipProvider>

          {/* Phone call — shown for DMs */}
          {!isSelfChat && direct && (
            <TooltipProvider
              position="Bottom"
              offset={4}
              tooltip={<Tooltip><Text>{callEmbed ? 'Уже в звонке' : 'Позвонить'}</Text></Tooltip>}
            >
              {(triggerRef) => (
                <IconButton
                  fill="None"
                  ref={triggerRef}
                  onClick={handleStartCall}
                  disabled={!canCall || !!callEmbed}
                  aria-label="Позвонить"
                >
                  <Icon size="400" src={Icons.Phone} />
                </IconButton>
              )}
            </TooltipProvider>
          )}

          {/* Members / panel toggle */}
          {screenSize === ScreenSize.Desktop && (
            <TooltipProvider
              position="Bottom"
              offset={4}
              tooltip={
                <Tooltip>
                  <Text>{peopleDrawer ? 'Скрыть участников' : 'Показать участников'}</Text>
                </Tooltip>
              }
            >
              {(triggerRef) => (
                <IconButton
                  fill="None"
                  ref={triggerRef}
                  onClick={handleMemberToggle}
                  aria-pressed={peopleDrawer}
                >
                  {/* Panel/sidebar icon matching Telegram */}
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ opacity: peopleDrawer ? 1 : 0.7 }}>
                    <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <line x1="13" y1="3.5" x2="13" y2="16.5" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                </IconButton>
              )}
            </TooltipProvider>
          )}

          {/* Three dots menu */}
          <TooltipProvider
            position="Bottom"
            align="End"
            offset={4}
            tooltip={<Tooltip><Text>Ещё</Text></Tooltip>}
          >
            {(triggerRef) => (
              <IconButton
                fill="None"
                onClick={handleOpenMenu}
                ref={triggerRef}
                aria-pressed={!!menuAnchor}
              >
                <Icon size="400" src={Icons.VerticalDots} filled={!!menuAnchor} />
              </IconButton>
            )}
          </TooltipProvider>
          <PopOut
            anchor={menuAnchor}
            position="Bottom"
            align="End"
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
                <RoomMenu room={room} requestClose={() => setMenuAnchor(undefined)} />
              </FocusTrap>
            }
          />
          {/* Pin menu popup — triggered by the pinned banner below the header */}
          <PopOut
            anchor={pinMenuAnchor}
            position="Bottom"
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  returnFocusOnDeactivate: false,
                  onDeactivate: () => setPinMenuAnchor(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                  isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <RoomPinMenu room={room} requestClose={() => setPinMenuAnchor(undefined)} />
              </FocusTrap>
            }
          />
        </Box>
      </Box>
    </PageHeader>
    {pinnedEvents.length > 0 && (
      <button
        type="button"
        className={css.PinnedBanner}
        onClick={handleOpenPinMenu}
      >
        <Icon size="100" src={Icons.Pin} filled />
        <Text size="T300" truncate style={{ flexGrow: 1, textAlign: 'left' }}>
          {pinnedPreview ?? 'Закреплённое сообщение'}
        </Text>
        {pinnedEvents.length > 1 && (
          <Text size="T200" priority="300">
            {pinnedEvents.length}
          </Text>
        )}
      </button>
    )}
    {showInfoCard && (
      <RoomInfoCard room={room} onClose={() => setShowInfoCard(false)} />
    )}
    </>
  );
}
