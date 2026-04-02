import { useMemo } from 'react';
import { RoomMember } from 'matrix-js-sdk';
import { Membership } from '../../types/matrix/room';

export const MembershipFilter = {
  filterJoined: (m: RoomMember) => m.membership === Membership.Join,
  filterInvited: (m: RoomMember) => m.membership === Membership.Invite,
  filterLeaved: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() === m.events.member?.getSender(),
  filterKicked: (m: RoomMember) =>
    m.membership === Membership.Leave &&
    m.events.member?.getStateKey() !== m.events.member?.getSender(),
  filterBanned: (m: RoomMember) => m.membership === Membership.Ban,
};

export type MembershipFilterFn = (m: RoomMember) => boolean;

export type MembershipFilterItem = {
  name: string;
  filterFn: MembershipFilterFn;
};

export const useMembershipFilterMenu = (): MembershipFilterItem[] =>
  useMemo(
    () => [
      {
        name: 'Вступил',
        filterFn: MembershipFilter.filterJoined,
      },
      {
        name: 'Приглашён',
        filterFn: MembershipFilter.filterInvited,
      },
      {
        name: 'Вышел',
        filterFn: MembershipFilter.filterLeaved,
      },
      {
        name: 'Исключён',
        filterFn: MembershipFilter.filterKicked,
      },
      {
        name: 'Забанен',
        filterFn: MembershipFilter.filterBanned,
      },
    ],
    []
  );

export const useMembershipFilter = (
  index: number,
  membershipFilter: MembershipFilterItem[]
): MembershipFilterItem => {
  const filter = membershipFilter[index] ?? membershipFilter[0];
  return filter;
};
