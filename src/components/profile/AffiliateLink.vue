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
const confirmDialogVisible = ref(false);
const pendingAffiliationData = ref<{ target: string; isEmail: boolean } | null>(null);
const affiliateCodeInputRef = ref<HTMLInputElement | null>(null);
const animateSuccess = ref(false);

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

// Verificar se o usuário pode se afiliar (não tem afiliados E não está afiliado a ninguém)
const canAffiliate = computed(() => {
  if (!currentUser.value) return false;
  
  // REGRA 1: Se o usuário já está afiliado a alguém, não pode se afiliar novamente
  if (currentUser.value.affiliatedTo) return false;
  
  // REGRA 2: Se tem afiliados, não pode se afiliar a outra pessoa
  return !(currentUser.value.affiliates && currentUser.value.affiliates.length > 0);
});

// Verificar se o usuário já está afiliado a alguém
const isAlreadyAffiliated = computed(() => {
  return !!currentUser.value?.affiliatedTo;
});

// Verificar se o usuário tem afiliados (usada para mensagens informativas)
const hasAffiliates = computed(() => {
  return !!(currentUser.value?.affiliates && currentUser.value.affiliates.length > 0);
});

// Removed unused computed property

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

// Removed unused function processAffiliation since requestAffiliation and confirmAffiliation are used instead

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

// Processar afiliação com confirmação
const requestAffiliation = async () => {
  if (!affiliateTarget.value || !isValidTarget.value) {
    error.value = isEmail.value 
      ? 'Por favor, insira um email válido' 
      : 'O código de afiliado deve ter 6 caracteres';
    return;
  }
  
  // Armazenar os dados para a confirmação
  pendingAffiliationData.value = {
    target: affiliateTarget.value,
    isEmail: isEmail.value
  };
  
  // Mostrar diálogo de confirmação
  confirmDialogVisible.value = true;
};

// Adicionar variável para controlar o tempo de exibição das mensagens
const messageTimeout = ref<number | null>(null);

// Função para limpar mensagens de erro/sucesso após um tempo
const clearMessagesAfterDelay = (delay = 5000) => {
  if (messageTimeout.value) {
    clearTimeout(messageTimeout.value);
  }
  
  messageTimeout.value = window.setTimeout(() => {
    // Limpar apenas mensagens de email não encontrado e afiliação realizada
    if (error.value && (
      error.value.includes('Email não encontrado') ||
      error.value.includes('não foi encontrado')
    )) {
      error.value = null;
    }
    
    if (success.value && success.value.includes('sucesso')) {
      success.value = null;
    }
    
    messageTimeout.value = null;
  }, delay);
};

// Efetuar afiliação após confirmação
const confirmAffiliation = async () => {
  if (!pendingAffiliationData.value) return;
  
  const { target, isEmail: isEmailTarget } = pendingAffiliationData.value;
  confirmDialogVisible.value = false;
  
  affiliating.value = true;
  try {
    console.log('[AffiliateLink] Iniciando processo de afiliação confirmado');
    // Normalizar o código para maiúsculas antes de enviar
    const normalizedTarget = isEmailTarget 
      ? target 
      : normalizeAffiliateCode(target);
    
    const response = await affiliateToUser(normalizedTarget, isEmailTarget);
    
    if (response && response.success) {
      console.log('[AffiliateLink] Afiliação bem-sucedida');
      // Limpar campo após sucesso
      affiliateTarget.value = '';
      
      // Animação de sucesso
      animateSuccess.value = true;
      setTimeout(() => {
        animateSuccess.value = false;
      }, 2000);
      
      // Configurar mensagem para desaparecer após um tempo
      clearMessagesAfterDelay(8000);
    } else {
      console.warn('[AffiliateLink] Afiliação falhou:', response?.message);
      
      // Se for um erro de email não encontrado, configurar para desaparecer
      if (response?.message && (
        response.message.includes('Email não encontrado') || 
        response.message.includes('não foi encontrado')
      )) {
        clearMessagesAfterDelay();
      }
    }
  } catch (err) {
    console.error('[AffiliateLink] Erro ao processar afiliação:', err);
  } finally {
    affiliating.value = false;
    pendingAffiliationData.value = null;
  }
};

// Cancelar processo de afiliação
const cancelAffiliation = () => {
  confirmDialogVisible.value = false;
  pendingAffiliationData.value = null;
};

// Toggling entre código e email com melhor UX
const toggleAffiliationMethod = (newValue: boolean) => {
  isEmail.value = newValue;
  affiliateTarget.value = ''; // Limpar o campo ao mudar o método
  
  // Focar automaticamente no campo após a mudança
  setTimeout(() => {
    if (affiliateCodeInputRef.value) {
      affiliateCodeInputRef.value.focus();
    }
  }, 100);
};

