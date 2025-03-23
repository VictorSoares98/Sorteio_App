<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
const goBack = () => router.go(-1);
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
    <h1 class="text-4xl font-bold text-primary mb-4">404</h1>
    <h2 class="text-2xl font-semibold mb-6">Página não encontrada</h2>
    <p class="mb-8 text-gray-600">
      A página que você está procurando não existe ou foi removida.
    </p>
    <div class="flex gap-4">
      <button 
        @click="goBack" 
        class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
      >
        Voltar
      </button>
      <router-link 
        to="/" 
        class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
      >
        Ir para Página Inicial
      </router-link>
    </div>
  </div>
</template>
