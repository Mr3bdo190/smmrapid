import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { apiJson, isAuthDbUnavailableError } from '../lib/api';
import firebaseAppletConfig from '../../firebase-applet-config.json';

// Firebase's web configuration is public by design. Prefer explicit Vite env vars
// when provided, but fall back to the bundled app config so Render deployments do
// not silently disable authentication when VITE_* variables were not configured.
const config = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
};

// Never let a missing/misconfigured public Firebase env crash the entire SPA.
// The public site can still render; authenticated features show a recoverable state.
const firebaseReady = Object.values(config).every(v => typeof v === 'string' && v.trim().length > 0);
let auth: Auth | null = null;
if (firebaseReady) {
  try { auth = getAuth(initializeApp(config)); }
  catch (error) { console.error('[auth] Firebase initialization failed:', error); }
}
const AuthContext = createContext<any>({});

async function syncAccount(u: User, referralCode?: string, name?: string) {
  // Use apiJson which handles token refresh with mutex internally
  return apiJson('/api/auth/sync', u, {
    method: 'POST',
    body: JSON.stringify({ referralCode, name })
  });
}

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<any>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setAuthError(Object.assign(new Error('Authentication is temporarily unavailable.'), { code: 'AUTH_CONFIG_MISSING' }));
      return;
    }
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthError(null);
      if (!u) {
        setDbUser(null);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref') || localStorage.getItem('ref') || undefined;
      // Keep the client area in a loading state until the Firebase identity is
      // successfully synchronized with the application database. This prevents
      // the brief 'Access Denied' flash that happened while sync was still running.
      let lastError: any = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const synced = await syncAccount(u, ref);
          setDbUser(synced);
          setAuthError(null);
          setLoading(false);
          return;
        } catch (error: any) {
          lastError = error;
          console.error(`Auth sync attempt ${attempt + 1} failed`, error);
          // Specific handling for database unavailable error using standardized checker
          if (isAuthDbUnavailableError(error) && attempt < 4) {
            await new Promise(resolve => setTimeout(resolve, 750 * Math.pow(2, attempt)));
            continue;
          }
          // Exponential backoff: 500ms, 1s, 2s
          if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 750 * Math.pow(2, attempt)));
        }
      }

      // Graceful degradation: user stays logged in, sync failure is non-blocking
      setDbUser(null);
      const finalError: any = lastError instanceof Error ? lastError : new Error('Unable to synchronize account data. Please try again later.');
      if (lastError?.code) finalError.code = lastError.code;
      setAuthError(finalError);
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    if (!auth) throw new Error('Authentication is temporarily unavailable.');
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, new GoogleAuthProvider());
  };
  const registerWithEmail = async (email: string, pass: string, name?: string) => {
    if (!auth) throw new Error('Authentication is temporarily unavailable.');
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && cred.user) { await updateProfile(cred.user, { displayName: name }); }
    // Verification email delivery must never turn a successful account creation
    // into a false error. Firebase has already created the account at this point.
    if (cred.user && !cred.user.emailVerified) {
      try { await sendEmailVerification(cred.user); }
      catch (verificationError) { console.warn('[auth] Verification email could not be sent:', verificationError); }
    }
  };
  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Authentication is temporarily unavailable.');
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, pass);
  };
  const logOut = () => auth ? signOut(auth) : Promise.resolve();
  const sendVerification = async () => { if (user && !user.emailVerified) await sendEmailVerification(user); };
  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Authentication is temporarily unavailable.');
    await sendPasswordResetEmail(auth, email.trim());
  };

  const updateUserName = async (newName: string) => {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: newName });
      // Also update in our database
      await apiJson('/api/client/me', user, {
        method: 'PUT',
        body: JSON.stringify({ name: newName })
      });
      // Refresh dbUser
      const token = await user.getIdToken();
      const synced = await apiJson('/api/auth/sync', user, { method: 'POST', body: JSON.stringify({}) });
      setDbUser(synced);
      return true;
    } catch (error) {
      console.error('Failed to update name:', error);
      return false;
    }
  };

  return <AuthContext.Provider value={{ user, dbUser, loading, authError, signIn, registerWithEmail, loginWithEmail, logOut, sendVerification, resetPassword, updateUserName }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