// Auto-focar quando mudar entre código e email
watch(isEmail, () => {
  setTimeout(() => {
    if (affiliateCodeInputRef.value) {
      affiliateCodeInputRef.value.focus();
    }
  }, 100);
});

// Função para validar caracteres no campo de código
const validateCodeInput = (event: KeyboardEvent) => {
  // Permitir apenas letras e números (alfanuméricos)
  if (!/[a-zA-Z0-9]/.test(event.key)) {
    event.preventDefault();
  }
};

// Removing unused computed property as it's not being used in the template

// Indicador visual de validade do código
const codeStatus = computed(() => {
  if (!affiliateTarget.value) return 'empty';
  if (affiliateTarget.value.length < 6) return 'incomplete';
  return isValidTarget.value ? 'valid' : 'invalid';
});

// Adicionar função para identificar tipos de erro
const getErrorCategory = computed(() => {
  if (!error.value) return null;
  
  // Verificar o tipo de erro por seu conteúdo
  if (error.value.includes('Código de afiliado inválido') || 
      error.value.includes('código de afiliado deve ter')) {
    return 'code';
  } else if (error.value.includes('Email não encontrado') || 
             error.value.includes('email válido')) {
    return 'email';
  } else if (error.value.includes('si mesmo')) {
    return 'self';
  } else if (error.value.includes('já está afiliado')) {
    return 'already_affiliated';
  } else {
    return 'general';
  }
});

// Limpar o erro ao mudar entre email e código
watch(isEmail, () => {
  if (error.value && (getErrorCategory.value === 'code' || getErrorCategory.value === 'email')) {
    error.value = null;
  }
});

