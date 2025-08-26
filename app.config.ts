import type { ConfigContext, ExpoConfig } from '@expo/config';

import { Env } from './env';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ColorFun Kids', // Simple name for EAS
  description: 'Digital Coloring Book for Kids',
  // owner: Env.EXPO_ACCOUNT_OWNER, // Comment out to use your current Expo account
  scheme: 'colouring',
  slug: 'coloring-book-kids',
  version: Env.VERSION.toString(),
  orientation: 'default', // Allow both portrait and landscape for fullscreen feature
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: false,  // Disable new architecture to fix MMKV compatibility
  extra: {
    eas: {
      projectId: '5aaaa822-7ee4-468d-a4a9-343a5884cd1f',
    },
  },
  updates: {
    url: 'https://u.expo.dev/5aaaa822-7ee4-468d-a4a9-343a5884cd1f',
    fallbackToCacheTimeout: 0,
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.coloring.kids.app', // Simple bundle ID
    runtimeVersion: {
      policy: 'appVersion',
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  experiments: {
    typedRoutes: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#2E3C4B',
    },
    runtimeVersion: '1.0.0',
    package: 'com.coloring.kids.app', // Simple package name
    compileSdkVersion: 33,
    targetSdkVersion: 33,
    permissions: [
      'WRITE_EXTERNAL_STORAGE',
      'READ_EXTERNAL_STORAGE',
    ],
    buildToolsVersion: '33.0.2',
    kotlinVersion: '1.9.24',
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        backgroundColor: '#2E3C4B',
        image: './assets/splash-icon.png',
        imageWidth: 150,
      },
    ],
    [
      'expo-font',
      {
        fonts: ['./assets/fonts/Inter.ttf'],
      },
    ],
    'expo-localization',
    'expo-router',
    ['react-native-edge-to-edge'],
  ],
});
