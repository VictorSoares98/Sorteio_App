<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as raffleService from '../../services/raffleNumbers';
import { getNumbersStatusCount } from '../../services/raffleBatchService';
import { NUMBER_STATUS } from '../../utils/batchConstants';
import Card from '../ui/Card.vue';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';
import ResetSalesButton from './ResetSalesButton.vue';

const availableCount = ref<number>(0);
const pendingCount = ref<number>(0);
const soldCount = ref<number>(0);
const isLoading = ref(false);
const isInitializing = ref(false);
const isSyncing = ref(false);
const isCleaning = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const usingBatchSystem = ref<boolean>(false);
const cleanupInterval = ref<number | null>(null);

// Obter estatísticas do sistema
const fetchSystemStats = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    // Verificar se estamos usando batches
    const isBatchInitialized = await isBatchSystem();
    usingBatchSystem.value = isBatchInitialized;
    
    if (isBatchInitialized) {
      // Buscar contagens por status usando o sistema de batches
      const statusCounts = await getNumbersStatusCount();
      availableCount.value = statusCounts[NUMBER_STATUS.AVAILABLE] || 0;
      pendingCount.value = statusCounts[NUMBER_STATUS.PENDING] || 0;
      soldCount.value = statusCounts[NUMBER_STATUS.SOLD] || 0;
    } else {
      // Usar método legado
      availableCount.value = await raffleService.getAvailableNumbersCount();
      // No sistema legado não temos contagem precisa de pendentes
      pendingCount.value = 0;
      // Estimar números vendidos
      soldCount.value = 10000 - availableCount.value;
    }
  } catch (err: any) {
    console.error('Erro ao obter estatísticas do sistema:', err);
    error.value = err.message || 'Erro ao verificar números disponíveis';
  } finally {
    isLoading.value = false;
  }
};

// Verificar se o sistema de batches está inicializado
const isBatchSystem = async (): Promise<boolean> => {
  try {
    return await raffleService.isBatchSystemInitialized();
  } catch (err) {
    console.error('Erro ao verificar sistema de batches:', err);
    return false;
  }
};

// Inicializar sistema de números
const initializeSystem = async () => {
  isInitializing.value = true;
  error.value = null;
  success.value = null;
  
  try {
    await raffleService.initAvailableNumbersCollection();
    success.value = 'Sistema de números inicializado com sucesso!';
    usingBatchSystem.value = true;
    await fetchSystemStats();
  } catch (err: any) {
    console.error('Erro ao inicializar sistema:', err);
    error.value = err.message || 'Erro ao inicializar sistema de números';
  } finally {
    isInitializing.value = false;
  }
};

// Sincronizar números vendidos
const syncSoldNumbers = async () => {
  isSyncing.value = true;
  error.value = null;
  success.value = null;
  
  try {
    await raffleService.syncAvailableNumbersWithSoldOnes();
    success.value = 'Sincronização concluída com sucesso!';
    await fetchSystemStats();
  } catch (err: any) {
    console.error('Erro ao sincronizar números:', err);
    error.value = err.message || 'Erro ao sincronizar números vendidos';
  } finally {
    isSyncing.value = false;
  }
};

// Limpar reservas expiradas
const cleanupReservations = async () => {
  isCleaning.value = true;
  error.value = null;
  
  try {
    if (usingBatchSystem.value) {
      const clearedCount = await raffleService.cleanupExpiredReservations();
      if (clearedCount > 0) {
        success.value = `${clearedCount} reservas expiradas foram limpas com sucesso!`;
      } else {
        success.value = 'Não foram encontradas reservas expiradas para limpar.';
      }
      await fetchSystemStats();
    } else {
      success.value = 'Esta função está disponível apenas para o sistema de batches.';
    }
  } catch (err: any) {
    console.error('Erro ao limpar reservas:', err);
    error.value = err.message || 'Erro ao limpar reservas expiradas';
  } finally {
    isCleaning.value = false;
  }
};

// Configurar limpeza periódica de reservas
const setupAutomaticCleanup = () => {
  // Executar limpeza a cada 5 minutos
  cleanupInterval.value = window.setInterval(async () => {
    console.log('Executando limpeza automática de reservas...');
    if (usingBatchSystem.value) {
      try {
        const clearedCount = await raffleService.cleanupExpiredReservations();
        if (clearedCount > 0) {
          console.log(`Limpeza automática: ${clearedCount} reservas expiradas removidas`);
          // Atualizar estatísticas silenciosamente se algo foi alterado
          fetchSystemStats();
        }
      } catch (err) {
        console.error('Erro na limpeza automática:', err);
      }
    }
  }, 5 * 60 * 1000); // 5 minutos
};

// Lifecycle hooks
onMounted(() => {
  fetchSystemStats();
  setupAutomaticCleanup();
});

