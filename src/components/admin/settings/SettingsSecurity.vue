<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserSettingsStore } from '../../../stores/userSettingsStore';
import { useAuthStore } from '../../../stores/authStore';

const props = defineProps<{
  userId: string;
}>();

const userSettingsStore = useUserSettingsStore();
const authStore = useAuthStore();
const showResetConfirm = ref(false);
const showPasswordForm = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const passwordError = ref<string | null>(null);
const passwordStrength = ref(0);

// Autenticação de dois fatores
const twoFactorAuth = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.security.twoFactorAuth || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      security: {
        ...userSettingsStore.userSettings[props.userId]?.security,
        twoFactorAuth: value
      }
    });
  }
});

// Requer alteração de senha
const requirePasswordChange = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.security.requirePasswordChange || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      security: {
        ...userSettingsStore.userSettings[props.userId]?.security,
        requirePasswordChange: value
      }
    });
  }
});

// Última alteração de senha
const lastPasswordChange = computed(() => {
  const settings = userSettingsStore.userSettings[props.userId];
  if (!settings?.security.lastPasswordChange) return 'Nunca';
  
  try {
    return new Date(settings.security.lastPasswordChange).toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida';
  }
});

// Timeout de inatividade
const inactivityTimeout = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.security.inactivityTimeout || 30;
  },
  set: (value: number) => {
    userSettingsStore.updateUserSettings(props.userId, {
      security: {
        ...userSettingsStore.userSettings[props.userId]?.security,
        inactivityTimeout: value
      }
    });
  }
});

// Confirmar ações sensíveis
const confirmSensitiveActions = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.security.confirmSensitiveActions ?? true;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      security: {
        ...userSettingsStore.userSettings[props.userId]?.security,
        confirmSensitiveActions: value
      }
    });
  }
});

// Verificar se o usuário é admin
const isAdmin = computed(() => {
  return authStore.currentUser?.role === UserRole.ADMIN;
});

// Import the UserRole enum at the top of the file
import { UserRole } from '../../../types/user'; // Adjust the import path as needed

// Função para redefinir todas as preferências de segurança
const resetSecurityPreferences = () => {
  userSettingsStore.updateUserSettings(props.userId, {
    security: {
      twoFactorAuth: false,
      requirePasswordChange: false,
      lastPasswordChange: new Date(),
      inactivityTimeout: 30,
      confirmSensitiveActions: true
    }
  });
  showResetConfirm.value = false;
};

// Função para alterar senha
const changePassword = async () => {
  // Implementação de validação de senha
  passwordError.value = null;
  
  if (!currentPassword.value) {
    passwordError.value = "A senha atual é obrigatória";
    return;
  }
  
  if (newPassword.value.length < 8) {
    passwordError.value = "A nova senha deve ter pelo menos 8 caracteres";
    return;
  }
  
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = "As senhas não coincidem";
    return;
  }
  
  try {
    // Aqui implementaríamos a lógica real de alteração de senha
    // Por enquanto, apenas simularemos uma alteração bem-sucedida
    
    // Atualizar a data da última alteração de senha
    userSettingsStore.updateUserSettings(props.userId, {
      security: {
        ...userSettingsStore.userSettings[props.userId]?.security,
        lastPasswordChange: new Date()
      }
    });
    
    // Fechar o formulário de alteração de senha
    showPasswordForm.value = false;
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
    
    // Criar notificação de sucesso (em uma implementação real)
    alert('Senha alterada com sucesso!');
  } catch (error) {
    passwordError.value = "Erro ao alterar senha. Verifique suas credenciais.";
  }
};

// Avaliar força da senha quando ela é alterada
const evaluatePasswordStrength = (password: string) => {
  // Critérios básicos de força de senha
  let strength = 0;
  
  if (password.length >= 8) strength += 1;
  if (password.match(/[A-Z]/)) strength += 1;
  if (password.match(/[a-z]/)) strength += 1;
  if (password.match(/[0-9]/)) strength += 1;
  if (password.match(/[^A-Za-z0-9]/)) strength += 1;
  
  passwordStrength.value = strength;
};

