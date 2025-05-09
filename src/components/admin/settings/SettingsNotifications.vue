<script setup lang="ts">
import { computed } from 'vue';
import { useUserSettingsStore } from '../../../stores/userSettingsStore';
import { useAuthStore } from '../../../stores/authStore';
import { UserRole } from '../../../types/user';

const props = defineProps<{
  userId: string;
}>();

const userSettingsStore = useUserSettingsStore();
const authStore = useAuthStore();

// Computed property para notificações por email
const emailNotifications = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.notifications.email || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      notifications: {
        ...userSettingsStore.userSettings[props.userId]?.notifications,
        email: value
      }
    });
  }
});

// Computed property para notificações push
const pushNotifications = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.notifications.push || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      notifications: {
        ...userSettingsStore.userSettings[props.userId]?.notifications,
        push: value
      }
    });
  }
});

// Computed properties para tipos específicos de notificações
const salesNotifications = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.notifications.sales || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      notifications: {
        ...userSettingsStore.userSettings[props.userId]?.notifications,
        sales: value
      }
    });
  }
});

const raffleNotifications = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.notifications.raffles || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      notifications: {
        ...userSettingsStore.userSettings[props.userId]?.notifications,
        raffles: value
      }
    });
  }
});

const systemNotifications = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.notifications.system || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      notifications: {
        ...userSettingsStore.userSettings[props.userId]?.notifications,
        system: value
      }
    });
  }
});

// Frequência de notificações
const notificationFrequency = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.notifications.frequency || 'weekly';
  },
  set: (value: 'daily' | 'weekly' | 'monthly' | 'never') => {
    userSettingsStore.updateUserSettings(props.userId, {
      notifications: {
        ...userSettingsStore.userSettings[props.userId]?.notifications,
        frequency: value
      }
    });
  }
});

// Provedor de email
const emailProvider = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.notifications.emailProvider || 'emailjs';
  },
  set: (value: 'emailjs' | 'smtp' | 'none') => {
    userSettingsStore.updateUserSettings(props.userId, {
      notifications: {
        ...userSettingsStore.userSettings[props.userId]?.notifications,
        emailProvider: value
      }
    });
  }
});
// Verificar se o usuário é admin
const isAdmin = computed(() => {
  return authStore.currentUser?.role !== undefined && authStore.currentUser.role === UserRole.ADMIN;
});
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-primary mb-4">Notificações</h3>
    
    <!-- Canais de notificação -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Canais de Notificação</h4>
      
      <div class="space-y-3">
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="emailNotifications" 
            class="form-checkbox mr-2"
          />
          <span class="text-gray-700">Email</span>
        </label>
        
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="pushNotifications" 
            class="form-checkbox mr-2"
          />
          <span class="text-gray-700">Notificações Push</span>
        </label>
      </div>
    </div>
    
    <!-- Frequência de notificação -->
    <div class="mb-6" v-if="emailNotifications">
      <h4 class="font-medium text-gray-700 mb-2">Frequência de Relatórios</h4>
      <div class="w-full">
        <select
          v-model="notificationFrequency"
          class="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        >
          <option value="daily">Diária</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
          <option value="never">Apenas notificações pontuais</option>
        </select>
      </div>
      
      <!-- Configurações de provedor de email - apenas para admins -->
      <div v-if="isAdmin" class="mt-4">
        <h5 class="text-sm font-medium text-gray-600 mb-2">Provedor de Email</h5>
        <div class="space-y-2">
          <label class="flex items-center cursor-pointer">
            <input 
              type="radio" 
              value="emailjs" 
              v-model="emailProvider" 
              class="form-radio mr-2"
            />
            <span class="text-gray-700">EmailJS <span class="text-xs text-gray-500">(recomendado)</span></span>
          </label>
          
          <label class="flex items-center cursor-pointer">
            <input 
              type="radio" 
              value="smtp" 
              v-model="emailProvider" 
              class="form-radio mr-2"
            />
            <span class="text-gray-700">SMTP Personalizado</span>
          </label>
          
          <label class="flex items-center cursor-pointer">
            <input 
              type="radio" 
              value="none" 
              v-model="emailProvider" 
              class="form-radio mr-2"
            />
            <span class="text-gray-700">Nenhum (desativar emails)</span>
          </label>
        </div>
      </div>
    </div>
    
    <!-- Tipos de notificação -->
    <div>
      <h4 class="font-medium text-gray-700 mb-2">Tipos de Notificação</h4>
      
      <div class="space-y-3">
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="salesNotifications" 
            class="form-checkbox mr-2"
          />
          <div>
            <span class="text-gray-700">Vendas</span>
            <p class="text-xs text-gray-500">Relatórios e atualizações de vendas</p>
          </div>
        </label>
        
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="raffleNotifications" 
            class="form-checkbox mr-2"
          />
          <div>
            <span class="text-gray-700">Sorteios</span>
            <p class="text-xs text-gray-500">Resultados e datas de sorteios</p>
          </div>
        </label>
        
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="systemNotifications" 
            class="form-checkbox mr-2"
          />
          <div>
            <span class="text-gray-700">Sistema</span>
            <p class="text-xs text-gray-500">Manutenção e atualizações da plataforma</p>
          </div>
        </label>
      </div>
    </div>
  </div>
</template>
