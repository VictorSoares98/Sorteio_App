import { defineStore } from 'pinia';
import { ref } from 'vue';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { type AppSettings, defaultSettings } from '../types/appSettings';
import { db } from '../firebase'; // Assumindo que você tem um arquivo de configuração do Firebase

export const useAppSettingsStore = defineStore('appSettings', () => {
  const settings = ref<AppSettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  // Carregar configurações
  const fetchSettings = async (force = false) => {
    // Se já temos dados e não força recarregamento, retorna os dados em cache
    if (settings.value && !force) {
      return settings.value;
    }

    loading.value = true;
    error.value = null;

    try {
      // Buscar do Firestore
      const settingsRef = doc(db, 'settings', 'appSettings');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        settings.value = settingsDoc.data() as AppSettings;
        lastUpdated.value = new Date();
      } else {
        // Inicializar com valores padrão se não existir
        settings.value = getDefaultSettings();
      }
      
      return settings.value;
    } catch (err) {
      console.error('[AppSettingsStore] Erro ao buscar configurações:', err);
      error.value = 'Erro ao carregar configurações';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Salvar configurações
  const saveSettings = async (newSettings: AppSettings) => {
    loading.value = true;
    error.value = null;
    
    try {
      // Salvar no Firestore
      const settingsRef = doc(db, 'settings', 'appSettings');
      await setDoc(settingsRef, newSettings);
      
      // Atualizar estado local
      settings.value = newSettings;
      lastUpdated.value = new Date();
    } catch (err) {
      console.error('[AppSettingsStore] Erro ao salvar configurações:', err);
      error.value = 'Erro ao salvar configurações';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Valores padrão - usando a estrutura definida em types/appSettings.ts
  const getDefaultSettings = (): AppSettings => {
    return { ...defaultSettings };
  };

  return {
    settings,
    loading,
    error,
    lastUpdated,
    fetchSettings,
    saveSettings
  };
});
