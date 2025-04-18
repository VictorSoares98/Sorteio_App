<script setup lang="ts">
import { computed } from 'vue';
import { useOrderStore } from '../../stores/orderStore';
import { useConnectionStatus } from '../../services/connectivity';
import Alert from '../ui/Alert.vue';

const orderStore = useOrderStore();
const { connectionStatus, isOnline } = useConnectionStatus();

// Status de conexão para exibição
const statusDisplay = computed(() => {
  switch (connectionStatus.value) {
    case 'online':
      return { text: 'Online', class: 'text-green-500', icon: 'wifi' };
    case 'offline':
      return { text: 'Offline', class: 'text-red-500', icon: 'wifi-off' };
    case 'reconnecting':
      return { text: 'Sincronizando...', class: 'text-yellow-500', icon: 'refresh' };
    default:
      return { text: 'Desconhecido', class: 'text-gray-500', icon: 'help' };
  }
});

// Verificar se há pedidos pendentes
const hasPendingOperations = computed(() => {
  return orderStore.pendingOrdersCount > 0;
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-md">
    <div class="p-4 border-b">
      <h3 class="text-lg font-medium">Status de Sincronização</h3>
    </div>
    
    <div class="p-4">
      <!-- Status de conexão -->
      <div class="flex items-center mb-3">
        <span class="flex items-center" :class="statusDisplay.class">
          <!-- Ícone para status online -->
          <svg v-if="statusDisplay.icon === 'wifi'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          
          <!-- Ícone para status offline -->
          <svg v-else-if="statusDisplay.icon === 'wifi-off'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          
          <!-- Ícone para sincronização em andamento -->
          <svg v-else-if="statusDisplay.icon === 'refresh'" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          
          {{ statusDisplay.text }}
        </span>
      </div>
      
      <!-- Alerta para pedidos pendentes -->
      <Alert
        v-if="hasPendingOperations"
        type="warning"
        :message="`Você tem ${orderStore.pendingOrdersCount} ${orderStore.pendingOrdersCount === 1 ? 'pedido' : 'pedidos'} pendente${orderStore.pendingOrdersCount !== 1 ? 's' : ''} de sincronização.`"
        class="mb-4"
      />
      
      <!-- Mensagem quando não há operações pendentes -->
      <div v-else class="text-center py-4 text-green-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>Todos os pedidos estão sincronizados</p>
      </div>
      
      <!-- Informações sobre modo offline -->
      <div v-if="!isOnline" class="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
        <h4 class="font-medium text-yellow-700 mb-1">Modo Offline Ativo</h4>
        <p class="text-sm text-yellow-600">
          Você está trabalhando no modo offline. Seus pedidos serão salvos localmente e sincronizados automaticamente quando sua conexão for restaurada.
        </p>
      </div>
    </div>
  </div>
</template>
