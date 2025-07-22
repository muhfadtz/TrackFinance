// firebase.ts

// Import Firebase Compat untuk auth & firestore
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Import Modular SDK khusus untuk App Check
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { initializeApp as initializeModularApp } from 'firebase/app';

// Konfigurasi Firebase dari environment
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inisialisasi Firebase compat (untuk auth dan firestore)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Inisialisasi modular app (khusus untuk App Check)
const modularApp = initializeModularApp(firebaseConfig);

// 🛡️ Inisialisasi App Check dengan Site Key dari Google reCAPTCHA v3
initializeAppCheck(modularApp, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true, // Untuk refresh otomatis App Check token
});

// Inisialisasi service
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Aktifkan offline persistence dengan sinkronisasi antar tab
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('[Firestore] Gagal mengaktifkan persistence di beberapa tab. Data hanya akan disinkronkan di tab utama.');
  } else if (err.code == 'unimplemented') {
    console.warn('[Firestore] Browser ini tidak mendukung persistence.');
  }
});

export { auth, db, googleProvider, firebase };
