import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.tokenchat.app',
  appName: 'Token',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://tokenchat.dev',
    cleartext: false,
  },
  android: {
    backgroundColor: '#0e1621',
    allowMixedContent: false,
  },
};

export default config;
