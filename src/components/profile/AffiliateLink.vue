<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAffiliateCode } from '../../composables/useAffiliateCode';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';
import Button from '../ui/Button.vue';

// Hooks - usar o composable que já tem toda a lógica necessária
const { 
  currentUser, 
  loading, 
  error,
  success,
  affiliatedUsers,
  generateTemporaryAffiliateCode,
  affiliateToUser,
  fetchAffiliatedUsers,
  timeRemaining,
  isCodeValid,
  isGeneratingCode,
  checkCurrentCode
} = useAffiliateCode();

// Estados
const copied = ref(false);
const codeCopied = ref(false);
const affiliateTarget = ref('');
const isEmail = ref(false);
const affiliating = ref(false);
const checkingInterval = ref<number | null>(null);

// Computados
const affiliateCode = computed(() => currentUser.value?.affiliateCode || null);
const affiliateLink = computed(() => {
  if (!affiliateCode.value) return '';
  return `${window.location.origin}?ref=${affiliateCode.value}`;
});

// Verificar regularmente se o código ainda é válido
const startExpiryCheck = () => {
  if (checkingInterval.value) {
    clearInterval(checkingInterval.value);
  }
  
  // Verificar a cada 30 segundos se o código expirou
  checkingInterval.value = window.setInterval(() => {
    checkCurrentCode();
  }, 30000);
};

// Verificar se o usuário pode se afiliar (não tem afiliados)
const canAffiliate = computed(() => {
  if (!currentUser.value) return false;
  
  // Se o usuário já está afiliado a alguém, não precisa mostrar esse aviso
  if (currentUser.value.affiliatedTo) return false;
  
  // Se tem afiliados, não pode se afiliar a outra pessoa
  return !(currentUser.value.affiliates && currentUser.value.affiliates.length > 0);
});

// Verificar se o usuário já está afiliado a alguém
const isAlreadyAffiliated = computed(() => {
  return !!currentUser.value?.affiliatedTo;
});

// Validar o formato do código/email antes de enviar
const isValidTarget = computed(() => {
  if (!affiliateTarget.value) return false;
  
  if (isEmail.value) {
    // Validação básica de email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(affiliateTarget.value);
  } else {
    // Códigos de afiliado têm 6 caracteres alfanuméricos (aceita minúsculas ou maiúsculas)
    return /^[A-Za-z0-9]{6}$/.test(affiliateTarget.value);
  }
});

// Normaliza o código de afiliação para caixa alta
const normalizeAffiliateCode = (code: string): string => {
  return code.toUpperCase();
};

// Contagem de afiliados
const affiliatesCount = computed(() => {
  return affiliatedUsers.value.length;
});

// Exibir resumo da rede de afiliação
const affiliationSummary = computed(() => {
  if (isAlreadyAffiliated.value) {
    return `Você está afiliado a ${currentUser.value?.affiliatedTo}`;
  }
  
  if (affiliatesCount.value > 0) {
    return `Você tem ${affiliatesCount.value} ${affiliatesCount.value === 1 ? 'afiliado' : 'afiliados'}`;
  }
  
  return 'Você ainda não tem afiliações';
});

// Gerar código temporário de afiliado
const generateCode = async () => {
  try {
    console.log('[AffiliateLink] Gerando código temporário');
    await generateTemporaryAffiliateCode();
    console.log('[AffiliateLink] Código temporário gerado');
    
    // Iniciar verificação periódica após gerar código
    startExpiryCheck();
  } catch (err) {
    console.error('[AffiliateLink] Erro ao gerar código:', err);
  }
};

// Processar afiliação com validação e feedback melhorados
const processAffiliation = async () => {
  if (!affiliateTarget.value || !isValidTarget.value) {
    error.value = isEmail.value 
      ? 'Por favor, insira um email válido' 
      : 'O código de afiliado deve ter 6 caracteres';
    return;
  }
  
  affiliating.value = true;
  try {
    console.log('[AffiliateLink] Iniciando processo de afiliação');
    // Normalizar o código para maiúsculas antes de enviar
    const normalizedTarget = isEmail.value 
      ? affiliateTarget.value 
      : normalizeAffiliateCode(affiliateTarget.value);
    
    const response = await affiliateToUser(normalizedTarget, isEmail.value);
    
    if (response && response.success) {
      console.log('[AffiliateLink] Afiliação bem-sucedida');
      // Limpar campo após sucesso
      affiliateTarget.value = '';
    } else {
      console.warn('[AffiliateLink] Afiliação falhou:', response?.message);
    }
  } catch (err) {
    console.error('[AffiliateLink] Erro ao processar afiliação:', err);
  } finally {
    affiliating.value = false;
  }
};

