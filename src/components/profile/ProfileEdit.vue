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
  initProfileForm 
} = useProfileUpdate();

const validationErrors = ref<Record<string, string>>({});
const isEditMode = ref(false); // Novo estado para controlar o modo de edição

// Inicializar dados do formulário quando o componente for montado
onMounted(() => {
  initProfileForm();
});

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
