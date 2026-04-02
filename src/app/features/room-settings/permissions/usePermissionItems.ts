import { useMemo } from 'react';
import { MessageEvent, StateEvent } from '../../../../types/matrix/room';
import { PermissionGroup } from '../../common-settings/permissions';

export const usePermissionGroups = (isCallRoom: boolean): PermissionGroup[] => {
  const groups: PermissionGroup[] = useMemo(() => {
    const messagesGroup: PermissionGroup = {
      name: 'Сообщения',
      items: [
        {
          location: {
            key: MessageEvent.RoomMessage,
          },
          name: 'Отправлять сообщения',
        },
        {
          location: {
            key: MessageEvent.Sticker,
          },
          name: 'Отправлять стикеры',
        },
        {
          location: {
            key: MessageEvent.Reaction,
          },
          name: 'Ставить реакции',
        },
        {
          location: {
            notification: true,
            key: 'room',
          },
          name: 'Упоминать @room',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPinnedEvents,
          },
          name: 'Закреплять сообщения',
        },
        {
          location: {},
          name: 'Прочие события',
        },
      ],
    };

    const callSettingsGroup: PermissionGroup = {
      name: 'Звонки',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.GroupCallMemberPrefix,
          },
          name: 'Присоединяться к звонку',
        },
      ],
    };

    const moderationGroup: PermissionGroup = {
      name: 'Модерация',
      items: [
        {
          location: {
            action: true,
            key: 'invite',
          },
          name: 'Приглашать',
        },
        {
          location: {
            action: true,
            key: 'kick',
          },
          name: 'Кикать',
        },
        {
          location: {
            action: true,
            key: 'ban',
          },
          name: 'Банить',
        },
        {
          location: {
            action: true,
            key: 'redact',
          },
          name: 'Удалять сообщения других',
        },
        {
          location: {
            key: MessageEvent.RoomRedaction,
          },
          name: 'Удалять свои сообщения',
        },
      ],
    };

    const roomOverviewGroup: PermissionGroup = {
      name: 'Описание комнаты',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomAvatar,
          },
          name: 'Аватар комнаты',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomName,
          },
          name: 'Название комнаты',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTopic,
          },
          name: 'Тема комнаты',
        },
      ],
    };

    const roomSettingsGroup: PermissionGroup = {
      name: 'Настройки',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomJoinRules,
          },
          name: 'Изменять доступ',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomCanonicalAlias,
          },
          name: 'Публиковать адрес',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomPowerLevels,
          },
          name: 'Изменять все права',
        },
        {
          location: {
            state: true,
            key: StateEvent.PowerLevelTags,
          },
          name: 'Редактировать уровни',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomEncryption,
          },
          name: 'Включить шифрование',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomHistoryVisibility,
          },
          name: 'Видимость истории',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTombstone,
          },
          name: 'Обновить комнату',
        },
        {
          location: {
            state: true,
          },
          name: 'Прочие настройки',
        },
      ],
    };

    const otherSettingsGroup: PermissionGroup = {
      name: 'Прочее',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.PoniesRoomEmotes,
          },
          name: 'Управлять эмодзи',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomServerAcl,
          },
          name: 'Изменять ACL сервера',
        },
        {
          location: {
            state: true,
            key: 'im.vector.modular.widgets',
          },
          name: 'Виджеты',
        },
      ],
    };

    return [
      messagesGroup,
      ...(isCallRoom ? [callSettingsGroup] : []),
      moderationGroup,
      roomOverviewGroup,
      roomSettingsGroup,
      otherSettingsGroup,
    ];
  }, [isCallRoom]);

  return groups;
};
