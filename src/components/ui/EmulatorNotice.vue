<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { shouldUseEmulator, getAuthEmulatorHost, getFirestoreEmulatorHost, isEmulatorRunning } from '../../utils/environment';

const showNotice = ref(false);
const emulatorMessage = ref('');

onMounted(async () => {
  // Apenas verificar em ambiente que deveria usar emuladores
  if (!shouldUseEmulator()) return;
  
  const authHost = getAuthEmulatorHost();
  const firestoreHost = getFirestoreEmulatorHost();
  
  const authRunning = authHost ? await isEmulatorRunning(authHost) : false;
  const firestoreRunning = firestoreHost ? await isEmulatorRunning(firestoreHost) : false;
  
  // Verificar o status dos emuladores
  if ((authHost && !authRunning) || (firestoreHost && !firestoreRunning)) {
    showNotice.value = true;
    
    if (!authRunning && !firestoreRunning) {
      emulatorMessage.value = "Os emuladores do Firebase não estão rodando. Execute 'firebase emulators:start' em outro terminal.";
    } else if (!authRunning) {
      emulatorMessage.value = "O emulador de autenticação não está rodando. Execute 'firebase emulators:start' em outro terminal.";
    } else {
      emulatorMessage.value = "O emulador do Firestore não está rodando. Execute 'firebase emulators:start' em outro terminal.";
    }
  }
});

// Método para fechar o aviso
const closeNotice = () => {
  showNotice.value = false;
};
</script>

<template>
  <div v-if="showNotice" class="fixed bottom-4 right-4 bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 shadow-md max-w-sm z-50">
    <div class="flex">
      <div class="py-1">
        <svg class="h-6 w-6 text-orange-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div>
        <p class="font-bold mb-1">Modo Desenvolvimento: Emuladores</p>
        <p class="text-sm">{{ emulatorMessage }}</p>
        <div class="flex justify-between mt-3">
          <button @click="closeNotice" class="text-sm text-orange-700 hover:text-orange-900 underline">
            Fechar
          </button>
          <a href="https://firebase.google.com/docs/emulator-suite" target="_blank" class="text-sm text-orange-700 hover:text-orange-900 underline">
            Saiba mais
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
