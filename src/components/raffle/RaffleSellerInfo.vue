<script setup lang="ts">
/**
 * Componente para exibir as informações do vendedor do número premiado
 */
interface Seller {
  id: string;
  name: string;
  photoURL: string;
}

defineProps<{
  seller: Seller;
}>();

// Função para gerar avatar padrão caso a imagem falhe ao carregar
const generateFallbackAvatar = (name: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=FF8C00`;
};
</script>

<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h3 class="text-center font-bold text-lg text-blue-800 mb-3">Vendido por</h3>
    <div class="flex flex-col items-center">
      <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-primary mb-2">
        <img 
          :src="seller.photoURL" 
          :alt="seller.name" 
          class="w-full h-full object-cover"
          @error="($event.target as HTMLImageElement).src = generateFallbackAvatar(seller.name)"
        />
      </div>
      <p class="font-bold text-gray-800">{{ seller.name }}</p>
    </div>
  </div>
</template>
