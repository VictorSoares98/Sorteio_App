<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useProfileUpdate } from '../../composables/useProfileUpdate';
import Input from '../ui/Input.vue';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';
import Card from '../ui/Card.vue';
import { validateName, validatePhone } from '../../utils/validation';

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
