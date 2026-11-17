import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.inven.easy',
  appName: 'InvenEasy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
      channel: 'production',
      resetWhenUpdate: true,
      autoDeleteFailed: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#7c3aed',
    },
  },
}

export default config
