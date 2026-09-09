import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'scope-app-492120';
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (json) {
    try {
      const serviceAccount = JSON.parse(json);
      initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id || projectId });
    } catch (e) {
      console.error('[firebase] Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
      initializeApp({ credential: applicationDefault(), ...(projectId ? { projectId } : {}) });
    }
  } else if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  } else {
    initializeApp({ credential: applicationDefault(), ...(projectId ? { projectId } : {}) });
  }
}
export const adminAuth = getAuth();
