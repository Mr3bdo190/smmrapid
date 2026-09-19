import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { ApiError, apiJson } from '../lib/api';
import { authConfigStatus, getFirebaseAuth } from '../lib/firebase';

/** What the server says about the signed-in account (never the browser's opinion). */
export type Account = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    displayName: string | null;
    avatarUrl: string | null;
    referralCode: string | null;
    status: string;
    createdAt: string;
  };
  wallet: { balanceMinor: number; currency: string };
  roles: string[];
  permissions: string[];
};

type AuthState = {
  ready: boolean;
  firebaseReady: boolean;
  user: User | null;
  account: Account | null;
  accountError: ApiError | null;
  refreshAccount: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [accountError, setAccountError] = useState<ApiError | null>(null);

  const firebaseReady = authConfigStatus.configured && getFirebaseAuth() !== null;

  /** Server round-trip: provisions the account row on first call and returns the real profile. */
  const loadAccount = useCallback(async (current: User) => {
    try {
      const body = await apiJson<{ success: true; data: Account }>('/api/auth/me', current);
      setAccount(body.data);
      setAccountError(null);
    } catch (error) {
      setAccount(null);
      setAccountError(
        error instanceof ApiError
          ? error
          : new ApiError('We could not load your account.', 'REQUEST_FAILED', 0),
      );
    }
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setReady(true);
      if (next) void loadAccount(next);
      else {
        setAccount(null);
        setAccountError(null);
      }
    });
  }, [loadAccount]);

  const refreshAccount = useCallback(async () => {
    if (user) await loadAccount(user);
  }, [user, loadAccount]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      firebaseReady,
      user,
      account,
      accountError,
      refreshAccount,
      async signIn(email, password) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Authentication is not configured.');
        await signInWithEmailAndPassword(auth, email.trim(), password);
      },
      async signUp(name, email, password) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Authentication is not configured.');
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const trimmed = name.trim();
        if (trimmed) await updateProfile(cred.user, { displayName: trimmed });
        // the server row is created by the next /api/auth/me call
        await loadAccount(cred.user);
      },
      async signOutUser() {
        const auth = getFirebaseAuth();
        if (auth) await signOut(auth);
      },
      async sendReset(email) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error('Authentication is not configured.');
        await sendPasswordResetEmail(auth, email.trim());
      },
    }),
    [ready, firebaseReady, user, account, accountError, refreshAccount, loadAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
