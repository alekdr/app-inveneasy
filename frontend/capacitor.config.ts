import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Debe coincidir con applicationId de android/app/build.gradle y el bundleId de iOS
  appId: 'com.inven.easy',
  appName: 'InvenEasy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    // Permite llamar al backend por HTTP (LAN) desde el WebView https://localhost
    allowMixedContent: true
  },
  ios: {
    // Safe area gestionada por el WebView vía CSS (evita doble padding)
    contentInset: 'never',
    scrollEnabled: true,
    // Deja que las insets lleguen al CSS vía env()/var(--safe-area-*)
    backgroundColor: '#fbfaf8'
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: 'always',
      channel: 'production',
      resetWhenUpdate: true,
      autoDeleteFailed: true,
      // IMPORTANTE: se mantiene el appId registrado en Capgo para no romper OTA
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
