import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { type UserSettings, defaultUserSettings } from '../types/userSettings';
import { debounce } from 'lodash';

// Definir o tempo de cache (15 minutos)
const CACHE_EXPIRY_MS = 15 * 60 * 1000;
// Debounce para atualizações em massa (500ms)
const DEBOUNCE_TIME = 500;

export const useUserSettingsStore = defineStore('userSettings', () => {
  // Estado
  const userSettings = ref<Record<string, UserSettings>>({});
  const loading = ref<Record<string, boolean>>({});
  const error = ref<string | null>(null);
  const pendingUpdates = ref<Record<string, Partial<UserSettings>>>({});

  // Propriedades computadas
  // Verifica se algum usuário está em processo de carregamento
  const isAnyLoading = computed(() => {
    return Object.values(loading.value).some(isLoading => isLoading);
  });

  // Verifica se existem configurações para qualquer usuário
  const hasSettings = computed(() => {
    return Object.keys(userSettings.value).length > 0;
  });

  // Lista de usuários ordenados por data de última atualização
  const lastUpdatedSettings = computed(() => {
    const users = Object.entries(userSettings.value)
      .filter(([_, settings]) => settings.lastUpdated)
      .sort(([_, a], [__, b]) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return dateB - dateA; // Ordenação decrescente (mais recente primeiro)
      })
      .map(([userId, _]) => userId);
    return users;
  });

  // Carregar configurações do localStorage ao inicializar
  const initializeFromCache = () => {
    try {
      const cachedData = localStorage.getItem('userSettings');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Verificar se o cache ainda é válido
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
          userSettings.value = parsed.settings || {};
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do cache:', err);
    }
  };

  // Salvar configurações no localStorage
  const saveToCache = () => {
    try {
      localStorage.setItem('userSettings', JSON.stringify({
        settings: userSettings.value,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Erro ao salvar configurações no cache:', err);
    }
  };

  // Inicializar ao carregar a store
  initializeFromCache();

  // Carregar configurações de um usuário específico
  const getUserSettings = async (userId: string, force = false) => {
    // Se já temos dados e não forçar recarregamento, retorna os dados em cache
    if (userSettings.value[userId] && !force) {
      return userSettings.value[userId];
    }

    loading.value[userId] = true;
    error.value = null;

    try {
      // Buscar do Firestore
      const settingsRef = doc(db, 'userSettings', userId);
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as UserSettings;
        // Converter timestamps para Date se necessário
        if (settings.lastUpdated && typeof settings.lastUpdated !== 'object') {
          settings.lastUpdated = new Date(settings.lastUpdated);
        }
        if (settings.security.lastPasswordChange && typeof settings.security.lastPasswordChange !== 'object') {
          settings.security.lastPasswordChange = new Date(settings.security.lastPasswordChange);
        }

        userSettings.value[userId] = settings;
      } else {
        // Inicializar com valores padrão se não existir
        userSettings.value[userId] = { ...defaultUserSettings, lastUpdated: new Date() };
      }
      
      // Atualizar o cache
      saveToCache();
      
      return userSettings.value[userId];
    } catch (err) {
      console.error(`[UserSettingsStore] Erro ao buscar configurações para usuário ${userId}:`, err);
      error.value = 'Erro ao carregar configurações de usuário';
      throw err;
    } finally {
      loading.value[userId] = false;
    }
  };

  // Função debounced para salvar configurações em batch
  const debouncedSaveSettings = debounce(async () => {
    const updates = { ...pendingUpdates.value };
    pendingUpdates.value = {};

    for (const [userId, settingsToUpdate] of Object.entries(updates)) {
      try {
        const settingsRef = doc(db, 'userSettings', userId);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          await updateDoc(settingsRef, {
            ...settingsToUpdate,
            lastUpdated: new Date()
          });
        } else {
          // Se não existir, criar o documento com valores padrão + atualizações
          const newSettings = {
            ...defaultUserSettings,
            ...settingsToUpdate,
            lastUpdated: new Date()
          };
          await setDoc(settingsRef, newSettings);
        }
        
        // Atualizar o estado local com as alterações confirmadas
        if (userSettings.value[userId]) {
          userSettings.value[userId] = {
            ...userSettings.value[userId],
            ...settingsToUpdate,
            lastUpdated: new Date()
          };
        }
        
        // Atualizar o cache
        saveToCache();
      } catch (err) {
        console.error(`[UserSettingsStore] Erro ao salvar configurações para usuário ${userId}:`, err);
        error.value = 'Erro ao salvar configurações de usuário';
      }
    }
  }, DEBOUNCE_TIME);

  // Atualizar configurações de um usuário específico
  const updateUserSettings = async (userId: string, newSettings: Partial<UserSettings>) => {
    // Adicionar à fila de atualizações pendentes
    if (!pendingUpdates.value[userId]) {
      pendingUpdates.value[userId] = {};
    }
    
    // Mesclar com as atualizações pendentes existentes
    pendingUpdates.value[userId] = {
      ...pendingUpdates.value[userId],
      ...newSettings
    };
    
    // Também atualize o estado local imediatamente para feedback instantâneo ao usuário
    if (userSettings.value[userId]) {
      userSettings.value[userId] = {
        ...userSettings.value[userId],
        ...newSettings
      };
    } else {
      userSettings.value[userId] = {
        ...defaultUserSettings,
        ...newSettings
      };
    }
    
    // Salvar no cache para persistência local
    saveToCache();
    
    // Disparar o save debounced
    debouncedSaveSettings();
  };

  // Forçar salvamento imediato (útil antes de sair da página)
  const forceSaveSettings = async () => {
    // Cancelar qualquer debounce pendente
    debouncedSaveSettings.flush();
  };

  return {
    userSettings,
    loading,
    error,
    getUserSettings,
    updateUserSettings,
    forceSaveSettings,
    // Exportar as propriedades computadas
    isAnyLoading,
    hasSettings,
    lastUpdatedSettings
  };
});
