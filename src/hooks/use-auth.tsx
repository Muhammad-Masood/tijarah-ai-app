import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  ApiError,
  getMe,
  loginMerchant,
  signupMerchant,
  type CurrentUserResponse,
  type MerchantCreate,
} from '@/lib/api';

const TOKEN_KEY = 'tijarah_access_token';

type AuthContextValue = {
  /** Undefined while the stored token is still being checked on launch. */
  session: CurrentUserResponse | null | undefined;
  signUpMerchant: (data: MerchantCreate) => Promise<void>;
  signInMerchant: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function hydrateFromToken(token: string): Promise<CurrentUserResponse> {
  return getMe(token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CurrentUserResponse | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        setSession(null);
        return;
      }
      try {
        setSession(await hydrateFromToken(token));
      } catch {
        // Stored token is invalid/expired.
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setSession(null);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      async signUpMerchant(data) {
        await signupMerchant(data);
        const { access_token } = await loginMerchant(data.email, data.password);
        await SecureStore.setItemAsync(TOKEN_KEY, access_token);
        setSession(await hydrateFromToken(access_token));
      },
      async signInMerchant(email, password) {
        const { access_token } = await loginMerchant(email, password);
        await SecureStore.setItemAsync(TOKEN_KEY, access_token);
        setSession(await hydrateFromToken(access_token));
      },
      async signOut() {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { ApiError };
