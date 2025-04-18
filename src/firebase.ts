import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

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

// Configurar persistência local para autenticação
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Erro ao configurar persistência de autenticação:", error);
  });

// Habilitar persistência offline para Firestore
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Persistência Firestore habilitada com sucesso!");
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Persistência falhou. Múltiplas abas abertas simultaneamente.");
    } else if (err.code === 'unimplemented') {
      console.warn("Navegador não suporta persistência offline.");
    } else {
      console.error("Erro ao configurar persistência Firestore:", err);
    }
  });

export { auth, db };
