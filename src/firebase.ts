import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDZvWlQfdskmFmyiRHxjldX6VsY_2JlnRw",
    authDomain: "app-sorteio-2401e.firebaseapp.com",
    projectId: "app-sorteio-2401e",
    storageBucket: "app-sorteio-2401e.appspot.com", // Corrigido: formato correto para o Storage
    messagingSenderId: "346696645288",
    appId: "1:346696645288:web:3bf3a92f8ea606f4bf609d"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configurar persistência local para manter o usuário logado após recarregar
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Erro ao configurar persistência:", error);
  });

const db = getFirestore(app);

export { auth, db };
