<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAffiliateCode } from '../../composables/useAffiliateCode';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';

// Hooks
const { 
  currentUser, 
  loading, 
  error,
  success,
  affiliatedUsers,
  generateTemporaryAffiliateCode,
  affiliateToUser,
  fetchAffiliatedUsers
} = useAffiliateCode();

// Estados
const copied = ref(false);
const codeCopied = ref(false); // Novo estado para acompanhar cópia do código
const generating = ref(false);
const affiliateTarget = ref('');
const isEmail = ref(false);
const affiliating = ref(false);

// Computados
const affiliateCode = computed(() => currentUser.value?.affiliateCode || null);
const affiliateLink = computed(() => {
  if (!affiliateCode.value) return '';
  return `${window.location.origin}?ref=${affiliateCode.value}`;
});

const codeExpiry = computed(() => {
  if (!currentUser.value?.affiliateCodeExpiry) return null;
  
  const expiry = currentUser.value.affiliateCodeExpiry;
  return 'toDate' in expiry && typeof expiry.toDate === 'function'
    ? expiry.toDate() 
    : expiry;
});

const isCodeValid = computed(() => {
  if (!codeExpiry.value) return false;
  return codeExpiry.value > new Date();
});

const timeRemaining = computed(() => {
  if (!codeExpiry.value) return '';
  
  const now = new Date();
  const expiryDate = codeExpiry.value instanceof Date ? 
    codeExpiry.value : 
    new Date(codeExpiry.value.seconds * 1000);
  
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  
  if (diffMinutes <= 0) return 'Expirado';
  return `${diffMinutes} min restantes`;
});

// Gerar código temporário de afiliado
const generateCode = async () => {
  generating.value = true;
  try {
    await generateTemporaryAffiliateCode();
  } finally {
    generating.value = false;
  }
};

// Processar afiliação
const processAffiliation = async () => {
  if (!affiliateTarget.value) return;
  
  affiliating.value = true;
  try {
    await affiliateToUser(affiliateTarget.value, isEmail.value);
    // Limpar campo após tentativa
    affiliateTarget.value = '';
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

// Nova função para copiar apenas o código
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

// Carregar afiliados quando o componente é montado
onMounted(async () => {
  await fetchAffiliatedUsers();
});
</script>

<template>
  <Card title="Programa de Afiliações" class="mb-6">
    <div class="p-4">
      <!-- Alerts -->
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

      <!-- Afiliar-se a um usuário -->
      <div class="mb-6 border-b pb-4">
        <h3 class="text-lg font-medium text-primary mb-2">Afiliar-se a um Usuário</h3>
        <p class="text-sm text-gray-600 mb-3">
          Insira um código de afiliado ou email para se afiliar a outro usuário.
        </p>
        
        <div class="mb-3">
          <div class="flex items-center mb-2">
            <Input
              v-model="affiliateTarget"
              :placeholder="isEmail ? 'Email do usuário' : 'Código de afiliado'"
              class="flex-grow"
            />
            <Button
              @click="processAffiliation"
              variant="primary"
              :disabled="!affiliateTarget || affiliating"
              class="ml-2"
            >
              <span v-if="affiliating">Processando...</span>
              <span v-else>Afiliar</span>
            </Button>
          </div>
          
          <div class="flex items-center">
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
          :disabled="generating || loading"
          class="w-full"
        >
          <span v-if="generating || loading">Gerando...</span>
          <span v-else>Gerar Código Temporário</span>
        </Button>
      </div>
      
      <!-- Usuários Afiliados -->
      <div v-if="affiliatedUsers.length > 0" class="mt-6 pt-2 border-t">
        <h3 class="text-lg font-medium text-primary mb-2">Meus Afiliados</h3>
        <p class="text-sm text-gray-600 mb-2">Usuários vinculados à sua conta:</p>
        
        <ul class="divide-y divide-gray-200">
          <li v-for="user in affiliatedUsers" :key="user.id" class="py-2">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-medium">{{ user.displayName }}</p>
                <p class="text-xs text-gray-500">{{ user.email }}</p>
              </div>
            </div>
          </li>
        </ul>
      </div>
      
      <!-- Afiliado a -->
      <div v-if="currentUser?.affiliatedTo" class="mt-6 pt-2 border-t">
        <h3 class="text-lg font-medium text-primary mb-2">Você está afiliado a:</h3>
        <p class="text-sm text-gray-600 mb-2">
          {{ currentUser.affiliatedTo }}
        </p>
      </div>
    </div>
  </Card>
</template>
