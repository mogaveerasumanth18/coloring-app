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
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  extra: {
    eas: {
      projectId: '4fd7a234-f462-4860-90ff-cd1a1044b0ef',
    },
  },
  updates: {
    url: 'https://u.expo.dev/4fd7a234-f462-4860-90ff-cd1a1044b0ef',
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
