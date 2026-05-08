import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Using the Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyDqppARMAu5xwv73JiNXtaJZma0w10vwb4",
  authDomain: "gen-lang-client-0132736949.firebaseapp.com",
  projectId: "gen-lang-client-0132736949",
  storageBucket: "gen-lang-client-0132736949.firebasestorage.app",
  messagingSenderId: "81659871574",
  appId: "1:81659871574:web:60cc5fe147679989f8d6f7",
  measurementId: "G-3BVFKXZDPF",
  databaseURL: "https://gen-lang-client-0132736949-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

export const isConfigValid = true;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