onUnmounted(() => {
  if (cleanupInterval.value !== null) {
    clearInterval(cleanupInterval.value);
  }
});
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-6">Manutenção do Sistema de Números</h2>
    
    <!-- Status do sistema -->
    <Card class="mb-6">
      <template #header>
        <h3 class="text-lg font-medium">Status do Sistema</h3>
      </template>
      <template #default>
        <div v-if="isLoading" class="flex justify-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          <span class="ml-3">Verificando sistema...</span>
        </div>
        <div v-else>
          <div class="mb-4">
            <div class="flex justify-between items-center mb-2">
              <span>Tipo de sistema:</span>
              <span v-if="usingBatchSystem" class="bg-green-100 text-green-800 px-2 py-1 rounded">
                Sistema de Batches (Otimizado)
              </span>
              <span v-else class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Sistema Legado
              </span>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div class="text-green-700 font-medium">Disponíveis</div>
              <div class="text-2xl font-bold">{{ availableCount.toLocaleString() }}</div>
            </div>
            
            <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="text-yellow-700 font-medium">Reservados</div>
              <div class="text-2xl font-bold">{{ pendingCount.toLocaleString() }}</div>
            </div>
            
            <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div class="text-blue-700 font-medium">Vendidos</div>
              <div class="text-2xl font-bold">{{ soldCount.toLocaleString() }}</div>
            </div>
          </div>
          
          <Button 
            @click="fetchSystemStats" 
            class="w-full" 
            :variant="'secondary'"
            :disabled="isLoading"
          >
            <template #icon>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
              </svg>
            </template>
            Atualizar Status
          </Button>
        </div>
      </template>
    </Card>
    
    <!-- Mensagens -->
    <Alert v-if="error" type="error" :message="error" class="mb-4" />
    <Alert v-if="success" type="success" :message="success" class="mb-4" />
    
    <!-- Ações de manutenção -->
    <Card>
      <template #header>
        <h3 class="text-lg font-medium">Ações de Manutenção</h3>
      </template>
      <template #default>
        <div class="space-y-4">
          <!-- Inicializar sistema -->
          <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 class="font-medium mb-2">Inicializar Sistema de Números</h4>
            <p class="text-sm text-gray-600 mb-3">
              {{ usingBatchSystem ? 
                'O sistema de batches já foi inicializado. Você pode reinicializar se necessário.' : 
                'Converta para o sistema otimizado de batches para maior desempenho e suporte a múltiplos sorteios.' 
              }}
            </p>
            <Button 
              @click="initializeSystem" 
              :loading="isInitializing"
              :disabled="isInitializing"
              :variant="usingBatchSystem ? 'secondary' : 'primary'"
              class="w-full"
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
                </svg>
              </template>
              {{ usingBatchSystem ? 'Reinicializar Sistema' : 'Inicializar Sistema de Batches' }}
            </Button>
          </div>
          
          <!-- Sincronizar números vendidos -->
          <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 class="font-medium mb-2">Sincronizar Números Vendidos</h4>
            <p class="text-sm text-gray-600 mb-3">
              Sincroniza os números vendidos em pedidos com o sistema de disponibilidade.
              Execute esta ação após resetar pedidos ou se houver inconsistências.
            </p>
            <Button 
              @click="syncSoldNumbers" 
              :loading="isSyncing"
              :disabled="isSyncing"
              variant="secondary"
              class="w-full"
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clip-rule="evenodd" />
                </svg>
              </template>
              Sincronizar Números
            </Button>
          </div>
          
          <!-- Limpar reservas expiradas -->
          <div class="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h4 class="font-medium mb-2">Limpar Reservas Expiradas</h4>
            <p class="text-sm text-gray-600 mb-3">
              Libera automaticamente os números que foram reservados e não confirmados.
              <span v-if="usingBatchSystem" class="text-primary">
                (Esta ação também é executada automaticamente a cada 5 minutos)
              </span>
            </p>
            <Button 
              @click="cleanupReservations" 
              :loading="isCleaning"
              :disabled="isCleaning || !usingBatchSystem"
              :variant="usingBatchSystem ? 'secondary' : 'outline'"
              class="w-full"
            >
              <template #icon>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </template>
              Limpar Reservas Expiradas
            </Button>
          </div>
          
          <!-- Resetar todos os dados -->
          <div class="p-4 border rounded-lg bg-red-50 border-red-200">
            <h4 class="font-medium mb-2 text-red-700">Resetar Dados do Sorteio</h4>
            <p class="text-sm text-gray-600 mb-3">
              Esta ação irá excluir todos os pedidos e resetar o sistema de números.
              Esta operação é irreversível.
            </p>
            <ResetSalesButton 
              @reset-completed="fetchSystemStats" 
              buttonText="Resetar Todos os Dados"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
