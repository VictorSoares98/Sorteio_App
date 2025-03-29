<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import RegisterForm from '../../components/auth/RegisterForm.vue';
import { useAffiliateCode } from '../../composables/useAffiliateCode';
import Alert from '../../components/ui/Alert.vue';

const route = useRoute();
const affiliateCode = ref<string | null>(null);
const affiliationMessage = ref<string | null>(null);
const isCodeValid = ref<boolean>(true);
const isCheckingCode = ref<boolean>(false);
const errorMessage = ref<string | null>(null);

// Usar o composable para verificar a validade do código
const { checkAffiliateCode } = useAffiliateCode();

// Verificar se o código é válido
const validateAffiliateCode = async (code: string) => {
  if (!code) return;
  
  isCheckingCode.value = true;
  try {
    // Utilizar a função que já verifica expiração
    const user = await checkAffiliateCode(code);
    
    if (user) {
      isCodeValid.value = true;
      affiliationMessage.value = `Você foi convidado por ${user.displayName} e está se cadastrando vinculado a esta conta.`;
    } else {
      isCodeValid.value = false;
      errorMessage.value = 'O código de afiliação é inválido ou expirou. Você pode se cadastrar normalmente.';
      // Limpar o código expirado
      localStorage.removeItem('pendingAffiliateCode');
      affiliateCode.value = null;
    }
  } catch (err) {
    console.error('[RegisterView] Erro ao validar código:', err);
    isCodeValid.value = false;
    errorMessage.value = 'Não foi possível verificar o código. Você pode se cadastrar normalmente.';
  } finally {
    isCheckingCode.value = false;
  }
};

onBeforeMount(() => {
  // Verificar código de afiliado na URL ou localStorage
  const refCode = route.query.ref as string || localStorage.getItem('pendingAffiliateCode');
  
  if (refCode) {
    console.log('[RegisterView] Código de afiliado encontrado:', refCode);
    affiliateCode.value = refCode;
    
    // Validar o código imediatamente
    validateAffiliateCode(refCode);
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
      validateAffiliateCode(refCode);
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

// Fechar alerta de erro
const dismissError = () => {
  errorMessage.value = null;
};
</script>

<template>
  <div class="flex justify-center items-center min-h-[80vh]">
    <div class="w-full max-w-md">
      <h1 class="text-3xl font-bold mb-8 text-center">Cadastro</h1>
      
      <!-- Mensagem de erro para código expirado ou inválido -->
      <Alert 
        v-if="errorMessage" 
        type="error" 
        :message="errorMessage" 
        dismissible 
        class="mb-4"
        @dismiss="dismissError"
      />
      
      <!-- Mensagem de afiliação quando aplicável e código válido -->
      <div v-if="affiliationMessage && isCodeValid && affiliateCode" class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700">
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
      
      <!-- Indicador de carregamento ao verificar código -->
      <div v-if="isCheckingCode" class="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-600 flex justify-center">
        <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Verificando código de afiliação...</span>
      </div>
      
      <RegisterForm />
    </div>
  </div>
</template>