// Limpar timeout quando o componente é desmontado
onUnmounted(() => {
  if (checkingInterval.value) {
    clearInterval(checkingInterval.value);
    checkingInterval.value = null;
  }
  
  if (messageTimeout.value) {
    clearTimeout(messageTimeout.value);
    messageTimeout.value = null;
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
      <!-- Apenas alertas GERAIS no topo -->
      <Alert
        v-if="error && getErrorCategory === 'general'"
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

      <!-- Painel de Informações sobre Regras de Afiliação - exibir apenas para usuários que podem se afiliar -->
      <div v-if="canAffiliate" class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-medium text-blue-800 mb-2">Regras de Afiliação</h3>
        <ul class="list-disc list-inside space-y-1 text-sm text-blue-700">
          <li>Cada usuário pode se afiliar a apenas <strong>uma</strong> pessoa</li>
          <li>Usuários já afiliados a alguém <strong>não podem</strong> se afiliar a outra pessoa</li>
          <li>Usuários já afiliados a alguém <strong>não podem</strong> receber afiliados</li>
          <li>Usuários que já possuem afiliados <strong>não podem</strong> se afiliar a outra pessoa</li>
        </ul>
      </div>

      <!-- Usuário já afiliado - Aviso aprimorado com texto melhorado -->
      <div v-if="isAlreadyAffiliated" class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-start">
          <div class="mr-3 flex-shrink-0">
            <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium text-green-700 mb-2">Conexão Ativa</h3>
            <p class="text-green-600">
              Você está atualmente conectado à conta de <strong>{{ currentUser?.affiliatedTo }}</strong>. Por questões de hierarquia e integridade do sistema, essa afiliação não pode ser alterada, a menos que seja removida pela pessoa a quem você está afiliado.
            </p>
            <p v-if="currentUser?.affiliatedToEmail" class="text-green-600 text-sm mt-1">
              {{ currentUser.affiliatedToEmail }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Aviso de restrição de afiliação - Melhorado com ícone -->
      <div v-if="hasAffiliates && !isAlreadyAffiliated" 
           class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div class="flex items-start">
          <div class="mr-3 flex-shrink-0">
            <svg class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium text-yellow-700 mb-2">Importante</h3>
            <p class="text-yellow-600">
              Como você já possui afiliados, não é possível se afiliar a outro usuário.
              Isso é necessário para preservar a estrutura hierárquica de afiliações.
            </p>
          </div>
        </div>
      </div>

      <!-- Afiliar-se a um usuário - apenas mostrar se não tem afiliados -->
      <div v-if="canAffiliate" class="mb-6 border-b pb-4">
        <h3 class="text-lg font-medium text-primary mb-2">Afiliar-se a um Usuário</h3>
        <p class="text-sm text-gray-600 mb-3">
          Insira um código de afiliado ou email para se afiliar a outro usuário.
        </p>
        
        <div class="mb-3">
          <!-- Seletor aprimorado para alternar entre código e email -->
          <div class="flex mb-3 bg-gray-100 rounded-lg p-1 w-fit">
            <button 
              @click="toggleAffiliationMethod(false)"
              class="px-3 py-1.5 rounded-md text-sm transition-colors"
              :class="!isEmail ? 'bg-white shadow-sm text-primary font-medium' : 'text-gray-600 hover:bg-gray-200'"
            >
              Código
            </button>
            <button 
              @click="toggleAffiliationMethod(true)"
              class="px-3 py-1.5 rounded-md text-sm transition-colors ml-1"
              :class="isEmail ? 'bg-white shadow-sm text-primary font-medium' : 'text-gray-600 hover:bg-gray-200'"
            >
              Email
            </button>
          </div>
        
          <!-- Campo de afiliação reformulado para seguir o mesmo padrão visual -->
          <label class="block text-sm text-gray-600 mb-1">
            {{ isEmail ? 'Email para afiliação:' : 'Código de afiliação:' }}
          </label>
          
          <!-- Mensagem de erro de auto-afiliação - Exibida independente do método -->
          <div v-if="error && getErrorCategory === 'self'" 
               class="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {{ error }}
          </div>
          
          <!-- Mensagem de erro - já está afiliado a alguém -->
          <div v-if="error && getErrorCategory === 'already_affiliated'" 
               class="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ error }}
          </div>
          
          <!-- Campo para email permanece o mesmo -->
          <div v-if="isEmail" class="flex flex-col">
            <div class="flex">
              <input
                ref="affiliateCodeInputRef"
                v-model="affiliateTarget"
                placeholder="Email do usuário"
                type="text"
                class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary transition-all"
                :class="{
                  'border-red-300': (affiliateTarget && !isValidTarget) || (error && getErrorCategory === 'email'),
                  'animate-pulse': affiliating
                }"
                @keyup.enter="requestAffiliation"
              />
              <button
                @click="requestAffiliation"
                :disabled="!affiliateTarget || affiliating || !isValidTarget"
                class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md transition-colors flex items-center"
                :class="{ 'opacity-50 cursor-not-allowed': !affiliateTarget || affiliating || !isValidTarget }"
              >
                <span v-if="affiliating" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando
                </span>
                <span v-else>Afiliar</span>
              </button>
            </div>
            
            <!-- Mensagem de erro específica para email -->
            <div v-if="error && getErrorCategory === 'email'" 
                 class="mt-2 text-sm text-red-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {{ error }}
            </div>
            
            <!-- Mensagem de validação para email -->
            <p v-else-if="isEmail && affiliateTarget && !isValidTarget" class="mt-2 text-sm text-danger">
              Email inválido
            </p>
          </div>
          
          <!-- Campo especial para código de afiliação com validação em tempo real -->
          <div v-else>
            <!-- Campo de entrada com validação durante digitação -->
            <div class="flex mb-3 relative">
              <input
                ref="affiliateCodeInputRef"
                v-model="affiliateTarget"
                placeholder="Digite o código"
                type="text"
                maxlength="6"
                class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary transition-all uppercase tracking-wider font-mono"
                :class="{
                  'border-red-300': (affiliateTarget && !isValidTarget) || (error && getErrorCategory === 'code'),
                  'border-green-300': codeStatus === 'valid',
                  'animate-pulse': affiliating
                }"
                @input="affiliateTarget = affiliateTarget.toUpperCase()"
                @keypress="validateCodeInput"
                @keyup.enter="requestAffiliation"
              />
              <button
                @click="requestAffiliation"
                :disabled="!affiliateTarget || affiliating || !isValidTarget"
                class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md transition-colors flex items-center"
                :class="{ 'opacity-50 cursor-not-allowed': !affiliateTarget || affiliating || !isValidTarget }"
              >
                <span v-if="affiliating" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando
                </span>
                <span v-else>Afiliar</span>
              </button>
            </div>
            
            <!-- Visualização em caixas para cada caractere do código -->
            <div class="flex justify-between mb-2 code-boxes">
                <div 
                v-for="index in 6" 
                :key="index"
                class="w-12 h-12 flex items-center justify-center border-2 rounded-md text-xl font-bold transition-all overflow-hidden"
                :class="{
                  'border-gray-300 bg-gray-50': !affiliateTarget || index > affiliateTarget.length,
                  'border-primary text-primary': affiliateTarget && index <= affiliateTarget.length,
                  'border-green-500 bg-green-50 text-green-600': codeStatus === 'valid' && index <= affiliateTarget.length
                }"
              >
                {{ affiliateTarget && index <= affiliateTarget.length ? affiliateTarget[index-1] : '' }}
              </div>
            </div>
            
            <!-- Status do código e contador com tratamento de erro -->
            <div class="flex justify-between items-center text-xs mt-1">
              <div>
                <span 
                  v-if="error && getErrorCategory === 'code'"
                  class="text-red-600 font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {{ error }}
                </span>
                <span 
                  v-else-if="codeStatus === 'incomplete'" 
                  class="text-primary"
                >
                  {{ affiliateTarget.length }}/6 caracteres
                </span>
                <span 
                  v-else-if="codeStatus === 'valid'" 
                  class="text-green-600 font-medium"
                >
                  Código válido
                </span>
              </div>
              
              <div v-if="codeStatus === 'valid'" class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                Pronto para enviar
              </div>
            </div>
          </div>
          
          <!-- Mensagem de ajuda contextual -->
          <p class="mt-4 text-xs text-gray-500 italic">
            {{ isEmail 
              ? 'Insira o email do usuário ao qual você deseja se afiliar.' 
              : 'Digite o código de 6 caracteres usando apenas letras e números.' 
            }}
          </p>
        </div>
      </div>

      <!-- Meu Código de Afiliado - ocultar para usuários já afiliados -->
      <div v-if="!isAlreadyAffiliated" class="mb-4 pt-2">
        <h3 class="text-lg font-medium text-primary mb-2">Meu Código de Afiliado</h3>
        
        <div v-if="affiliateCode && isCodeValid" class="mb-4">
          <!-- Código Temporário com botão de cópia - modificado -->
          <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 transition-all" :class="{'bg-green-50 border-green-200': codeCopied}">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm text-gray-600">Seu código temporário:</p>
              <div class="text-xs text-gray-500">
                {{ timeRemaining }}
              </div>
            </div>
            <div class="flex items-center justify-between">
              <p class="font-mono text-lg font-bold text-primary">{{ affiliateCode }}</p>
              <button
                @click="copyCodeToClipboard"
                class="ml-2 text-gray-500 hover:text-primary transition-colors p-2 rounded-md hover:bg-gray-100 flex items-center"
                title="Copiar código"
              >
                <span v-if="codeCopied" class="text-green-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado!
                </span>
                <span v-else class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </span>
              </button>
            </div>
          </div>
          
          <!-- Link para compartilhar - modificado -->
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
                class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md transition-colors flex items-center"
                :class="{ 'bg-green-600': copied }"
              >
                <span v-if="copied" class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado!
                </span>
                <span v-else class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </span>
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
          <span v-if="isGeneratingCode || loading" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Gerando...
          </span>
          <span v-else>Gerar Código Temporário</span>
        </Button>
      </div>
      
      <!-- Usuários Afiliados - com animação de sucesso -->
      <div v-if="affiliatedUsers.length > 0" 
           class="mt-6 pt-2 border-t"
           :class="{ 'animate-pulse bg-green-50 rounded-lg': animateSuccess }">
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
  
  <!-- Modal de Confirmação de Afiliação -->
  <div v-if="confirmDialogVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
      <h3 class="text-lg font-medium text-gray-900 mb-2">Confirmar Afiliação</h3>
      
      <p class="text-gray-600 mb-4">
        Você está prestes a se afiliar a 
        <span class="font-medium">{{ pendingAffiliationData?.target }}</span>
        {{ pendingAffiliationData?.isEmail ? '(email)' : '(código)' }}.
      </p>
      
      <div class="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
        <p class="text-yellow-700 text-sm">
          <span class="font-medium">Importante:</span> Após se afiliar, você não poderá mudar sua afiliação.
        </p>
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          @click="cancelAffiliation"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          @click="confirmAffiliation"
          class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md"
        >
          Confirmar Afiliação
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animações para feedback visual */
.animate-success {
  animation: successPulse 2s ease-in-out;
}

@keyframes successPulse {
  0% { background-color: rgba(0, 255, 0, 0.1); }
  50% { background-color: rgba(0, 255, 0, 0.2); }
  100% { background-color: transparent; }
}

/* Animação para as caixas de código */
.code-boxes > div {
  transform: translateY(0);
  transition: all 0.2s ease;
}

.code-boxes > div:not(:empty) {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Efeito de destaque para caracteres digitados */
@keyframes characterHighlight {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.code-boxes > div:last-of-type:not(:empty) {
  animation: characterHighlight 0.3s ease-in-out;
}

/* Responsividade para dispositivos móveis */
@media (max-width: 640px) {
  .code-boxes > div {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }
}
</style>
