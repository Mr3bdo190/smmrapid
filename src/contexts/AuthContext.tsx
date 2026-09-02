import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, setPersistence, browserLocalPersistence, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const config = {
  projectId: "scope-app-492120",
  appId: "1:523911913692:web:8e69126d645d84c7241419",
  apiKey: "AIzaSyCQmRhaNxk0oPH6sl-nP4s718gW1yR60E4",
  authDomain: "scope-app-492120.firebaseapp.com"
};

const app = initializeApp(config);
const auth = getAuth(app);
const AuthContext = createContext<any>({});

async function syncAccount(u: User, referralCode?: string) {
  // Force-refresh once so a stale cached Firebase ID token cannot cause a false Access Denied.
  let token = await u.getIdToken();
  let res = await fetch('/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(referralCode ? { referralCode } : {})
  });

  if (res.status === 401) {
    token = await u.getIdToken(true);
    res = await fetch('/api/auth/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(referralCode ? { referralCode } : {})
    });
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(body?.error || `Authentication sync failed (${res.status})`);
    error.status = res.status;
    error.code = body?.code;
    throw error;
  }
  return body;
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
  const registerWithEmail = async (email: string, pass: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await createUserWithEmailAndPassword(auth, email, pass);
  };
  const loginWithEmail = async (email: string, pass: string) => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, pass);
  };
  const logOut = () => signOut(auth);

  return <AuthContext.Provider value={{ user, dbUser, loading, authError, signIn, registerWithEmail, loginWithEmail, logOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
