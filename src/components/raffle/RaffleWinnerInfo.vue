<script setup lang="ts">
/**
 * Componente para exibir as informações do vencedor do sorteio
 */
interface Winner {
  name: string;
  phone: string;
  congregation: string;
}

defineProps<{
  winner: Winner | null;
}>();
</script>

<template>
  <div class="bg-green-50 border border-green-200 rounded-lg p-4" role="region" aria-label="Informações do vencedor">
    <h3 class="text-center font-bold text-lg text-green-800 mb-3">Vencedor</h3>
    <div v-if="winner" class="text-center">
      <p class="font-bold text-xl text-gray-800">{{ winner.name }}</p>
      <p class="text-gray-600 mt-1">{{ winner.phone }}</p>
      <p class="text-gray-600">{{ winner.congregation }}</p>
    </div>
    <div v-else class="text-center text-gray-500 p-2">
      Informações do vencedor não disponíveis
    </div>
  </div>
</template>
