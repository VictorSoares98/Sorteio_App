<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAffiliateCode } from '../../composables/useAffiliateCode';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';
import Button from '../ui/Button.vue';
import Input from '../ui/Input.vue';
// Removida a importação não utilizada de authStore

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
  
  // Verificar se temos um Timestamp do Firebase ou uma Date normal
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
  
  // Calcular tempo restante em minutos
  const now = new Date();
  // Garantir que temos um objeto Date para chamar getTime()
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
          <div class="flex items-center justify-between mb-1">
            <div>
              <p class="text-sm text-gray-600">Seu código temporário:</p>
              <p class="font-mono text-lg font-bold text-primary">{{ affiliateCode }}</p>
            </div>
            <div class="text-xs text-gray-500">
              {{ timeRemaining }}
            </div>
          </div>
          
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
            Compartilhe este link com seus amigos para vinculá-los à sua conta.
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
