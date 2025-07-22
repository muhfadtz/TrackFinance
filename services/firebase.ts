
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// PENTING: Ganti dengan konfigurasi Firebase proyek Anda sendiri.
// Disarankan untuk menyimpan ini di environment variables (.env file).
const firebaseConfig = {
  apiKey: "AIzaSyDmWeqBOvrvT59cQG2JxGTJEO4Qx77_190",
  authDomain: "evvofinance.firebaseapp.com",
  projectId: "evvofinance",
  storageBucket: "evvofinance.appspot.com", // FIXED!
  messagingSenderId: "635466447322",
  appId: "1:635466447322:web:e7259dc418ca28c04568e3"
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
