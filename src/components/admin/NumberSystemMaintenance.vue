<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as raffleService from '../../services/raffleNumbers';
import Card from '../ui/Card.vue';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';

const availableCount = ref<number>(0);
const isLoading = ref(false);
const isInitializing = ref(false);
const isSyncing = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

// Obter contagem de números disponíveis
const fetchAvailableCount = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    availableCount.value = await raffleService.getAvailableNumbersCount();
  } catch (err: any) {
    console.error('Erro ao obter contagem:', err);
    error.value = err.message || 'Erro ao verificar números disponíveis';
  } finally {
    isLoading.value = false;
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
    await fetchAvailableCount();
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
    await fetchAvailableCount();
  } catch (err: any) {
    console.error('Erro ao sincronizar números:', err);
    error.value = err.message || 'Erro ao sincronizar números vendidos';
  } finally {
    isSyncing.value = false;
  }
};

// Carregar dados quando o componente for montado
onMounted(() => {
  fetchAvailableCount();
});
</script>

<template>
  <Card title="Manutenção do Sistema de Números">
    <div class="p-4">
      <!-- Alertas -->
      <Alert v-if="error" type="error" :message="error" class="mb-4" dismissible />
      <Alert v-if="success" type="success" :message="success" class="mb-4" dismissible />
      
      <!-- Status do sistema -->
      <div class="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Status do Sistema</h3>
        
        <div v-if="isLoading" class="flex items-center space-x-2">
          <div class="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
          <span>Carregando informações...</span>
        </div>
        
        <div v-else class="flex flex-col space-y-2">
          <p>
            <span class="font-medium">Números disponíveis:</span> 
            <span :class="availableCount > 0 ? 'text-green-600' : 'text-red-600'">
              {{ availableCount }} de 10000
            </span>
          </p>
          
          <p>
            <span class="font-medium">Status:</span>
            <span v-if="availableCount > 0" class="text-green-600 ml-1">Sistema Inicializado</span>
            <span v-else class="text-yellow-600 ml-1">Sistema não inicializado</span>
          </p>
        </div>
      </div>
      
      <!-- Ações de manutenção -->
      <div class="flex flex-col space-y-4">
        <div>
          <Button 
            @click="initializeSystem" 
            :disabled="isInitializing" 
            variant="primary"
            block
          >
            <span v-if="isInitializing">Inicializando...</span>
            <span v-else>Inicializar Sistema de Números</span>
          </Button>
          <p class="text-sm text-gray-500 mt-1">
            Inicializa a coleção de números disponíveis. Use apenas na primeira configuração ou se houver problemas.
          </p>
        </div>
        
        <div>
          <Button 
            @click="syncSoldNumbers" 
            :disabled="isSyncing"
            variant="secondary"
            block
          >
            <span v-if="isSyncing">Sincronizando...</span>
            <span v-else>Sincronizar Números Vendidos</span>
          </Button>
          <p class="text-sm text-gray-500 mt-1">
            Sincroniza a coleção de números disponíveis com os números já vendidos.
          </p>
        </div>
        
        <div>
          <Button 
            @click="fetchAvailableCount" 
            :disabled="isLoading"
            variant="outline"
            block
          >
            <span v-if="isLoading">Atualizando...</span>
            <span v-else>Atualizar Status</span>
          </Button>
        </div>
      </div>
    </div>
  </Card>
</template>
