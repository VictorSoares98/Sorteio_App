import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDZvWlQfdskmFmyiRHxjldX6VsY_2JlnRw",
    authDomain: "app-sorteio-2401e.firebaseapp.com",
    projectId: "app-sorteio-2401e",
    storageBucket: "app-sorteio-2401e.firebasestorage.app",
    messagingSenderId: "346696645288",
    appId: "1:346696645288:web:3bf3a92f8ea606f4bf609d"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