// Copiar link para clipboard
const copyToClipboard = () => {
  if (!affiliateLink.value) return;
  
  navigator.clipboard.writeText(affiliateLink.value)
    .then(() => {
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    })
    .catch(err => {
      console.error('Falha ao copiar texto:', err);
    });
};

// Função para copiar apenas o código
const copyCodeToClipboard = () => {
  if (!affiliateCode.value) return;
  
  navigator.clipboard.writeText(affiliateCode.value)
    .then(() => {
      codeCopied.value = true;
      setTimeout(() => {
        codeCopied.value = false;
      }, 2000);
    })
    .catch(err => {
      console.error('Falha ao copiar código:', err);
    });
};

// Observar mudanças no código e expiração
watch(() => currentUser.value?.affiliateCode, (newVal) => {
  if (newVal) {
    startExpiryCheck();
  } else if (checkingInterval.value) {
    clearInterval(checkingInterval.value);
    checkingInterval.value = null;
  }
});

// Carregar afiliados e iniciar verificação quando o componente é montado
onMounted(async () => {
  console.log('[AffiliateLink] Componente montado, buscando afiliados');
  try {
    await fetchAffiliatedUsers();
    console.log('[AffiliateLink] Afiliados carregados:', affiliatedUsers.value.length);
    
    // Iniciar verificação do código se existir
    if (currentUser.value?.affiliateCode) {
      checkCurrentCode();
      startExpiryCheck();
    }
  } catch (err) {
    console.error('[AffiliateLink] Erro ao carregar afiliados:', err);
  }
});

// Limpar intervalo quando o componente é desmontado
onUnmounted(() => {
  if (checkingInterval.value) {
    clearInterval(checkingInterval.value);
    checkingInterval.value = null;
  }
});
</script>

