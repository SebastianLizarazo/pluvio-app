import { create } from 'zustand';

import type { AppUser } from '@/types/domain';

interface AppState {
  appUser: AppUser | null;
  setAppUser: (user: AppUser | null) => void;
  isOffline: boolean;
  setOffline: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  appUser: null,
  setAppUser: (appUser) => set({ appUser }),
  isOffline: false,
  setOffline: (isOffline) => set({ isOffline }),
}));
