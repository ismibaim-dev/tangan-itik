import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Changing the app id later installs as a separate app, without the user's data.
  appId: 'io.github.ismibaimdev.gripwise',
  appName: 'GripWise',
  webDir: 'dist',
  android: {
    // Keep content clear of the status and navigation bars on Android 15's edge-to-edge layout.
    adjustMarginsForEdgeToEdge: 'auto',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_gripwise',
      iconColor: '#1B594D',
    },
  },
};

export default config;
