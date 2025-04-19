<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  raffleData: any;
}>();

// Formatar a data para exibição
const formattedDate = computed(() => {
  if (!props.raffleData.raffleDate) return '';
  
  const date = new Date(props.raffleData.raffleDate);
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
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
  
  const raffleDate = new Date(props.raffleData.raffleDate);
  const today = new Date();
  
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
          :src="raffleData.imageUrl" 
          :alt="raffleData.title"
          class="relative z-10 rounded-lg shadow-lg w-full h-auto"
        />
        
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
          <!-- Vencedor do sorteio -->
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 class="text-center font-bold text-lg text-green-800 mb-3">Vencedor</h3>
            <div class="text-center">
              <p class="font-bold text-xl text-gray-800">{{ raffleData.winner.name }}</p>
              <p class="text-gray-600 mt-1">{{ raffleData.winner.phone }}</p>
              <p class="text-gray-600">{{ raffleData.winner.congregation }}</p>
            </div>
          </div>
          
          <!-- Vendedor do número premiado -->
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 class="text-center font-bold text-lg text-blue-800 mb-3">Vendido por</h3>
            <div class="flex flex-col items-center">
              <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-primary mb-2">
                <img 
                  :src="raffleData.seller.photoURL" 
                  :alt="raffleData.seller.name" 
                  class="w-full h-full object-cover"
                  onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(this.alt)+'&backgroundColor=FF8C00'"
                />
              </div>
              <p class="font-bold text-gray-800">{{ raffleData.seller.name }}</p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
