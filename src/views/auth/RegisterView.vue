<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import RegisterForm from '../../components/auth/RegisterForm.vue';

const route = useRoute();
const affiliateCode = ref<string | null>(null);
const affiliationMessage = ref<string | null>(null);

onBeforeMount(() => {
  // Verificar código de afiliado na URL ou localStorage
  const refCode = route.query.ref as string || localStorage.getItem('pendingAffiliateCode');
  
  if (refCode) {
    console.log('[RegisterView] Código de afiliado encontrado:', refCode);
    affiliateCode.value = refCode;
    affiliationMessage.value = 'Você foi convidado e está se cadastrando vinculado a outro usuário.';
  }
});

// Capturar o código de afiliação da URL e armazená-lo
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    console.log('[RegisterView] Código de afiliado detectado na URL:', refCode);
    localStorage.setItem('pendingAffiliateCode', refCode);
    
    // Definir o código para exibição se ainda não estiver definido
    if (!affiliateCode.value) {
      affiliateCode.value = refCode;
      affiliationMessage.value = 'Você foi convidado e está se cadastrando vinculado a outro usuário.';
    }
    
    // Log de diagnóstico
    console.log('[RegisterView] Estado atual da afiliação pendente:', {
      codigoUrl: refCode,
      codigoLocalStorage: localStorage.getItem('pendingAffiliateCode')
    });
  } else {
    console.log('[RegisterView] Nenhum código de afiliado na URL');
  }
});
</script>

<template>
  <div class="flex justify-center items-center min-h-[80vh]">
    <div class="w-full max-w-md">
      <h1 class="text-3xl font-bold mb-8 text-center">Cadastro</h1>
      
      <!-- Mensagem de afiliação quando aplicável -->
      <div v-if="affiliationMessage" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
        <div class="flex items-center justify-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="font-medium">{{ affiliationMessage }}</span>
        </div>
        <div class="mt-2 text-center p-2 bg-white rounded-md border border-blue-100">
          <p class="text-xs text-blue-600 mb-1">Código de Convite:</p>
          <p class="font-mono font-bold text-lg text-primary">{{ affiliateCode }}</p>
        </div>
      </div>
      
      <RegisterForm />
    </div>
  </div>
</template>
