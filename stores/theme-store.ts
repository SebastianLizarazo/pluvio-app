import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants/storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  hydrated: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  hydrated: false,
  setMode: async (mode) => {
    await AsyncStorage.setItem(STORAGE_KEYS.colorScheme, mode);
    set({ mode });
  },
  hydrate: async () => {
    const mode = (await AsyncStorage.getItem(STORAGE_KEYS.colorScheme)) as ThemeMode | null;
    set({ mode: mode ?? 'system', hydrated: true });
  },
}));
