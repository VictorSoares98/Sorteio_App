<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore } from '../../stores/orderStore';
import * as adminService from '../../services/admin';
import Button from '../ui/Button.vue';
import ResetSalesModal from '../modals/ResetSalesModal.vue';

const props = defineProps({
  variant: {
    type: String as () => 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info',
    default: 'danger'
  },
  block: {
    type: Boolean,
    default: false
  },
  showHelpText: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits<{
  success: [];
  error: [message: string];
}>();

const authStore = useAuthStore();
const orderStore = useOrderStore();
const showResetModal = ref(false);
const isResetting = ref(false);
const resetSuccess = ref(false);
const resetError = ref<string | null>(null);
// Proteção contra múltiplos cliques
const isButtonDisabled = ref(false);

// Verificar se o usuário pode resetar vendas (admin ou não afiliado)
const canResetSales = computed(() => {
  if (!authStore.currentUser) return false;
  
  // Permitir acesso apenas para admins ou usuários não afiliados
  return authStore.isAdmin || !authStore.currentUser.affiliatedTo;
});

// Abrir modal de confirmação
const openResetModal = () => {
  // Proteção contra múltiplos cliques
  if (isButtonDisabled.value) return;
  
  isButtonDisabled.value = true;
  setTimeout(() => {
    isButtonDisabled.value = false;
  }, 500); // Desabilita por 500ms para evitar duplo clique
  
  resetSuccess.value = false;
  resetError.value = null;
  showResetModal.value = true;
};

// Processar confirmação de reset
const handleResetSales = async () => {
  if (!canResetSales.value) {
    resetError.value = 'Você não tem permissão para executar esta ação.';
    emit('error', resetError.value);
    return;
  }
  
  isResetting.value = true;
  resetError.value = null;
  
  try {
    await adminService.resetAllSales();
    resetSuccess.value = true;
    
    // Recarregar os pedidos após o reset
    await orderStore.fetchUserOrders();
    
    // Emitir evento de sucesso
    emit('success');
  } catch (err: any) {
    console.error('Erro ao resetar vendas:', err);
    resetError.value = err.message || 'Erro ao resetar todas as vendas';
    emit('error', resetError.value || 'Erro desconhecido');
  } finally {
    isResetting.value = false;
    showResetModal.value = false;
  }
};
</script>

<template>
  <div v-if="canResetSales" class="reset-sales-container">
    <Button 
      @click="openResetModal" 
      :disabled="isResetting || isButtonDisabled"
      :variant="props.variant"
      :block="props.block"
      class="reset-button text-white hover:bg-[#FEA1A1] transition-colors duration-300 flex items-center justify-center"
    >
      <span v-if="isResetting" class="flex items-center">
        <!-- Spinner animado -->
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Processando...
      </span>
      <span v-else>Resetar Todas as Vendas</span>
    </Button>
    
    <p v-if="props.showHelpText" class="text-sm text-red-500 mt-1 font-medium">
      Cuidado! Esta ação irá excluir permanentemente todos os registros de vendas.
    </p>
    
    <div v-if="resetSuccess" class="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
      Todas as vendas foram resetadas com sucesso!
    </div>
    
    <div v-if="resetError" class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
      {{ resetError }}
    </div>
    
    <!-- Modal de Confirmação -->
    <ResetSalesModal
      :show="showResetModal"
      @close="showResetModal = false"
      @confirm="handleResetSales"
    />
  </div>
</template>

<style scoped>
.reset-button {
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
  transform: translateY(0);
  transition: all 0.2s ease;
  background-color: #e11d48; /* Vermelho mais intenso (red-600) */
  color: white; /* Garantir que o texto seja branco */
}

.reset-button:hover {
  box-shadow: 0 4px 8px rgba(220, 38, 38, 0.3);
  transform: translateY(-1px);
  background-color: #FEA1A1 !important; /* Tom rosa claro ao passar o mouse */
}

.reset-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(220, 38, 38, 0.2);
}
</style>
