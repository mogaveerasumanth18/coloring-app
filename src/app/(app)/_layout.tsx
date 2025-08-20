/* eslint-disable react/no-unstable-nested-components */
import { Redirect, SplashScreen } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native';

import IntegratedColoringBookApp from '@/components/IntegratedColoringBookApp';
import { useAuth, useIsFirstTime } from '@/lib';

export default function MainLayout() {
  const status = useAuth.use.status();
  const [isFirstTime] = useIsFirstTime();
  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);
  
  useEffect(() => {
    if (status !== 'idle') {
      setTimeout(() => {
        hideSplash();
      }, 1000);
    }
  }, [hideSplash, status]);

  if (false && isFirstTime) {
    return <Redirect href="/onboarding" />;
  }
  if (false && status === 'signOut') {
    return <Redirect href="/login" />;
  }
  
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <IntegratedColoringBookApp />
    </SafeAreaView>
  );
}
