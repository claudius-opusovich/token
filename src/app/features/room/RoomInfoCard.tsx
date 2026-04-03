import React, { useState } from 'react';
import {
  Avatar,
  Icon,
  Icons,
  Text,
  Spinner,
  Line,
} from 'folds';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { useIsDirectRoom } from '../../hooks/useRoom';
import { mxcUrlToHttp, guessDmRoomUserId, getCanonicalAliasOrRoomId, isRoomAlias } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useUserPresence, Presence } from '../../hooks/useUserPresence';
import { copyToClipboard } from '../../utils/dom';
import { getMatrixToRoom } from '../../plugins/matrix-to';
import { getViaServers } from '../../plugins/via-servers';
import { LeaveRoomPrompt } from '../../components/leave-room-prompt';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import {
  getRoomNotificationMode,
  RoomNotificationMode,
  useSetRoomNotificationPreference,
  useRoomsNotificationPreferencesContext,
} from '../../hooks/useRoomsNotificationPreferences';
import { InviteUserPrompt } from '../../components/invite-user-prompt';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  loading?: boolean;
};

function ActionButton({ icon, label, onClick, danger, active, loading }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        background: active ? 'rgba(82, 136, 193, 0.18)' : 'rgba(255,255,255,0.05)',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 8px',
        flex: 1,
        cursor: 'pointer',
        color: danger ? '#e57373' : active ? '#5288c1' : 'rgba(255,255,255,0.85)',
        transition: 'background 0.15s',
        minWidth: 0,
      }}
    >
      {loading ? <Spinner size="300" variant="Secondary" /> : icon}
      <span style={{ fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
        {label}
      </span>
    </button>
  );
}

type RoomInfoCardProps = {
  room: Room;
  onClose: () => void;
};

