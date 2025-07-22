
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// PENTING: Ganti dengan konfigurasi Firebase proyek Anda sendiri.
// Disarankan untuk menyimpan ini di environment variables (.env file).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Inisialisasi services
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Aktifkan offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('[Firestore] Gagal mengaktifkan persistence di beberapa tab.');
  } else if (err.code == 'unimplemented') {
    console.warn('[Firestore] Browser ini tidak mendukung persistence.');
  }
});


export { auth, db, googleProvider, firebase };
