<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useConnectionStatus } from '../../services/connectivity';

const { isServiceBlocked, hasShownBlockWarning } = useConnectionStatus();
const isVisible = ref(false);

// Mostrar o aviso apenas depois de um pequeno atraso para evitar falsos positivos
onMounted(() => {
  setTimeout(() => {
    if (isServiceBlocked.value && !hasShownBlockWarning.value) {
      isVisible.value = true;
      hasShownBlockWarning.value = true;
    }
  }, 3000);
});

const dismiss = () => {
  isVisible.value = false;
};
</script>

<template>
  <transition name="fade">
    <div 
      v-if="isVisible" 
      class="fixed bottom-4 right-4 z-50 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg max-w-sm"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-yellow-800">Bloqueador detectado</h3>
          <div class="mt-1 text-xs text-yellow-700">
            <p>Detectamos que um bloqueador de anúncios pode estar interferindo com algumas funcionalidades do site. Para melhor experiência, considere adicionar este site à lista de exceções.</p>
          </div>
        </div>
        <div class="ml-auto pl-3">
          <div class="-mx-1.5 -my-1.5">
            <button 
              @click="dismiss" 
              class="inline-flex rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100 focus:outline-none"
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