// Monitorar alterações na nova senha
const onPasswordChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  newPassword.value = target.value;
  evaluatePasswordStrength(target.value);
};
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-primary mb-4">Segurança</h3>
    
    <!-- Alteração de senha -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Senha</h4>
      <div class="text-sm text-gray-600 mb-3">
        <span class="font-medium">Última alteração de senha:</span> {{ lastPasswordChange }}
      </div>
      
      <button 
        v-if="!showPasswordForm"
        @click="showPasswordForm = true"
        class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors text-sm"
      >
        Alterar Senha
      </button>
      
      <!-- Formulário de alteração de senha -->
      <div v-if="showPasswordForm" class="mt-4 p-4 border border-gray-200 rounded-lg">
        <h5 class="font-medium text-gray-700 mb-3">Alterar Senha</h5>
        
        <div v-if="passwordError" class="mb-3 p-2 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
          {{ passwordError }}
        </div>
        
        <div class="space-y-3">
          <div>
            <label for="current-password" class="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
            <input 
              id="current-password" 
              type="password" 
              v-model="currentPassword"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div>
            <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <input 
              id="new-password" 
              type="password" 
              :value="newPassword"
              @input="onPasswordChange"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
            
            <!-- Medidor de força de senha -->
            <div class="mt-1">
              <div class="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  :class="{
                    'bg-red-500': passwordStrength < 3,
                    'bg-yellow-500': passwordStrength === 3,
                    'bg-green-500': passwordStrength > 3
                  }"
                  class="h-full transition-all"
                  :style="{ width: `${passwordStrength * 20}%` }"
                ></div>
              </div>
              <p class="text-xs mt-1 text-gray-500">
                {{ 
                  passwordStrength === 0 ? 'Digite sua nova senha' :
                  passwordStrength < 3 ? 'Senha fraca' :
                  passwordStrength === 3 ? 'Senha média' : 'Senha forte'
                }}
              </p>
            </div>
          </div>
          
          <div>
            <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <input 
              id="confirm-password" 
              type="password" 
              v-model="confirmPassword"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        
        <div class="flex justify-end space-x-2 mt-4">
          <button 
            @click="showPasswordForm = false" 
            class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded text-sm transition-colors"
          >
            Cancelar
          </button>
          <button 
            @click="changePassword" 
            class="bg-primary hover:bg-primary-dark text-white py-1 px-3 rounded text-sm transition-colors"
          >
            Salvar Nova Senha
          </button>
        </div>
      </div>
    </div>
    
    <!-- Configurações de segurança -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Autenticação</h4>
      <div class="space-y-4">
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="twoFactorAuth" 
            class="form-checkbox mr-2"
          />
          <div>
            <span class="text-gray-700">Ativar autenticação de dois fatores</span>
            <p class="text-xs text-gray-500">Aumenta a segurança exigindo um código além da senha</p>
          </div>
        </label>
        
        <div v-if="isAdmin">
          <label class="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="requirePasswordChange" 
              class="form-checkbox mr-2"
            />
            <div>
              <span class="text-gray-700">Exigir alteração de senha no próximo login</span>
              <p class="text-xs text-gray-500">Forçar a redefinição da senha no próximo acesso</p>
            </div>
          </label>
        </div>
      </div>
    </div>
    
    <!-- Configurações de sessão -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Configurações de Sessão</h4>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="inactivity-timeout">
            Tempo de inatividade para logout automático
          </label>
          <div class="flex items-center">
            <input 
              id="inactivity-timeout" 
              type="range" 
              min="5" 
              max="60" 
              step="5" 
              v-model.number="inactivityTimeout"
              class="w-full max-w-xs mr-3"
            />
            <span class="text-gray-700 w-24">{{ inactivityTimeout }} minutos</span>
          </div>
        </div>
        
        <label class="flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            v-model="confirmSensitiveActions" 
            class="form-checkbox mr-2"
          />
          <div>
            <span class="text-gray-700">Confirmar ações sensíveis</span>
            <p class="text-xs text-gray-500">Solicitar confirmação para exclusão ou alterações importantes</p>
          </div>
        </label>
      </div>
    </div>
    
    <!-- Reset de preferências -->
    <div>
      <button 
        v-if="!showResetConfirm"
        @click="showResetConfirm = true" 
        class="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-2 px-4 rounded transition-colors text-sm"
      >
        Redefinir Preferências de Segurança
      </button>
      
      <div v-else class="border p-3 rounded border-red-300 bg-red-50">
        <p class="mb-2 text-red-700 text-sm">Tem certeza? Isso redefinirá todas as suas preferências de segurança.</p>
        <div class="flex space-x-2">
          <button 
            @click="resetSecurityPreferences" 
            class="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600 text-xs"
          >
            Sim, redefinir
          </button>
          <button 
            @click="showResetConfirm = false" 
            class="bg-gray-200 text-gray-800 py-1 px-3 rounded hover:bg-gray-300 text-xs"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
