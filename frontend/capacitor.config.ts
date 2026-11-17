import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.founders.inveneasy',
  appName: 'InvenEasy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: 'always',
      channel: 'production',
      resetWhenUpdate: true,
      autoDeleteFailed: true,
      appId: 'com.founders.inveneasy',
      version: '0.0.0',
      defaultChannel: 'production',
      autoSplashscreen: true
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed'
    },
    SplashScreen: {
      launchAutoHide: false
    }
  }
};

export default config;
