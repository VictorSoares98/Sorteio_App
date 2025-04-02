<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useProfileUpdate } from '../../composables/useProfileUpdate';
import { useAuthStore } from '../../stores/authStore';
import Input from '../ui/Input.vue';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';
import Card from '../ui/Card.vue';
import { validateName, validatePhone, validatePassword } from '../../utils/validation';

const { 
  currentUser,
  profileFormData, 
  loading, 
  error, 
  updateSuccess, 
  updateUserProfile, 
  initProfileForm,
  
  // Funcionalidades para foto de perfil
  photoPreview,
  photoFile,
  photoLoading,
  photoError,
  handleFileSelection,
  clearPhoto,
  cancelPhotoChange,
  removePhoto,
  
  // Informações de compressão
  compressedSize,
  compressionRatio
} = useProfileUpdate();

const validationErrors = ref<Record<string, string>>({});
const isEditMode = ref(false); // Novo estado para controlar o modo de edição
const fileInputRef = ref<HTMLInputElement | null>(null);

// Função para gerar avatar padrão baseado no nome do usuário
const getDefaultAvatar = (name: string) => {
  // Usando Dicebear como serviço de avatar padrão
  const seed = encodeURIComponent(name || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=FF8C00`;
};

// Inicializar dados do formulário quando o componente for montado
onMounted(() => {
  initProfileForm();
});

// Ativar seleção de arquivo
const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

// Envio do formulário
const submitForm = async () => {
  // Validação
  validationErrors.value = {};
  let isValid = true;

  if (!validateName(profileFormData.value.displayName)) {
    validationErrors.value.displayName = 'O nome deve ter pelo menos 5 caracteres';
    isValid = false;
  }

  // Validação do username
  if (!profileFormData.value.username || profileFormData.value.username.length < 3) {
    validationErrors.value.username = 'O nome de usuário deve ter pelo menos 3 caracteres';
    isValid = false;
  }

  if (profileFormData.value.phone && !validatePhone(profileFormData.value.phone)) {
    validationErrors.value.phone = 'Formato de telefone inválido';
    isValid = false;
  }

  if (!isValid) return;

  // Envia os dados para atualização
  const success = await updateUserProfile();
  
  // Se a atualização foi bem-sucedida, sai do modo de edição
  if (success) {
    isEditMode.value = false;
  }
};

// Alternar para o modo de edição
const enableEditMode = () => {
  isEditMode.value = true;
};

// Cancelar edição
const cancelEdit = () => {
  isEditMode.value = false;
  initProfileForm(); // Restaurar os dados originais
  validationErrors.value = {}; // Limpar erros de validação
  cancelPhotoChange(); // Resetar mudanças na foto
};

// Estado para alteração de senha
const authStore = useAuthStore();
const showPasswordSection = ref(false);
const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const passwordLoading = ref(false);
const passwordError = ref('');
const passwordSuccess = ref(false);
const showPasswords = ref(false); // Único estado para controlar visibilidade de todas as senhas

// Toggle de visibilidade de todas as senhas juntas
const togglePasswordVisibility = () => {
  showPasswords.value = !showPasswords.value;
};

// Alternar exibição da seção de senha
const togglePasswordSection = () => {
  showPasswordSection.value = !showPasswordSection.value;
  
  // Limpar campos ao esconder a seção
  if (!showPasswordSection.value) {
    currentPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
    passwordError.value = '';
    passwordSuccess.value = false;
    showPasswords.value = false; // Resetar também o estado de visibilidade
  }
};

// Validar e atualizar senha
const updateUserPassword = async () => {
  passwordError.value = '';
  passwordSuccess.value = false;
  
  // Validar campos de senha
  if (!currentPassword.value) {
    passwordError.value = 'Por favor, insira sua senha atual';
    return;
  }
  
  if (!validatePassword(newPassword.value)) {
    passwordError.value = 'A nova senha deve ter pelo menos 6 caracteres';
    return;
  }
  
  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = 'As senhas não correspondem';
    return;
  }
  
  passwordLoading.value = true;
  
  try {
    // Primeiro, reautenticar o usuário
    await authStore.reauthenticateUser(currentPassword.value);
    
    // Depois, atualizar a senha
    await authStore.updatePasswordAction(newPassword.value);
    
    // Sucesso
    passwordSuccess.value = true;
    currentPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
    
    // Fechar a seção após 3 segundos
    setTimeout(() => {
      if (passwordSuccess.value) {
        showPasswordSection.value = false;
        passwordSuccess.value = false;
      }
    }, 3000);
  } catch (error: any) {
    passwordError.value = error.message || 'Erro ao atualizar senha';
  } finally {
    passwordLoading.value = false;
  }
};
</script>

<template>
  <Card title="Informações do Perfil">
    <div class="p-4">
      <!-- Alertas -->
      <Alert
        v-if="updateSuccess"
        type="success"
        message="Perfil atualizado com sucesso!"
        dismissible
        autoClose
        class="mb-4"
      />
      
      <Alert
        v-if="error"
        type="error"
        :message="error"
        dismissible
        class="mb-4"
      />
      
      <!-- Modo de Visualização -->
      <div v-if="!isEditMode && currentUser" class="space-y-4">
        <div class="border-b pb-2 mb-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-primary">Seus Dados</h3>
            <Button 
              @click="enableEditMode" 
              variant="outline" 
              size="sm"
            >
              Editar Perfil
            </Button>
          </div>
        </div>
        
        <!-- Foto de perfil -->
        <div class="flex flex-col items-center mb-6">
          <div class="w-24 h-24 rounded-full overflow-hidden border-2 border-primary mb-2">
            <img 
              :src="currentUser.photoURL || getDefaultAvatar(currentUser.displayName)" 
              :alt="currentUser.displayName"
              class="w-full h-full object-cover"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Nome Completo</p>
            <p class="font-medium">{{ currentUser.displayName }}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">Nome de usuário</p>
            <p class="font-medium">{{ currentUser.username }}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">Email</p>
            <p class="font-medium">{{ currentUser.email }}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">Telefone</p>
            <p class="font-medium">{{ currentUser.phone || 'Não informado' }}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-500">Congregação</p>
            <p class="font-medium">{{ currentUser.congregation || 'Não informada' }}</p>
          </div>
        </div>
      </div>
      
      <!-- Modo de Edição (Formulário) -->
      <form v-if="isEditMode" @submit.prevent="submitForm">
        <div class="border-b pb-2 mb-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-primary">Editar Perfil</h3>
          </div>
        </div>
        
        <!-- Foto de perfil (Modo de edição) -->
        <div class="flex flex-col items-center mb-6">
          <!-- Prévia ou foto atual -->
          <div class="w-32 h-32 rounded-full overflow-hidden border-2 border-primary mb-4">
            <img 
              v-if="photoPreview"
              :src="photoPreview" 
              alt="Prévia da foto"
              class="w-full h-full object-cover"
            />
            <img 
              v-else-if="!removePhoto && currentUser?.photoURL"
              :src="currentUser.photoURL" 
              alt="Foto atual"
              class="w-full h-full object-cover"
            />
            <img 
              v-else
              :src="getDefaultAvatar(profileFormData.displayName)" 
              alt="Avatar padrão"
              class="w-full h-full object-cover"
            />
          </div>
          
          <!-- Informações de compressão -->
          <div v-if="compressedSize && compressionRatio" class="text-xs text-gray-600 mb-2 text-center">
            <p>Imagem comprimida: {{ compressedSize }}</p>
            <p>Redução de tamanho: {{ compressionRatio }}%</p>
          </div>
          
          <!-- Alertas para foto -->
          <Alert
            v-if="photoError"
            type="error"
            :message="photoError"
            dismissible
            class="mb-4 w-full max-w-md"
            @dismiss="photoError = null"
          />
          
          <!-- Mensagem de carregando -->
          <div v-if="photoLoading" class="flex items-center justify-center mb-2">
            <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            <span class="text-sm text-gray-600">Comprimindo imagem...</span>
          </div>
          
          <!-- Input de arquivo oculto -->
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelection"
          />
          
          <!-- Botões de ação para foto -->
          <div class="flex space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              @click="triggerFileInput"
              :disabled="photoLoading"
            >
              {{ photoFile ? 'Trocar foto' : 'Enviar foto' }}
            </Button>
            
            <Button 
              v-if="photoFile || currentUser?.photoURL"
              type="button" 
              variant="outline" 
              size="sm" 
              @click="clearPhoto"
              :disabled="photoLoading"
            >
              Remover foto
            </Button>
            
            <Button 
              v-if="photoFile || removePhoto"
              type="button" 
              variant="outline" 
              size="sm" 
              @click="cancelPhotoChange"
              :disabled="photoLoading"
            >
              Cancelar
            </Button>
          </div>
          
          <p class="text-xs text-gray-500 mt-2">
            A imagem será otimizada automaticamente para garantir o melhor desempenho.
          </p>
        </div>

        <Input
          v-model="profileFormData.displayName"
          label="Nome Completo"
          required
          :error="validationErrors.displayName"
        />
        
        <!-- Campo de username adicionado -->
        <Input
          v-model="profileFormData.username"
          label="Nome de Usuário"
          required
          :error="validationErrors.username"
        />
        
        <Input
          v-model="profileFormData.phone"
          label="Telefone"
          placeholder="(00) 00000-0000"
          :error="validationErrors.phone"
        />
        
        <Input
          v-model="profileFormData.congregation"
          label="Congregação"
        />
        
        <div class="mt-6 flex space-x-3">
          <Button
            type="button"
            variant="outline" 
            @click="cancelEdit"
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            variant="primary"
            :disabled="loading"
          >
            <span v-if="loading">Salvando...</span>
            <span v-else>Salvar Alterações</span>
          </Button>
        </div>
      </form>
    </div>
  </Card>

  <!-- Password Change Section -->
  <Card title="Segurança da Conta" class="mt-6" v-if="!isEditMode && currentUser">
    <div class="p-4">
      <div class="border-b pb-2 mb-4">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium text-primary">Alterar Senha</h3>
          <Button 
            @click="togglePasswordSection" 
            variant="outline" 
            size="sm"
          >
            {{ showPasswordSection ? 'Cancelar' : 'Atualizar Senha' }}
          </Button>
        </div>
      </div>
      
      <!-- Alertas de senha -->
      <Alert
        v-if="passwordSuccess"
        type="success"
        message="Senha atualizada com sucesso!"
        dismissible
        autoClose
        class="mb-4"
      />
      
      <Alert
        v-if="passwordError"
        type="error"
        :message="passwordError"
        dismissible
        class="mb-4"
        @dismiss="passwordError = ''"
      />
      
      <div v-if="showPasswordSection" class="space-y-4">
        <!-- Senha atual -->
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2" for="currentPassword">
            Senha Atual
          </label>
          <div class="relative">
            <input
              id="currentPassword"
              v-model="currentPassword"
              :type="showPasswords ? 'text' : 'password'"
              class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Digite sua senha atual"
            />
            <button 
              type="button" 
              @click="togglePasswordVisibility" 
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 focus:outline-none"
              tabindex="-1"
            >
              <svg v-if="showPasswords" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Nova senha -->
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2" for="newPassword">
            Nova Senha
          </label>
          <div class="relative">
            <input
              id="newPassword"
              v-model="newPassword"
              :type="showPasswords ? 'text' : 'password'"
              class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Digite sua nova senha"
            />
            <button 
              type="button" 
              @click="togglePasswordVisibility" 
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 focus:outline-none"
              tabindex="-1"
            >
              <svg v-if="showPasswords" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>
        
        <!-- Confirmar nova senha -->
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-medium mb-2" for="confirmNewPassword">
            Confirmar Nova Senha
          </label>
          <div class="relative">
            <input
              id="confirmNewPassword"
              v-model="confirmNewPassword"
              :type="showPasswords ? 'text' : 'password'"
              class="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              placeholder="Confirme sua nova senha"
            />
            <button 
              type="button" 
              @click="togglePasswordVisibility" 
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 focus:outline-none"
              tabindex="-1"
            >
              <svg v-if="showPasswords" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="mt-6">
          <Button
            type="button"
            variant="primary"
            :disabled="passwordLoading"
            @click="updateUserPassword"
          >
            <span v-if="passwordLoading">Atualizando...</span>
            <span v-else>Atualizar Senha</span>
          </Button>
          
          <p class="text-xs text-gray-500 mt-2">
            A senha deve ter pelo menos 6 caracteres.
          </p>
        </div>
      </div>
      
      <div v-else class="text-gray-600 text-sm">
        <p>Aqui você pode atualizar sua senha para manter sua conta segura.</p>
        <p class="mt-2">Recomendamos alterar sua senha periodicamente e usar uma senha forte.</p>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.photo-preview-container {
  position: relative;
  transition: all 0.3s ease;
}

.photo-preview-container:hover .photo-overlay {
  opacity: 1;
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 9999px;
}
</style>
