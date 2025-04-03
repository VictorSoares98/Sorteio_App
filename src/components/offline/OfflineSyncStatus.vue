<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useOrderStore } from '../../stores/orderStore';
import { useConnectionStatus } from '../../services/connectivity';
import { getResolvedConflicts } from '../../services/syncService';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';
import type { Order } from '../../types/order';

const orderStore = useOrderStore();
const { connectionStatus, isOnline } = useConnectionStatus();
const conflictedOrders = ref<Order[]>([]);
const showDetails = ref(false);
const loadingConflicts = ref(false);

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

// Verificar se há sincronizações pendentes
const hasPendingSyncs = computed(() => {
  return orderStore.unsyncedOrdersCount > 0;
});

// Carregar pedidos com conflitos resolvidos
const loadConflictedOrders = async () => {
  if (!showDetails.value) {
    showDetails.value = true;
    loadingConflicts.value = true;
    
    try {
      conflictedOrders.value = await getResolvedConflicts();
    } catch (error) {
      console.error('Erro ao carregar pedidos com conflitos:', error);
    } finally {
      loadingConflicts.value = false;
    }
  } else {
    showDetails.value = false;
  }
};

// Iniciar sincronização manual
const startSync = async () => {
  await orderStore.syncOrders();
  
  // Recarregar os conflitos se estiver mostrando detalhes
  if (showDetails.value) {
    await loadConflictedOrders();
  }
};

// Formatar data para exibição
const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

// Carregar dados iniciais
onMounted(async () => {
  await orderStore.checkUnsyncedOrders();
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
      
      <!-- Alerta para pedidos não sincronizados -->
      <Alert
        v-if="hasPendingSyncs"
        type="warning"
        :message="`Você tem ${orderStore.unsyncedOrdersCount} ${orderStore.unsyncedOrdersCount === 1 ? 'pedido' : 'pedidos'} não sincronizado${orderStore.unsyncedOrdersCount !== 1 ? 's' : ''}.`"
        class="mb-4"
      />
      
      <!-- Botões de ação -->
      <div class="flex space-x-2 mb-4">
        <Button
          @click="startSync"
          variant="primary"
          :disabled="!isOnline || orderStore.syncInProgress || !hasPendingSyncs"
        >
          <span v-if="orderStore.syncInProgress" class="flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sincronizando...
          </span>
          <span v-else>Sincronizar Agora</span>
        </Button>
        
        <Button
          @click="loadConflictedOrders"
          variant="secondary"
          :disabled="orderStore.syncInProgress"
        >
          {{ showDetails ? 'Ocultar Detalhes' : 'Mostrar Detalhes' }}
        </Button>
      </div>
      
      <!-- Resultado da última sincronização -->
      <div v-if="orderStore.lastSyncResult" class="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4">
        <h4 class="font-medium text-gray-700 mb-1">Última sincronização</h4>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <p class="text-sm text-gray-500">Sincronizados</p>
            <p class="text-lg font-medium text-green-600">{{ orderStore.lastSyncResult.synced }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Conflitos</p>
            <p class="text-lg font-medium text-yellow-600">{{ orderStore.lastSyncResult.conflicts }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Falhas</p>
            <p class="text-lg font-medium text-red-600">{{ orderStore.lastSyncResult.failed }}</p>
          </div>
        </div>
      </div>
      
      <!-- Detalhes de pedidos com conflitos -->
      <div v-if="showDetails" class="mt-4">
        <h4 class="font-medium mb-2">Pedidos com Conflitos Resolvidos</h4>
        
        <!-- Carregando conflitos -->
        <div v-if="loadingConflicts" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p class="mt-2 text-gray-500">Carregando...</p>
        </div>
        
        <!-- Sem conflitos -->
        <div v-else-if="conflictedOrders.length === 0" class="text-center py-4 text-gray-500">
          Nenhum pedido com conflito resolvido.
        </div>
        
        <!-- Lista de pedidos com conflitos -->
        <div v-else class="space-y-3">
          <div v-for="order in conflictedOrders" :key="order.id" class="border rounded-lg p-3">
            <div class="flex justify-between mb-2">
              <p class="font-medium">{{ order.buyerName }}</p>
              <p class="text-sm text-gray-500">{{ formatDate(order.createdAt) }}</p>
            </div>
            
            <div class="bg-yellow-50 p-2 rounded-md border border-yellow-200 mb-2">
              <p class="text-sm text-yellow-700 font-medium">Números originais substituídos:</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span 
                  v-for="number in order.originalNumbers" 
                  :key="number"
                  class="bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full text-xs"
                >
                  {{ number }}
                </span>
              </div>
            </div>
            
            <div>
              <p class="text-sm text-gray-700 font-medium">Novos números gerados:</p>
              <div class="flex flex-wrap gap-1 mt-1">
                <span 
                  v-for="number in order.generatedNumbers" 
                  :key="number"
                  class="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs"
                >
                  {{ number }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
