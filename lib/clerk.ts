import * as SecureStore from 'expo-secure-store';

const CLERK_TOKEN_KEY = 'pluvio-clerk-token';

export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(`${CLERK_TOKEN_KEY}-${key}`);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(`${CLERK_TOKEN_KEY}-${key}`, value);
    } catch {
      // noop
    }
  },
};
