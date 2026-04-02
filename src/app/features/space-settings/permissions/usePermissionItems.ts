import { useMemo } from 'react';
import { StateEvent } from '../../../../types/matrix/room';
import { PermissionGroup } from '../../common-settings/permissions';

export const usePermissionGroups = (): PermissionGroup[] => {
  const groups: PermissionGroup[] = useMemo(() => {
    const messagesGroup: PermissionGroup = {
      name: 'Управление',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.SpaceChild,
          },
          name: 'Управлять комнатами',
        },
        {
          location: {},
          name: 'Сообщения',
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
      ],
    };

    const roomOverviewGroup: PermissionGroup = {
      name: 'Описание',
      items: [
        {
          location: {
            state: true,
            key: StateEvent.RoomAvatar,
          },
          name: 'Аватар',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomName,
          },
          name: 'Название',
        },
        {
          location: {
            state: true,
            key: StateEvent.RoomTopic,
          },
          name: 'Тема',
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
            key: StateEvent.RoomTombstone,
          },
          name: 'Обновить пространство',
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
      ],
    };

    return [
      messagesGroup,
      moderationGroup,
      roomOverviewGroup,
      roomSettingsGroup,
      otherSettingsGroup,
    ];
  }, []);

  return groups;
};
