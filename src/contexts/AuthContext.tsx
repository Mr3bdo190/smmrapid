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

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdToken();
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(ref ? { referralCode: ref } : {})
        });
        if (res.ok) setDbUser(await res.json());
      } else {
        setDbUser(null);
      }
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

  return <AuthContext.Provider value={{ user, dbUser, loading, signIn, registerWithEmail, loginWithEmail, logOut }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
