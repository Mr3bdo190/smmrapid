import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import bundledConfig from '../../firebase-config.json';

/**
 * Firebase web configuration.
 *
 * This block is public by design — it ships inside every browser bundle and is not a secret
 * (access is controlled by Firebase rules and authorized domains, not by hiding it). Vite env
 * vars win when present so a deployment can point at another project without a code change.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || bundledConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || bundledConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || bundledConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || bundledConfig.appId,
};

export const authConfigStatus = {
  configured: Object.values(config).every((value) => typeof value === 'string' && value.trim().length > 0),
  projectId: config.projectId,
  /** Set to true by a VITE_* variable so the UI can explain where the config came from. */
  fromEnv: Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
};

let authInstance: Auth | null = null;

/**
 * Returns the Firebase Auth instance, or null when the configuration is unusable.
 * A missing public config must never take the whole page down.
 */
export function getFirebaseAuth(): Auth | null {
  if (!authConfigStatus.configured) return null;
  if (authInstance) return authInstance;
  try {
    const app = getApps().length ? getApp() : initializeApp(config);
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    console.error('[auth] Firebase initialisation failed', error);
    return null;
  }
}
