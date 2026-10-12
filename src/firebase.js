import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: 'workshop2026-foodlink',
  appId: '1:109473462352:web:45bf3f301a89642f4c3955',
  storageBucket: 'workshop2026-foodlink.firebasestorage.app',
  apiKey: 'AIzaSyDbZ8qpXEEo1RrqtO0fnbR-fqTSpe2AHhE',
  authDomain: 'workshop2026-foodlink.firebaseapp.com',
  messagingSenderId: '109473462352'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