export function RoomInfoCard({ room, onClose }: RoomInfoCardProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const direct = useIsDirectRoom();
  const space = useSpaceOptionally();
  const openSettings = useOpenRoomSettings();

  const avatarMxc = useRoomAvatar(room, direct);
  const name = useRoomName(room);
  const topic = useRoomTopic(room);
  const memberCount = room.getJoinedMemberCount();

  const avatarUrl = avatarMxc
    ? mxcUrlToHttp(mx, avatarMxc, useAuthentication, 200, 200, 'crop') ?? undefined
    : undefined;

  const dmUserId = direct ? guessDmRoomUserId(room, mx.getSafeUserId()) : undefined;
  const dmPresence = useUserPresence(dmUserId ?? '');
  const isOnline = dmPresence?.presence === Presence.Online || dmPresence?.active === true;

  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const notificationMode = getRoomNotificationMode(notificationPreferences, room.roomId);
  const { modeState, setMode } = useSetRoomNotificationPreference(room.roomId);
  const isMuted = notificationMode === RoomNotificationMode.Mute;
  const isMuteLoading = modeState.status === AsyncStatus.Loading;

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);
  const permissions = useRoomPermissions(creators, powerLevels);
  const canInvite = permissions.action('invite', mx.getSafeUserId());

  const [showLeave, setShowLeave] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const onlineCount = !direct && memberCount <= 300
    ? room.getJoinedMembers().filter((m) => {
        const u = m.user;
        return u && (u.presence === 'online' || (u as any).currentlyActive === true);
      }).length
    : 0;

  const handleMuteToggle = () => {
    if (isMuted) {
      setMode(RoomNotificationMode.Unset, notificationMode);
    } else {
      setMode(RoomNotificationMode.Mute, notificationMode);
    }
  };

  const handleCopyLink = () => {
    const roomIdOrAlias = getCanonicalAliasOrRoomId(mx, room.roomId);
    const viaServers = isRoomAlias(roomIdOrAlias) ? undefined : getViaServers(room);
    copyToClipboard(getMatrixToRoom(roomIdOrAlias, viaServers));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettings = () => {
    openSettings(room.roomId, space?.roomId);
    onClose();
  };

  // Count media in timeline
  const timeline = room.getLiveTimeline().getEvents();
  const photoCount = timeline.filter(e => e.getContent()?.msgtype === 'm.image').length;
  const videoCount = timeline.filter(e => e.getContent()?.msgtype === 'm.video').length;
  const fileCount = timeline.filter(e => e.getContent()?.msgtype === 'm.file').length;
  const audioCount = timeline.filter(e =>
    e.getContent()?.msgtype === 'm.audio' && !e.getContent()?.['org.matrix.msc3245.voice']
  ).length;
  const voiceCount = timeline.filter(e =>
    e.getContent()?.msgtype === 'm.audio' && e.getContent()?.['org.matrix.msc3245.voice']
  ).length;

  const presenceLabel = (() => {
    if (direct && dmPresence) {
      if (isOnline) return 'в сети';
      return 'не в сети';
    }
    const base = memberCount === 1 ? '1 участник' : `${memberCount} участников`;
    return onlineCount > 0 ? `${base} · ${onlineCount} онлайн` : base;
  })();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'flex-end',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '92vh',
          background: '#17212b',
          borderRadius: '16px 16px 0 0',
          overflowY: 'auto',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <Icon size="200" src={Icons.Cross} />
          </button>
        </div>

        {/* Avatar + Name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 16px 16px', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Avatar size="700" radii="Pill">
              <RoomAvatar
                roomId={room.roomId}
                src={avatarUrl}
                alt={name}
                renderFallback={() => (
                  <RoomIcon size="400" joinRule={room.getJoinRule()} roomType={room.getType()} />
                )}
              />
            </Avatar>
            {direct && isOnline && (
              <span style={{
                position: 'absolute',
                bottom: 3,
                right: 3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#3fc26d',
                border: '3px solid #17212b',
              }} />
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Text size="H4" style={{ fontWeight: 700, color: '#fff' }}>{name}</Text>
            <Text size="T300" priority="300" style={{ marginTop: 2 }}>
              {presenceLabel}
            </Text>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 16px 16px' }}>
          <ActionButton
            icon={<Icon size="300" src={isMuted ? Icons.BellCross : Icons.Bell} />}
            label={isMuted ? 'Включить' : 'Выключить'}
            onClick={handleMuteToggle}
            active={isMuted}
            loading={isMuteLoading}
          />
          {canInvite && (
            <ActionButton
              icon={<Icon size="300" src={Icons.UserPlus} />}
              label="Пригласить"
              onClick={() => setShowInvite(true)}
            />
          )}
          <ActionButton
            icon={<Icon size="300" src={copied ? Icons.CheckTwice : Icons.Link} />}
            label={copied ? 'Скопировано' : 'Ссылка'}
            onClick={handleCopyLink}
            active={copied}
          />
          <ActionButton
            icon={<Icon size="300" src={Icons.Setting} />}
            label="Настройки"
            onClick={handleSettings}
          />
          <ActionButton
            icon={<Icon size="300" src={Icons.ArrowGoLeft} />}
            label="Покинуть"
            onClick={() => setShowLeave(true)}
            danger
          />
        </div>

        {/* Topic/description */}
        {topic && (
          <>
            <Line variant="SurfaceVariant" size="300" />
            <div style={{ padding: '12px 16px' }}>
              <Text size="T200" priority="300" style={{ marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>
                Описание
              </Text>
              <Text size="T300" style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {topic}
              </Text>
            </div>
          </>
        )}

        {/* Media stats */}
        {(photoCount > 0 || videoCount > 0 || fileCount > 0 || audioCount > 0 || voiceCount > 0) && (
          <>
            <Line variant="SurfaceVariant" size="300" />
            <div style={{ padding: '12px 16px' }}>
              <Text size="T200" priority="300" style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '11px' }}>
                Медиа
              </Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
                {photoCount > 0 && (
                  <MediaStat icon={Icons.Photo} count={photoCount} label="Фото" />
                )}
                {videoCount > 0 && (
                  <MediaStat icon={Icons.VideoCamera} count={videoCount} label="Видео" />
                )}
                {fileCount > 0 && (
                  <MediaStat icon={Icons.File} count={fileCount} label="Файлы" />
                )}
                {audioCount > 0 && (
                  <MediaStat icon={Icons.Headphone} count={audioCount} label="Аудио" />
                )}
                {voiceCount > 0 && (
                  <MediaStat icon={Icons.Mic} count={voiceCount} label="Голосовые" />
                )}
              </div>
            </div>
          </>
        )}

        {/* Room ID */}
        <Line variant="SurfaceVariant" size="300" />
        <div style={{ padding: '10px 16px 4px' }}>
          <Text size="T200" priority="300">
            {room.roomId}
          </Text>
        </div>

        {/* Prompts */}
        {showInvite && (
          <InviteUserPrompt room={room} requestClose={() => setShowInvite(false)} />
        )}
        {showLeave && (
          <LeaveRoomPrompt
            roomId={room.roomId}
            onDone={onClose}
            onCancel={() => setShowLeave(false)}
          />
        )}
      </div>
    </div>
  );
}

function MediaStat({ icon, count, label }: { icon: any; count: number; label: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      padding: '10px 4px',
    }}>
      <Icon size="200" src={icon} />
      <Text size="T300" style={{ fontWeight: 600 }}>{count}</Text>
      <Text size="T200" priority="300">{label}</Text>
    </div>
  );
}
