<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProfile } from '../../composables/useProfile';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';

// Hooks
const { 
  currentUser, 
  loading, 
  error, 
  generateAffiliateCode 
} = useProfile();

// Estados
const copied = ref(false);
const generating = ref(false);

// Computados
const affiliateCode = computed(() => currentUser.value?.affiliateCode || null);
const affiliateLink = computed(() => {
  if (!affiliateCode.value) return '';
  return `${window.location.origin}?ref=${affiliateCode.value}`;
});

// Gerar código de afiliado
const generateCode = async () => {
  generating.value = true;
  try {
    await generateAffiliateCode();
  } finally {
    generating.value = false;
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
</script>

<template>
  <Card title="Seu Link de Afiliado" class="mb-6">
    <div class="p-4">
      <div v-if="error" class="mb-4">
        <Alert type="error" :message="error" dismissible />
      </div>

      <div v-if="affiliateCode" class="mb-4">
        <p class="text-sm text-gray-600 mb-1">Seu código de afiliado:</p>
        <p class="font-mono text-lg font-bold text-primary">{{ affiliateCode }}</p>
      </div>
      
      <div v-if="affiliateLink" class="mb-6">
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
            class="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-r-md"
            :class="{ 'bg-green-600': copied }"
          >
            <span v-if="copied">Copiado!</span>
            <span v-else>Copiar</span>
          </button>
        </div>
      </div>
      
      <div v-if="!affiliateCode" class="mb-4">
        <p class="text-gray-600 mb-4">
          Você ainda não possui um código de afiliado. Gere um código para compartilhar e ganhar comissões.
        </p>
        
        <button 
          @click="generateCode" 
          class="w-full bg-primary hover:bg-blue-700 text-white py-2 px-4 rounded"
          :disabled="generating || loading"
        >
          <span v-if="generating || loading">Gerando...</span>
          <span v-else>Gerar Código de Afiliado</span>
        </button>
      </div>
      
      <div v-else class="text-sm text-gray-600">
        <p>Compartilhe este link com seus amigos e ganhe comissões por cada venda!</p>
      </div>
    </div>
  </Card>
</template>
