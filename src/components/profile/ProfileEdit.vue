<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useProfileUpdate } from '../../composables/useProfileUpdate';
import Input from '../ui/Input.vue';
import Button from '../ui/Button.vue';
import Alert from '../ui/Alert.vue';
import Card from '../ui/Card.vue';
import { validateName, validatePhone } from '../../utils/validation';

const { 
  profileFormData, 
  loading, 
  error, 
  updateSuccess, 
  updateUserProfile, 
  initProfileForm 
} = useProfileUpdate();

const validationErrors = ref<Record<string, string>>({});

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

  if (profileFormData.value.phone && !validatePhone(profileFormData.value.phone)) {
    validationErrors.value.phone = 'Formato de telefone inválido';
    isValid = false;
  }

  if (!isValid) return;

  // Envia os dados para atualização
  await updateUserProfile();
};
</script>

<template>
  <Card title="Editar Perfil">
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
      
      <!-- Formulário -->
      <form @submit.prevent="submitForm">
        <Input
          v-model="profileFormData.displayName"
          label="Nome Completo"
          required
          :error="validationErrors.displayName"
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
        
        <div class="mt-6">
          <Button
            type="submit"
            variant="primary"
            block
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
