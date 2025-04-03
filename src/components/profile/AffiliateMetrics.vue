<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAffiliateCode } from '../../composables/useAffiliateCode';
import Card from '../ui/Card.vue';
import AffiliateMetricsChart from '../charts/AffiliateMetricsChart.vue';

// Estados
const selectedAffiliateId = ref<string | null>(null);
const loading = ref(false);

// Obter afiliados e métricas do composable
const { 
  affiliatedUsers, 
  affiliateSalesMetrics, 
  fetchAffiliatedUsers 
} = useAffiliateCode();

// Carregar dados quando o componente for montado
onMounted(async () => {
  loading.value = true;
  try {
    await fetchAffiliatedUsers();
    // Se tiver afiliados, selecionar o primeiro por padrão
    if (affiliatedUsers.value.length > 0) {
      selectedAffiliateId.value = affiliatedUsers.value[0].id;
    }
  } catch (error) {
    console.error('Erro ao carregar afiliados:', error);
  } finally {
    loading.value = false;
  }
});

// Afiliado selecionado
const selectedAffiliate = computed(() => {
  if (!selectedAffiliateId.value) return null;
  return affiliatedUsers.value.find(user => user.id === selectedAffiliateId.value) || null;
});

// Classificar afiliados por desempenho
const sortedAffiliates = computed(() => {
  return [...affiliatedUsers.value].sort((a, b) => {
    const metricsA = affiliateSalesMetrics.value[a.id];
    const metricsB = affiliateSalesMetrics.value[b.id];
    
    if (!metricsA) return 1;
    if (!metricsB) return -1;
    
    return metricsB.totalSales - metricsA.totalSales;
  });
});

// Calcular avatar padrão baseado no nome do usuário
const getDefaultAvatar = (name: string) => {
  const seed = encodeURIComponent(name || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=FF8C00`;
};

// Selecionar um afiliado
const selectAffiliate = (id: string) => {
  selectedAffiliateId.value = id;
};
</script>

<template>
  <Card title="Métricas de Afiliados" subtitle="Desempenho da sua rede de afiliados">
    <div class="p-4">
      <div v-if="loading" class="flex justify-center items-center p-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
      
      <div v-else-if="affiliatedUsers.length === 0" class="text-center py-10 px-4 bg-gray-50 rounded-lg border border-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <p class="text-gray-600 text-xl font-medium">Você ainda não possui afiliados</p>
        <p class="text-gray-500 max-w-md mx-auto mt-2">Compartilhe seu código de afiliação para começar a formar sua rede e visualizar o desempenho dos seus afiliados.</p>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Lista de afiliados com novo visual -->
        <div class="md:col-span-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div class="bg-primary bg-opacity-5 border-b border-gray-200 p-4">
            <h3 class="text-base font-medium text-gray-900 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Seus Afiliados
            </h3>
            
            <div class="mt-3 bg-white rounded-md p-3 border border-gray-200 flex items-center">
              <div class="mr-3 bg-primary bg-opacity-10 text-primary rounded-full h-8 w-8 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p class="text-sm text-gray-500">Total de afiliados</p>
                <p class="text-xl font-bold text-primary">{{ affiliatedUsers.length }}</p>
              </div>
            </div>
          </div>
          
          <div class="overflow-y-auto max-h-[500px] p-2">
            <ul class="space-y-2">
              <li 
                v-for="affiliate in sortedAffiliates" 
                :key="affiliate.id"
                class="p-2 rounded-lg transition-colors cursor-pointer"
                :class="selectedAffiliateId === affiliate.id 
                  ? 'bg-primary bg-opacity-10 border border-primary border-opacity-20' 
                  : 'hover:bg-gray-50 border border-transparent'"
                @click="selectAffiliate(affiliate.id)"
              >
                <div class="flex items-center space-x-3">
                  <div class="flex-shrink-0 relative">
                    <img 
                      :src="affiliate.photoURL || getDefaultAvatar(affiliate.displayName)" 
                      :alt="affiliate.displayName"
                      class="w-12 h-12 rounded-full object-cover border-2"
                      :class="selectedAffiliateId === affiliate.id ? 'border-primary' : 'border-gray-200'"
                    />
                    <div v-if="affiliateSalesMetrics[affiliate.id]?.totalSales > 0" 
                         class="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                      {{ affiliateSalesMetrics[affiliate.id].totalSales }}
                    </div>
                  </div>
                  
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-gray-900 truncate flex items-center">
                      {{ affiliate.displayName }}
                      <span v-if="selectedAffiliateId === affiliate.id" class="ml-1 text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </p>
                    <p class="text-xs text-gray-500 truncate">{{ affiliate.email }}</p>
                    
                    <!-- Indicador de desempenho -->
                    <div v-if="affiliateSalesMetrics[affiliate.id]" class="mt-1 flex items-center">
                      <div class="flex items-center mr-2">
                        <svg v-if="affiliateSalesMetrics[affiliate.id].growthRate >= 0" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-green-500 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-red-500 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                        </svg>
                        <span class="text-xs" :class="affiliateSalesMetrics[affiliate.id].growthRate >= 0 ? 'text-green-600' : 'text-red-600'">
                          {{ affiliateSalesMetrics[affiliate.id].growthRate }}%
                        </span>
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ affiliateSalesMetrics[affiliate.id].salesThisMonth }} este mês
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <!-- Detalhes do afiliado selecionado -->
        <div class="md:col-span-2">
          <div v-if="selectedAffiliate && selectedAffiliateId" class="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div class="p-4 border-b border-gray-200 bg-gradient-to-r from-primary to-primary-dark">
              <div class="flex items-center space-x-4">
                <div class="bg-white p-1 rounded-full">
                  <img 
                    :src="selectedAffiliate.photoURL || getDefaultAvatar(selectedAffiliate.displayName)" 
                    :alt="selectedAffiliate.displayName"
                    class="w-16 h-16 rounded-full object-cover border-2 border-white"
                  />
                </div>
                
                <div class="text-white">
                  <h3 class="text-xl font-medium">{{ selectedAffiliate.displayName }}</h3>
                  <p class="text-white text-opacity-80">{{ selectedAffiliate.email }}</p>
                  <div class="flex mt-1 space-x-2">
                    <span class="px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-20 backdrop-filter backdrop-blur-sm">
                      {{ selectedAffiliate.congregation || 'Sem congregação' }}
                    </span>
                    <span class="px-2 py-0.5 text-xs rounded-full bg-white bg-opacity-20 backdrop-filter backdrop-blur-sm">
                      Afiliado desde {{ new Date(selectedAffiliate.createdAt).toLocaleDateString('pt-BR') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Renderizar o componente de gráfico -->
            <div class="p-4">
              <AffiliateMetricsChart 
                v-if="selectedAffiliateId" 
                :affiliate-id="selectedAffiliateId" 
                :affiliate="selectedAffiliate" 
              />
            </div>
          </div>
          
          <div v-else class="bg-white rounded-lg shadow-md border border-gray-200 h-full flex items-center justify-center">
            <div class="text-center p-8">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <p class="text-gray-600 font-medium">Selecione um afiliado</p>
              <p class="text-gray-500 mt-1 max-w-md">Escolha um afiliado na lista para visualizar suas métricas de desempenho detalhadas.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
