import { atom } from 'jotai';

const STORAGE_KEY = 'settings';
const SETTINGS_VERSION = 3;
const SETTINGS_VERSION_KEY = 'settings_token_v';
export type DateFormat =
  | 'D MMM YYYY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY/MM/DD'
  | 'YYYY-MM-DD'
  | '';
export type MessageSpacing = '0' | '100' | '200' | '300' | '400' | '500';
export enum MessageLayout {
  Modern = 0,
  Compact = 1,
  Bubble = 2,
}

export interface Settings {
  themeId?: string;
  useSystemTheme: boolean;
  lightThemeId?: string;
  darkThemeId?: string;
  monochromeMode?: boolean;
  isMarkdown: boolean;
  editorToolbar: boolean;
  twitterEmoji: boolean;
  pageZoom: number;
  hideActivity: boolean;

  isPeopleDrawer: boolean;
  memberSortFilterIndex: number;
  enterForNewline: boolean;
  messageLayout: MessageLayout;
  messageSpacing: MessageSpacing;
  hideMembershipEvents: boolean;
  hideNickAvatarEvents: boolean;
  mediaAutoLoad: boolean;
  urlPreview: boolean;
  encUrlPreview: boolean;
  showHiddenEvents: boolean;
  legacyUsernameColor: boolean;

  showNotifications: boolean;
  isNotificationSounds: boolean;

  hour24Clock: boolean;
  dateFormatString: string;

  developerTools: boolean;
}

const defaultSettings: Settings = {
  themeId: 'telegram-dark-theme',
  useSystemTheme: false,
  lightThemeId: undefined,
  darkThemeId: 'telegram-dark-theme',
  monochromeMode: false,
  isMarkdown: true,
  editorToolbar: false,
  twitterEmoji: false,
  pageZoom: 100,
  hideActivity: false,

  isPeopleDrawer: false,
  memberSortFilterIndex: 0,
  enterForNewline: false,
  messageLayout: MessageLayout.Bubble,
  messageSpacing: '400',
  hideMembershipEvents: true,
  hideNickAvatarEvents: true,
  mediaAutoLoad: true,
  urlPreview: true,
  encUrlPreview: false,
  showHiddenEvents: false,
  legacyUsernameColor: false,

  showNotifications: true,
  isNotificationSounds: true,

  hour24Clock: true,
  dateFormatString: 'D MMM YYYY',

  developerTools: false,
};

export const getSettings = () => {
  const storedVersion = Number(localStorage.getItem(SETTINGS_VERSION_KEY) || 0);
  const settingsRaw = localStorage.getItem(STORAGE_KEY);

  if (storedVersion < SETTINGS_VERSION) {
    localStorage.setItem(SETTINGS_VERSION_KEY, String(SETTINGS_VERSION));
    if (settingsRaw !== null) {
      const saved = JSON.parse(settingsRaw) as Settings;
      const migrated: Settings = {
        ...defaultSettings,
        ...saved,
        themeId: defaultSettings.themeId,
        useSystemTheme: defaultSettings.useSystemTheme,
        messageLayout: defaultSettings.messageLayout,
        hour24Clock: defaultSettings.hour24Clock,
        isPeopleDrawer: defaultSettings.isPeopleDrawer,
        hideMembershipEvents: defaultSettings.hideMembershipEvents,
        hideNickAvatarEvents: defaultSettings.hideNickAvatarEvents,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return defaultSettings;
  }

  if (settingsRaw === null) return defaultSettings;
  return {
    ...defaultSettings,
    ...(JSON.parse(settingsRaw) as Settings),
  };
};

export const setSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

const baseSettings = atom<Settings>(getSettings());
export const settingsAtom = atom<Settings, [Settings], undefined>(
  (get) => get(baseSettings),
  (get, set, update) => {
    set(baseSettings, update);
    setSettings(update);
  }
);
