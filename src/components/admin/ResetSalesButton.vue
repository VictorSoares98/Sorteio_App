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

// Verificar se o usuário pode resetar vendas (admin ou não afiliado)
const canResetSales = computed(() => {
  if (!authStore.currentUser) return false;
  
  // Permitir acesso apenas para admins ou usuários não afiliados
  return authStore.isAdmin || !authStore.currentUser.affiliatedTo;
});

// Abrir modal de confirmação
const openResetModal = () => {
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
      :disabled="isResetting"
      :variant="props.variant"
      :block="props.block"
    >
      <span v-if="isResetting">Processando...</span>
      <span v-else>Resetar Todas as Vendas</span>
    </Button>
    
    <p v-if="props.showHelpText" class="text-sm text-gray-500 mt-1">
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
