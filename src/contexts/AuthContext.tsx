// entire file content ...
import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { apiJson } from '../lib/api';

const config = {
  projectId: "scope-app-492120",
  appId: "1:523911913692:web:8e69126d645d84c7241419",
  apiKey: "AIzaSyCQmRhaNxk0oPH6sl-nP4s718gW1yR60E4",
  authDomain: "scope-app-492120.firebaseapp.com"
};

const app = initializeApp(config);
const auth = getAuth(app);
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
      let lastError: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const synced = await syncAccount(u, ref);
          setDbUser(synced);
          setAuthError(null);
          setLoading(false);
          return;
        } catch (error: any) {
          lastError = error;
          console.error(`Auth sync attempt ${attempt + 1} failed`, error);
          // Specific handling for database unavailable error
          if (error.message?.includes('AUTH_DB_UNAVAILABLE')) {
            setAuthError(new Error('Your account is logged in, but the database is currently unavailable. Some features may be limited.'));
            setDbUser(null);
            setLoading(false);
            return;
          }
          if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }

      setDbUser(null);
      setAuthError(lastError || new Error('Unable to sync account'));
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, new GoogleAuthProvider());
  };
  const registerWithEmail = async (email: string, pass: string, name?: string) => {
    await setPersistence(auth, browserLocalPersistence);
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
  };
  const loginWithEmail = async (email: string, pass: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, pass);
  };
  const logOut = () => signOut(auth);

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

  return <AuthContext.Provider value={{ user, dbUser, loading, authError, signIn, registerWithEmail, loginWithEmail, logOut, updateUserName }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