<template>
  <Card 
    title="Programa de Afiliações" 
    :subtitle="affiliationSummary" 
    class="mb-6"
  >
    <div class="p-4">
      <!-- Alertas -->
      <Alert
        v-if="error"
        type="error"
        :message="error"
        dismissible
        class="mb-4"
      />

      <Alert
        v-if="success"
        type="success"
        :message="success"
        dismissible
        class="mb-4"
      />

      <!-- Usuário já afiliado -->
      <div v-if="isAlreadyAffiliated" class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <h3 class="text-lg font-medium text-green-700 mb-2">Você está afiliado</h3>
        <p class="text-green-600">
          Você já está afiliado a <strong>{{ currentUser?.affiliatedTo }}</strong>
        </p>
        <p v-if="currentUser?.affiliatedToEmail" class="text-green-600 text-sm mt-1">
          {{ currentUser.affiliatedToEmail }}
        </p>
      </div>
      
      <!-- Aviso de restrição de afiliação -->
      <div v-if="currentUser?.affiliates && currentUser.affiliates.length > 0 && !isAlreadyAffiliated" 
           class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h3 class="text-lg font-medium text-yellow-700 mb-2">Importante</h3>
        <p class="text-yellow-600">
          Como você já possui afiliados, não é possível se afiliar a outro usuário.
          Isso é necessário para manter a hierarquia de afiliação.
        </p>
      </div>

      <!-- Afiliar-se a um usuário - apenas mostrar se não tem afiliados -->
      <div v-if="canAffiliate" class="mb-6 border-b pb-4">
        <h3 class="text-lg font-medium text-primary mb-2">Afiliar-se a um Usuário</h3>
        <p class="text-sm text-gray-600 mb-3">
          Insira um código de afiliado ou email para se afiliar a outro usuário.
        </p>
        
        <div class="mb-3">
          <!-- Campo de afiliação reformulado para seguir o mesmo padrão visual -->
          <label class="block text-sm text-gray-600 mb-1">
            {{ isEmail ? 'Email para afiliação:' : 'Código de afiliação:' }}
          </label>
          <div class="flex">
            <input
              v-model="affiliateTarget"
              :placeholder="isEmail ? 'Email do usuário' : 'Código de afiliado'"
              type="text"
              class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary"
              :class="{'border-red-300': affiliateTarget && !isValidTarget, 'uppercase': !isEmail}"
              @input="!isEmail && (affiliateTarget = affiliateTarget.toUpperCase())"
            />
            <button
              @click="processAffiliation"
              :disabled="!affiliateTarget || affiliating || !isValidTarget"
              class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md transition-colors"
              :class="{ 'opacity-50 cursor-not-allowed': !affiliateTarget || affiliating || !isValidTarget }"
            >
              <span v-if="affiliating">Processando...</span>
              <span v-else>Afiliar</span>
            </button>
          </div>
          
          <!-- Mensagem de validação -->
          <p v-if="affiliateTarget && !isValidTarget" class="mt-1 text-sm text-danger">
            {{ isEmail ? 'Email inválido' : 'Código de afiliado deve ter 6 caracteres' }}
          </p>
          
          <div class="flex items-center mt-2">
            <label class="flex items-center text-sm text-gray-600">
              <input 
                v-model="isEmail" 
                type="checkbox" 
                class="mr-2 form-checkbox"
              />
              Usar email em vez de código
            </label>
          </div>
        </div>
      </div>

      <!-- Meu Código de Afiliado -->
      <div class="mb-4 pt-2">
        <h3 class="text-lg font-medium text-primary mb-2">Meu Código de Afiliado</h3>
        
        <div v-if="affiliateCode && isCodeValid" class="mb-4">
          <!-- Código Temporário com botão de cópia -->
          <div class="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
            <p class="text-sm text-gray-600 mb-1">Seu código temporário:</p>
            <div class="flex items-center justify-between">
              <p class="font-mono text-lg font-bold text-primary">{{ affiliateCode }}</p>
              <button
                @click="copyCodeToClipboard"
                class="ml-2 text-gray-500 hover:text-primary transition-colors p-1 rounded-md hover:bg-gray-100"
                title="Copiar código"
              >
                <span v-if="codeCopied" class="text-green-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado!
                </span>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ timeRemaining }}
            </div>
          </div>
          
          <!-- Link para compartilhar -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-1">Link para compartilhar:</label>
            <div class="flex">
              <input
                type="text"
                readonly
                :value="affiliateLink"
                class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary bg-gray-50"
              />
              <button
                @click="copyToClipboard"
                class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md"
                :class="{ 'bg-green-600': copied }"
              >
                <span v-if="copied">Copiado!</span>
                <span v-else>Copiar</span>
              </button>
            </div>
          </div>
          
          <p class="text-sm text-gray-600">
            Compartilhe este link ou código com seus amigos para vinculá-los à sua conta.
          </p>
        </div>
        
        <div v-else class="mb-4">
          <p class="text-gray-600 mb-4">
            Você ainda não possui um código de afiliado ativo. Gere um código temporário válido por 30 minutos.
          </p>
        </div>
        
        <Button 
          @click="generateCode" 
          variant="primary"
          :disabled="isGeneratingCode || loading"
          class="w-full"
        >
          <span v-if="isGeneratingCode || loading">Gerando...</span>
          <span v-else>Gerar Código Temporário</span>
        </Button>
      </div>
      
      <!-- Usuários Afiliados -->
      <div v-if="affiliatedUsers.length > 0" class="mt-6 pt-2 border-t">
        <h3 class="text-lg font-medium text-primary mb-2">
          Meus Afiliados <span class="text-sm font-normal">({{ affiliatedUsers.length }})</span>
        </h3>
        <p class="text-sm text-gray-600 mb-2">Usuários vinculados à sua conta:</p>
        
        <ul class="divide-y divide-gray-200">
          <li v-for="user in affiliatedUsers" :key="user.id" class="py-2">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-medium">{{ user.displayName }}</p>
                <p class="text-xs text-gray-500">{{ user.email }}</p>
                <p v-if="user.congregation" class="text-xs text-gray-400">
                  {{ user.congregation }}
                </p>
              </div>
            </div>
          </li>
        </ul>
      </div>
      
      <!-- Afiliado a -->
      <div v-if="currentUser?.affiliatedTo" class="mt-6 pt-2 border-t">
        <h3 class="text-lg font-medium text-primary mb-2">Você está afiliado a:</h3>
        <div class="bg-gray-50 p-3 rounded-lg">
          <p class="font-medium">{{ currentUser.affiliatedTo }}</p>
          <p v-if="currentUser.affiliatedToEmail" class="text-xs text-gray-500">
            {{ currentUser.affiliatedToEmail }}
          </p>
          <p v-if="currentUser.affiliatedToInfo?.congregation" class="text-xs text-gray-400">
            {{ currentUser.affiliatedToInfo.congregation }}
          </p>
        </div>
      </div>
    </div>
  </Card>
</template>
