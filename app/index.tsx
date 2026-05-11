import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';

import { useAppSession } from '@/hooks/useAppSession';

export default function IndexScreen() {
  const { isAuthReady, isSignedIn, isLoading, appUser } = useAppSession();

  if (!isAuthReady || (isSignedIn && isLoading)) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // For MVP, only admin role exists, so always go to admin
  return <Redirect href="/(admin)" />;
}