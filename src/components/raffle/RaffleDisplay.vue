<script setup lang="ts">
import { computed } from 'vue';
// Importação específica do Luxon em vez de importar tudo
import { DateTime } from 'luxon'; 
import { capitalizeMonth } from '../../utils/formatters';
import RaffleWinnerInfo from './RaffleWinnerInfo.vue';
import RaffleSellerInfo from './RaffleSellerInfo.vue';

// Melhorar tipagem com uma interface específica
interface RaffleDataProps {
  title: string;
  description: string;
  imageUrl: string;
  raffleDate: string;
  price: number;
  isCompleted: boolean;
  winningNumber?: string;
  winner?: {
    name: string;
    phone: string;
    congregation: string;
  } | null;
  seller?: {
    id: string;
    name: string;
    photoURL: string;
  } | null;
}

const props = defineProps<{
  raffleData: RaffleDataProps;
}>();

// Formatar a data para exibição com tratamento correto de fuso horário
const formattedDate = computed(() => {
  if (!props.raffleData.raffleDate) return '';
  
  // Usar Luxon para lidar corretamente com a data sem ajuste de fuso
  // Utilizando o método fromISO com setZone para garantir que a data seja exata
  const formattedDateString = DateTime.fromISO(props.raffleData.raffleDate, { zone: 'UTC' })
    .setLocale('pt-BR')
    .toLocaleString({
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  
  // Aplicar capitalização no mês usando a função do utilitário
  return capitalizeMonth(formattedDateString);
});

// Verificar se o sorteio já foi realizado
const isCompleted = computed(() => {
  return props.raffleData.isCompleted && 
         props.raffleData.winningNumber && 
         props.raffleData.winner;
});

// Verificar se a data do sorteio já passou (sem que tenha sido marcado como completo)
const isPastDate = computed(() => {
  if (!props.raffleData.raffleDate) return false;
  
  // Usar Luxon para comparações de data também
  const raffleDate = DateTime.fromISO(props.raffleData.raffleDate, { zone: 'UTC' }).startOf('day');
  const today = DateTime.now().startOf('day');
  
  return raffleDate < today && !isCompleted.value;
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-md overflow-hidden">
    <!-- Cabeçalho com título -->
    <div class="bg-primary text-white p-4">
      <h2 class="text-xl font-bold text-center">{{ raffleData.title }}</h2>
    </div>
    
    <!-- Status do sorteio -->
    <div v-if="isCompleted" class="bg-green-500 text-white p-2 text-center font-medium">
      ✓ Este sorteio já foi realizado!
    </div>
    <div v-else-if="isPastDate" class="bg-yellow-500 text-white p-2 text-center font-medium">
      ⏰ Aguardando resultado do sorteio...
    </div>
    <div v-else class="bg-gray-900 text-white p-2 text-center font-medium">
      🎯 Sorteio em andamento!
    </div>
    
    <!-- Imagem do item sorteado em um frame decorativo -->
    <div class="p-6 flex justify-center">
      <div class="relative max-w-md">
        <!-- Frame decorativo -->
        <div class="absolute inset-0 border-8 border-primary/20 rounded-lg transform rotate-1"></div>
        <div class="absolute inset-0 border-8 border-primary/30 rounded-lg transform -rotate-1"></div>
        
        <!-- Imagem principal -->
        <img 
          v-if="raffleData.imageUrl" 
          :src="raffleData.imageUrl" 
          :alt="raffleData.title"
          class="relative z-10 rounded-lg shadow-lg w-full h-auto"
        />
        
        <!-- Placeholder para quando não há imagem -->
        <div v-else class="relative z-10 rounded-lg shadow-lg w-full bg-gray-100 flex flex-col items-center justify-center p-8" style="min-height: 250px;">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-gray-500 text-center">Imagem do prêmio não inserida</p>
          <p class="text-sm text-gray-400 mt-2 text-center">Os detalhes do item estão na descrição abaixo</p>
        </div>
        
        <!-- Badge de preço quando o sorteio está ativo -->
        <div v-if="!isCompleted" class="absolute -top-3 -right-3 z-20 bg-primary text-white rounded-full py-2 px-4 shadow-md font-bold transform rotate-12">
          R$ {{ raffleData.price?.toFixed(2).replace('.', ',') }}
        </div>
      </div>
    </div>
    
    <!-- Detalhes do sorteio -->
    <div class="p-6 bg-gray-50">
      <!-- Data do sorteio -->
      <div class="mb-4 text-center">
        <span class="font-medium text-gray-600">Data do sorteio:</span>
        <span class="text-primary font-bold ml-2">{{ formattedDate }}</span>
      </div>
      
      <!-- Descrição do item -->
      <div class="bg-white p-4 rounded-md border border-gray-200 mb-6">
        <h3 class="text-lg font-medium text-gray-800 mb-2">Sobre o prêmio:</h3>
        <p class="text-gray-700">{{ raffleData.description }}</p>
      </div>
      
      <!-- Quando o sorteio já foi realizado -->
      <template v-if="isCompleted">
        <div class="border-t border-gray-300 my-6"></div>
        
        <!-- Número sorteado -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 class="text-center font-bold text-lg text-yellow-800 mb-2">Número Premiado</h3>
          <div class="flex justify-center">
            <div class="bg-white border-2 border-yellow-500 rounded-lg px-6 py-3 shadow-md">
              <span class="font-mono text-3xl font-bold tracking-widest text-primary">
                {{ raffleData.winningNumber }}
              </span>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Componente de informações do vencedor -->
          <RaffleWinnerInfo :winner="raffleData.winner || null" />
          
          <!-- Componente de informações do vendedor -->
          <RaffleSellerInfo :seller="raffleData.seller ?? null" />
        </div>
      </template>
    </div>
  </div>
</template>
