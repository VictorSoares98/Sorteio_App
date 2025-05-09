<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../../stores/authStore';
import { useUserSettingsStore } from '../../stores/userSettingsStore';
import { useAppSettingsStore } from '../../stores/appSettingsStore';
import SettingsProfileAppearance from './settings/SettingsProfileAppearance.vue';
import SettingsNotifications from './settings/SettingsNotifications.vue';
import SettingsExport from './settings/SettingsExport.vue';
import SettingsSecurity from './settings/SettingsSecurity.vue';

const authStore = useAuthStore();
const userSettingsStore = useUserSettingsStore();
const appSettingsStore = useAppSettingsStore();

const activeTab = ref('appearance');
const isLoading = ref(true);
const showSuccess = ref(false);

// Obter ID do usuário logado
const userId = computed(() => authStore.currentUser?.id || '');

// Verificar se o usuário é admin
const isAdmin = computed(() => {
  return authStore.currentUser?.role === 'ADMIN' as any;
});

onMounted(async () => {
  isLoading.value = true;
  
  try {
    // Carregar configurações do usuário
    if (userId.value) {
      await userSettingsStore.getUserSettings(userId.value);
    }
    
    // Se for admin, também carrega as configurações do app
    if (isAdmin.value) {
      await appSettingsStore.fetchSettings();
    }
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
  } finally {
    isLoading.value = false;
  }
});

// Função para salvar configurações manualmente
const saveSettings = async () => {
  try {
    // Forçar o salvamento das configurações pendentes
    await userSettingsStore.forceSaveSettings();
    
    // Mostrar mensagem de sucesso
    showSuccess.value = true;
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    alert('Erro ao salvar configurações. Tente novamente.');
  }
};

// Alterar a aba ativa
const setActiveTab = (tab: string) => {
  activeTab.value = tab;
};
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-6 text-primary">Configurações do Sistema</h2>
    
    <!-- Carregando -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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
      
      <!-- Navegação entre abas -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="flex -mb-px space-x-8">
          <button 
            @click="setActiveTab('appearance')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 transition duration-150 ease-in-out"
            :class="activeTab === 'appearance' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Aparência
          </button>
          
          <button 
            @click="setActiveTab('notifications')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 transition duration-150 ease-in-out"
            :class="activeTab === 'notifications' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Notificações
          </button>
          
          <button 
            @click="setActiveTab('export')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 transition duration-150 ease-in-out"
            :class="activeTab === 'export' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            Exportação
          </button>
          
          <button 
            @click="setActiveTab('security')"
            class="py-2 px-1 border-b-2 font-medium text-sm leading-5 transition duration-150 ease-in-out"
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
          <SettingsProfileAppearance :userId="userId" />
        </div>
        
        <!-- Notificações -->
        <div v-if="activeTab === 'notifications'" class="animate-fade">
          <SettingsNotifications :userId="userId" />
        </div>
        
        <!-- Exportação -->
        <div v-if="activeTab === 'export'" class="animate-fade">
          <SettingsExport :userId="userId" />
        </div>
        
        <!-- Segurança -->
        <div v-if="activeTab === 'security'" class="animate-fade">
          <SettingsSecurity :userId="userId" />
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
