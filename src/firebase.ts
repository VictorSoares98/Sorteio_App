/**
 * Configuração do Firebase com suporte a múltiplos ambientes e emuladores.
 * Este arquivo centraliza a inicialização e configuração do Firebase para toda a aplicação.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from 'firebase/auth';
import { 
  initializeFirestore, 
  CACHE_SIZE_UNLIMITED, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore 
} from 'firebase/firestore';
import { 
  getCurrentEnvironment, 
  shouldUseEmulator, 
  getFirestoreEmulatorHost, 
  getAuthEmulatorHost 
} from './utils/environment';

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

  console.log(`[Firebase] Persistência Firestore configurada com sucesso! (${getCurrentEnvironment()})`);
} catch (err) {
  console.error("[Firebase] Erro ao configurar persistência Firestore:", err);
  
  // Inicializar Firestore sem persistência como fallback
  db = initializeFirestore(app, {});
  console.warn("[Firebase] Firestore inicializado sem persistência local.");
}

// Configurar persistência local para autenticação
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("[Firebase] Erro ao configurar persistência de autenticação:", error);
  });

// Conectar aos emuladores se estiver em ambiente de desenvolvimento ou teste
if (shouldUseEmulator()) {
  const firestoreHost = getFirestoreEmulatorHost();
  const authHost = getAuthEmulatorHost();
  
  if (firestoreHost) {
    const [host, portStr] = firestoreHost.split(':');
    const port = parseInt(portStr, 10);
    if (host && !isNaN(port)) {
      console.log(`[Firebase] Conectando ao emulador Firestore em ${host}:${port}`);
      connectFirestoreEmulator(db, host, port);
    }
  }
  
  if (authHost) {
    const url = `http://${authHost}`;
    console.log(`[Firebase] Conectando ao emulador Auth em ${url}`);
    connectAuthEmulator(auth, url, { disableWarnings: true });
  }
}

export { auth, db };
export const environment = getCurrentEnvironment();
