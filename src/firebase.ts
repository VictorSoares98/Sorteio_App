import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  type Firestore 
} from 'firebase/firestore';

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

// Inicializar Firestore com configurações de cache persistente
// Tipagem explícita para evitar erro de 'any' implícito
let db: Firestore;
try {
  // Configurar Firestore com cache persistente e suporte para múltiplas abas
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    })
  });

  console.log("Persistência Firestore configurada com sucesso!");
} catch (err) {
  console.error("Erro ao configurar persistência Firestore:", err);
  
  // Inicializar Firestore sem persistência como fallback
  db = initializeFirestore(app, {});
  console.warn("Firestore inicializado sem persistência local.");
}

// Configurar persistência local para autenticação
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Erro ao configurar persistência de autenticação:", error);
  });

export { auth, db };
