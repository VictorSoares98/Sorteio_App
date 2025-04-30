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

// Expose the dismiss function to make it accessible in the template
defineExpose({ dismiss });
</script>

<template>
  <transition name="fade">
    <div 
      v-if="isVisible" 
      class="fixed z-50 p-3 sm:p-4 border border-yellow-200 rounded-lg shadow-lg bg-yellow-50 
             bottom-2 right-2 sm:bottom-4 sm:right-4 
             w-[calc(100%-16px)] sm:w-auto sm:max-w-md"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3 flex-grow">
          <h3 class="text-sm font-medium text-yellow-800">Problema de conectividade detectado</h3>
          <div class="mt-1 text-xs text-yellow-700">
            <p>Um bloqueador de anúncios ou extensão está impedindo a conexão com nossos serviços, afetando a sincronização em tempo real.</p>
            <ul class="mt-2 list-disc pl-4 space-y-1">
              <li>Dados não serão atualizados automaticamente</li>
              <li>Você precisará atualizar manualmente a página para ver novos dados</li>
            </ul>
            <p class="mt-2 font-medium">Para resolver:</p>
            <ol class="pl-4 list-decimal space-y-1">
              <li>Desative temporariamente seu bloqueador de anúncios</li>
              <li>Adicione este site à lista de exceções do bloqueador</li>
              <li>Recarregue a página após fazer as alterações</li>
            </ol>
          </div>
        </div>
        <div class="ml-2 sm:ml-auto pl-1 sm:pl-3">
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
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
