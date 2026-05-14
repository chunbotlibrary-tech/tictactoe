import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import firebaseBaseConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  ...firebaseBaseConfig,
  databaseURL: (firebaseBaseConfig as any).databaseURL || `https://${firebaseBaseConfig.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`
};

export const isConfigValid = !!firebaseConfig.apiKey;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
