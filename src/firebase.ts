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
  getAuthEmulatorHost, 
  isEmulatorRunning
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

// Timeout duration for emulator checks (in milliseconds)
// The 5000ms timeout was chosen as a balance between responsiveness and allowing enough time for the emulator to respond.
const EMULATOR_CHECK_TIMEOUT_MS = 5000;
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

// Para armazenar as promessas de verificação
const emulatorChecks: Promise<void>[] = [];

// Conectar aos emuladores se estiver em ambiente de desenvolvimento ou teste
if (shouldUseEmulator()) {
  const firestoreHost = getFirestoreEmulatorHost();
  const authHost = getAuthEmulatorHost();
  
  // Helper function to check emulator availability with a timeout
  const checkEmulatorAvailability = async (emulatorHost: string, emulatorName: string): Promise<boolean> => {
    return Promise.race([
      isEmulatorRunning(emulatorHost),
      new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          console.warn(`[Firebase] Timeout ao verificar emulador ${emulatorName} em ${emulatorHost}. Verifique a conectividade ou se o emulador está em execução.`);
          reject(new Error(`Timeout ao verificar emulador ${emulatorName}`));
        }, EMULATOR_CHECK_TIMEOUT_MS);
      })
    ]);
  };

  // Helper function to check and connect to an emulator
  const checkAndConnectEmulator = async (
    emulatorHost: string | undefined,
    connectFn: (host: string, port: number) => void,
    emulatorName: string
  ) => {
    if (emulatorHost) {
      const [host, portStr] = emulatorHost.split(':');
      const port = parseInt(portStr, 10);
      if (host && !isNaN(port)) {
        try {
          const isRunning = await checkEmulatorAvailability(emulatorHost, emulatorName);

          if (isRunning) {
            console.log(`[Firebase] Emulador ${emulatorName} disponível em ${host}:${port}, conectando...`);
            connectFn(host, port);
          } else {
            console.warn(`[Firebase] Emulador ${emulatorName} não está disponível em ${host}:${port}. Usando produção.`);
          }
        } catch (error) {
          console.error(`[Firebase] Erro ao verificar emulador ${emulatorName} ou timeout:`, error);
          console.warn(`[Firebase] Usando configuração de produção para ${emulatorName}.`);
        }
      }
    }
  };

  // Check and connect to Firestore emulator
  emulatorChecks.push(checkAndConnectEmulator(firestoreHost ?? undefined, (host, port) => connectFirestoreEmulator(db, host, port), "Firestore"));

  // Check and connect to Auth emulator
  emulatorChecks.push(checkAndConnectEmulator(authHost ?? undefined, (host, port) => connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true }), "Auth"));
  
  // Aguardar todas as verificações de emuladores
  Promise.all(emulatorChecks)
    .then(() => {
      console.log("[Firebase] Configuração de emuladores concluída");
    })
    .catch((error) => {
      console.error("[Firebase] Erro ao configurar emuladores:", error);
    });
}

export { auth, db };
export const environment = getCurrentEnvironment();

// Aguarda a conclusão de todas as verificações de emuladores antes de prosseguir
(async () => {
  try {
    await Promise.all(emulatorChecks);
    console.log("[Firebase] Configuração de emuladores concluída");
  } catch (error) {
    console.error("[Firebase] Erro ao configurar emuladores:", error);
  }
})();
