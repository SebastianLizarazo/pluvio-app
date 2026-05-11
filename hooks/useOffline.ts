import { useEffect } from 'react';

import NetInfo from '@react-native-community/netinfo';

import { useAppStore } from '@/stores/app-store';

export const useOffline = (): boolean => {
  const isOffline = useAppStore((state) => state.isOffline);
  const setOffline = useAppStore((state) => state.setOffline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(!state.isConnected);
    });

    return unsubscribe;
  }, [setOffline]);

  return isOffline;
};
