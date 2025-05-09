<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserSettingsStore } from '../../../stores/userSettingsStore';

const props = defineProps<{
  userId: string;
}>();

const userSettingsStore = useUserSettingsStore();
const isExporting = ref(false);

// Formato de exportação preferido
const exportFormat = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.exportPreferences.format || 'pdf';
  },
  set: (value: 'csv' | 'pdf' | 'excel') => {
    userSettingsStore.updateUserSettings(props.userId, {
      exportPreferences: {
        ...userSettingsStore.userSettings[props.userId]?.exportPreferences,
        format: value
      }
    });
  }
});

// Incluir detalhes na exportação
const includeDetails = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.exportPreferences.includeDetails || true;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      exportPreferences: {
        ...userSettingsStore.userSettings[props.userId]?.exportPreferences,
        includeDetails: value
      }
    });
  }
});

// Exportação automática
const autoExport = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.exportPreferences.autoExport || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      exportPreferences: {
        ...userSettingsStore.userSettings[props.userId]?.exportPreferences,
        autoExport: value
      }
    });
  }
});

// Simulação de exportação de dados
const exportData = () => {
  isExporting.value = true;
  setTimeout(() => {
    isExporting.value = false;
    alert('Dados exportados com sucesso!');
  }, 1500);
};
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-primary mb-4">Exportação de Dados</h3>
    
    <!-- Formato de exportação -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Formato Preferido</h4>
      <div class="flex flex-wrap gap-3">
        <label 
          v-for="option in ['csv', 'pdf', 'excel']" 
          :key="option"
          class="flex items-center"
        >
          <input 
            type="radio" 
            :value="option" 
            v-model="exportFormat" 
            class="form-checkbox mr-2"
          />
          <span class="text-gray-700">{{ option.toUpperCase() }}</span>
        </label>
      </div>
    </div>
    
    <!-- Opções adicionais -->
    <div class="mb-6 space-y-3">
      <label class="flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          v-model="includeDetails" 
          class="form-checkbox mr-2"
        />
        <span class="text-gray-700">Incluir detalhes completos</span>
      </label>
      
      <label class="flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          v-model="autoExport" 
          class="form-checkbox mr-2"
        />
        <span class="text-gray-700">Exportar automaticamente (semanal)</span>
      </label>
    </div>
    
    <!-- Botão de exportação manual -->
    <div>
      <button 
        @click="exportData" 
        class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
        :disabled="isExporting"
      >
        <span v-if="isExporting">Exportando...</span>
        <span v-else>Exportar Dados Agora</span>
      </button>
    </div>
  </div>
</template>
