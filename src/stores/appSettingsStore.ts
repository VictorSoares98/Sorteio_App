import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { debounce } from 'lodash';
import { UserRole } from '../types/user';
import { useAuthStore } from './authStore';

// Tipo para as configurações do aplicativo
interface AppSettings {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    defaultTheme: 'light' | 'dark' | 'system';
  };
  security: {
    inactivityTimeout: number; // em minutos
    requireStrongPasswords: boolean;
    passwordResetDays: number; // dias para solicitar redefinição
  };
  notifications: {
    enableSystemNotifications: boolean;
    enableSalesNotifications: boolean;
    enableRaffleNotifications: boolean;
  };
  export: {
    defaultFormat: 'csv' | 'excel' | 'pdf';
    includeInactiveUsers: boolean;
    includeSaleDetails: boolean;
  };
  lastUpdated: Date | null;
  updatedBy: string | null;
}

// Configurações padrão do aplicativo
const defaultAppSettings: AppSettings = {
  theme: {
    primaryColor: '#FF8C00', // Cor laranja padrão da UMADRIMC
    secondaryColor: '#FFC125',
    defaultTheme: 'light',
  },
  security: {
    inactivityTimeout: 30, // 30 minutos
    requireStrongPasswords: true,
    passwordResetDays: 90, // 90 dias
  },
  notifications: {
    enableSystemNotifications: true,
    enableSalesNotifications: true,
    enableRaffleNotifications: true,
  },
  export: {
    defaultFormat: 'excel',
    includeInactiveUsers: false,
    includeSaleDetails: true,
  },
  lastUpdated: null,
  updatedBy: null
};

// Define o tempo de cache (2 horas para configurações do app)
const CACHE_EXPIRY_MS = 2 * 60 * 60 * 1000;
// Debounce para atualizações (1 segundo)
const DEBOUNCE_TIME = 1000;

export const useAppSettingsStore = defineStore('appSettings', () => {
  // Estado
  const appSettings = ref<AppSettings | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pendingUpdates = ref<Partial<AppSettings>>({});
  const authStore = useAuthStore();

  // Verificar se o usuário tem permissão para editar configurações globais
  const canEditSettings = computed(() => {
    if (!authStore.currentUser) return false;
    return authStore.currentUser.role === UserRole.ADMIN;
  });

  // Carregar configurações do localStorage ao inicializar
  const initializeFromCache = () => {
    try {
      const cachedData = localStorage.getItem('appSettings');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Verificar se o cache ainda é válido
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
          appSettings.value = parsed.settings || null;
        }
      }
    } catch (err) {
      console.error('[AppSettingsStore] Erro ao carregar configurações do cache:', err);
    }
  };

  // Salvar configurações no localStorage
  const saveToCache = () => {
    try {
      localStorage.setItem('appSettings', JSON.stringify({
        settings: appSettings.value,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('[AppSettingsStore] Erro ao salvar configurações no cache:', err);
    }
  };

  // Inicializar ao carregar a store
  initializeFromCache();

  // Buscar configurações do Firestore
  const fetchSettings = async (force = false) => {
    // Se já temos dados e não forçar recarregamento, retorna os dados em cache
    if (appSettings.value && !force) {
      return appSettings.value;
    }

    loading.value = true;
    error.value = null;

    try {
      // Buscar do Firestore
      const settingsRef = doc(db, 'appSettings', 'global');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data() as AppSettings;
        // Converter timestamps para Date se necessário
        if (settings.lastUpdated && typeof settings.lastUpdated !== 'object') {
          settings.lastUpdated = new Date(settings.lastUpdated);
        }

        appSettings.value = settings;
      } else {
        // Inicializar com valores padrão se não existir
        appSettings.value = { ...defaultAppSettings, lastUpdated: new Date() };
      }
      
      // Atualizar o cache
      saveToCache();
      
      return appSettings.value;
    } catch (err) {
      console.error('[AppSettingsStore] Erro ao buscar configurações do app:', err);
      error.value = 'Erro ao carregar configurações do sistema';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Função debounced para salvar configurações
  const debouncedSaveSettings = debounce(async () => {
    if (!canEditSettings.value) {
      error.value = 'Você não tem permissão para editar configurações do sistema.';
      return;
    }

    const updates = { ...pendingUpdates.value };
    pendingUpdates.value = {};

    try {
      const settingsRef = doc(db, 'appSettings', 'global');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        await updateDoc(settingsRef, {
          ...updates,
          lastUpdated: new Date(),
          updatedBy: authStore.currentUser?.id || null
        });
      } else {
        // Se não existir, criar o documento com valores padrão + atualizações
        const newSettings = {
          ...defaultAppSettings,
          ...updates,
          lastUpdated: new Date(),
          updatedBy: authStore.currentUser?.id || null
        };
        await setDoc(settingsRef, newSettings);
      }
      
      // Atualizar o estado local com as alterações confirmadas
      if (appSettings.value) {
        appSettings.value = {
          ...appSettings.value,
          ...updates,
          lastUpdated: new Date(),
          updatedBy: authStore.currentUser?.id || null
        };
      } else {
        appSettings.value = {
          ...defaultAppSettings,
          ...updates,
          lastUpdated: new Date(),
          updatedBy: authStore.currentUser?.id || null
        };
      }
      
      // Atualizar o cache
      saveToCache();
    } catch (err) {
      console.error('[AppSettingsStore] Erro ao salvar configurações do app:', err);
      error.value = 'Erro ao salvar configurações do sistema';
    }
  }, DEBOUNCE_TIME);

  // Atualizar configurações
  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    if (!canEditSettings.value) {
      error.value = 'Você não tem permissão para editar configurações do sistema.';
      return;
    }
    
    // Adicionar à fila de atualizações pendentes
    pendingUpdates.value = {
      ...pendingUpdates.value,
      ...newSettings
    };
    
    // Também atualize o estado local imediatamente para feedback instantâneo ao usuário
    if (appSettings.value) {
      appSettings.value = {
        ...appSettings.value,
        ...newSettings
      };
    } else {
      appSettings.value = {
        ...defaultAppSettings,
        ...newSettings
      };
    }
    
    // Salvar no cache para persistência local
    saveToCache();
    
    // Disparar o save debounced
    debouncedSaveSettings();
  };

  // Forçar salvamento imediato
  const forceSaveSettings = async () => {
    // Cancelar qualquer debounce pendente
    debouncedSaveSettings.flush();
  };

  // Restaurar configurações padrão
  const resetToDefaults = async () => {
    if (!canEditSettings.value) {
      error.value = 'Você não tem permissão para redefinir configurações do sistema.';
      return;
    }
    
    try {
      loading.value = true;
      const settingsRef = doc(db, 'appSettings', 'global');
      
      const defaultSettings = {
        ...defaultAppSettings,
        lastUpdated: new Date(),
        updatedBy: authStore.currentUser?.id || null
      };
      
      // Atualizar no Firestore
      await setDoc(settingsRef, defaultSettings);
      
      // Atualizar localmente
      appSettings.value = { ...defaultSettings };
      pendingUpdates.value = {};
      
      // Atualizar cache
      saveToCache();
      
      return true;
    } catch (err) {
      console.error('[AppSettingsStore] Erro ao redefinir configurações:', err);
      error.value = 'Erro ao redefinir configurações do sistema';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    appSettings,
    loading,
    error,
    fetchSettings,
    updateSettings,
    forceSaveSettings,
    resetToDefaults,
    canEditSettings
  };
});
