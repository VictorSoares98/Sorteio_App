<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useUserSettingsStore } from '../../stores/userSettingsStore';
import SettingsProfileAppearance from './settings/SettingsProfileAppearance.vue';
import SettingsNotifications from './settings/SettingsNotifications.vue';
import SettingsExport from './settings/SettingsExport.vue';
import SettingsSecurity from './settings/SettingsSecurity.vue';

const authStore = useAuthStore();
const userSettingsStore = useUserSettingsStore();

const activeTab = ref('appearance');
const isLoading = ref(true);
const showSuccess = ref(false);
const errorMessage = ref('');

// Obter ID do usuário logado ou do grupo administrado
const groupId = computed(() => {
  // Se o usuário tiver afiliados, usamos o ID do usuário como ID do grupo
  if (authStore.currentUser?.affiliates && authStore.currentUser.affiliates.length > 0) {
    return authStore.currentUser.id || '';
  }
  // Se o usuário for afiliado a alguém, usamos o ID do administrador do grupo
  return authStore.currentUser?.affiliatedToId || authStore.currentUser?.id || '';
});

// Verificar se o usuário é administrador de um grupo
const isGroupAdmin = computed(() => {
  return !!authStore.currentUser?.affiliates && authStore.currentUser.affiliates.length > 0;
});

// Função para carregar configurações do usuário/grupo
const loadSettings = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  
  try {
    // Carregar configurações específicas do grupo
    if (groupId.value) {
      await userSettingsStore.getUserSettings(groupId.value);
      
      // Se administra um grupo, carregar também configurações de afiliados
      if (isGroupAdmin.value && authStore.currentUser?.affiliates) {
        // Assumindo que authStore.currentUser.affiliates já é um array de IDs
        const affiliateIds = authStore.currentUser.affiliates;
        await Promise.all(
          affiliateIds.map(id => userSettingsStore.getUserSettings(id))
        );
      }
    }
  } catch (error) {
    console.error('Erro ao carregar configurações do grupo:', error);
    errorMessage.value = 'Não foi possível carregar as configurações do seu grupo. Por favor, tente novamente.';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  loadSettings();
});

// Função para salvar configurações manualmente
const saveSettings = async () => {
  try {
    // Salvar apenas as configurações do grupo específico
    await userSettingsStore.forceSaveSettings();
    
    // Mostrar mensagem de sucesso
    showSuccess.value = true;
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    errorMessage.value = 'Erro ao salvar configurações. Tente novamente.';
  }
};

// Alterar a aba ativa
const setActiveTab = (tab: string) => {
  activeTab.value = tab;
};
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-6 text-primary">
      {{ isGroupAdmin ? 'Configurações do Grupo' : 'Configurações do Sistema' }}
    </h2>
    
    <!-- Carregando -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Erro -->
    <div v-else-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
      <p>{{ errorMessage }}</p>
      <button @click="loadSettings" class="underline mt-2">Tentar novamente</button>
    </div>
    
    <!-- Conteúdo principal -->
    <div v-else>
      <!-- Mensagem de sucesso -->
      <div 
        v-if="showSuccess" 
        class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
      >
        <span class="font-medium">Sucesso!</span> Suas configurações foram salvas.
      </div>
      
      <!-- Informação sobre configurações de grupo -->
      <div v-if="isGroupAdmin" class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
        <p>
          <span class="font-bold">Nota:</span> 
          Você está configurando as preferências para seu grupo de afiliados.
          Estas configurações afetarão apenas os usuários vinculados ao seu grupo.
        </p>
      </div>
      
      <!-- Navegação entre abas -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="flex -mb-px space-x-8 overflow-x-auto">
          <button 
            @click="setActiveTab('appearance')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 whitespace-nowrap transition duration-150 ease-in-out"
            :class="activeTab === 'appearance' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Aparência
          </button>
          
          <button 
            @click="setActiveTab('notifications')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 whitespace-nowrap transition duration-150 ease-in-out"
            :class="activeTab === 'notifications' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Notificações
          </button>
          
          <button 
            @click="setActiveTab('export')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 whitespace-nowrap transition duration-150 ease-in-out"
            :class="activeTab === 'export' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Exportação
          </button>
          
          <button 
            @click="setActiveTab('security')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 whitespace-nowrap transition duration-150 ease-in-out"
            :class="activeTab === 'security' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Segurança
          </button>
        </nav>
      </div>
      
      <!-- Conteúdo das abas -->
      <div class="space-y-6">
        <!-- Aparência -->
        <div v-if="activeTab === 'appearance'" class="animate-fade">
          <SettingsProfileAppearance :userId="groupId" />
        </div>
        
        <!-- Notificações -->
        <div v-if="activeTab === 'notifications'" class="animate-fade">
          <SettingsNotifications :userId="groupId" />
        </div>
        
        <!-- Exportação -->
        <div v-if="activeTab === 'export'" class="animate-fade">
          <SettingsExport :userId="groupId" />
        </div>
        
        <!-- Segurança -->
        <div v-if="activeTab === 'security'" class="animate-fade">
          <SettingsSecurity :userId="groupId" />
        </div>
        
        <!-- Botão de salvar -->
        <div class="flex justify-end mt-8">
          <button 
            @click="saveSettings" 
            class="bg-primary hover:bg-primary-dark text-white py-2 px-6 rounded-md transition-colors"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade {
  animation: fade-in 0.3s ease-in-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
