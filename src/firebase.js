import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  projectId: "workshop2026-foodlink",
  appId: "1:109473462352:web:45bf3f301a89642f4c3955",
  storageBucket: "workshop2026-foodlink.firebasestorage.app",
  apiKey: "AIzaSyDbZ8qpXEEo1RrqtO0fnbR-fqTSpe2AHhE",
  authDomain: "workshop2026-foodlink.firebaseapp.com",
  messagingSenderId: "109473462352",
};

export const app = initializeApp(firebaseConfig);
// This public site key only proves requests came from the FoodLink web app.
// Gemini credentials remain behind Firebase AI Logic's protected gateway.
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6Lf9igMuAAAAALor523WYyFe7QP0Fr3yi8WDYWon"),
  isTokenAutoRefreshEnabled: true,
});
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
