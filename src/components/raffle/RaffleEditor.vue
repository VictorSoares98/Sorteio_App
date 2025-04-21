<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { imageToBase64 } from '../../services/raffle';
import Modal from '../ui/Modal.vue';

const props = defineProps<{
  raffleData: any;
}>();

const emit = defineEmits(['save']);

// Criar cópia dos dados para edição
const editedData = ref({ ...props.raffleData });
const imageLoading = ref(false);
const imageError = ref<string | null>(null);
const priceInput = ref('');

// Valores pré-definidos para o preço do bilhete
const priceOptions = [1, 2, 5, 10, 20, 50];

// Constante para o limite máximo de preço
const MAX_PRICE_LIMIT = 1000000; // 1 milhão em reais

// Estados para o modal de confirmação
const showModal = ref(false);
const modalMessage = ref('');
const isValid = ref(false);

// Validar dados antes de salvar
const validateForm = () => {
  // Validação básica
  if (!editedData.value.title.trim()) {
    modalMessage.value = 'O título do sorteio é obrigatório';
    showModal.value = true;
    return false;
  }
  
  if (!editedData.value.description.trim()) {
    modalMessage.value = 'A descrição do sorteio é obrigatória';
    showModal.value = true;
    return false;
  }
  
  // Validação do tamanho mínimo da descrição
  if (editedData.value.description.trim().length < 10) {
    modalMessage.value = 'A descrição do prêmio deve ter pelo menos 10 caracteres';
    showModal.value = true;
    return false;
  }
  
  if (!editedData.value.raffleDate.trim()) {
    modalMessage.value = 'A data do sorteio é obrigatória';
    showModal.value = true;
    return false;
  }
  
  // Validar preço mínimo
  if (editedData.value.price <= 0) {
    modalMessage.value = 'O preço do bilhete de Sorteio não pode ser zero (0,00)';
    showModal.value = true;
    return false;
  }
  
  // Validar limite máximo de preço
  if (editedData.value.price > MAX_PRICE_LIMIT) {
    modalMessage.value = `O preço máximo do bilhete não pode exceder R$ ${MAX_PRICE_LIMIT.toLocaleString('pt-BR')}`;
    showModal.value = true;
    return false;
  }
  
  return true;
};

// Preparar para salvar alterações
const prepareToSave = () => {
  if (validateForm()) {
    modalMessage.value = 'Deseja salvar as alterações realizadas no sorteio?';
    isValid.value = true;
    showModal.value = true;
  }
};

// Enviar alterações para o componente pai (após confirmação)
const confirmSave = () => {
  emit('save', editedData.value);
  showModal.value = false;
};

// Cancelar a operação
const cancelSave = () => {
  showModal.value = false;
};

// Lidar com atualização de imagem
const handleImageChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  // Limpar erros anteriores
  imageError.value = null;
  
  // Verificar tipo de arquivo - suportar mais formatos de imagem
  const supportedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp'];
  
  if (!supportedFormats.includes(file.type)) {
    imageError.value = 'Formato de imagem não suportado. Use JPEG, PNG, GIF, WEBP, SVG ou BMP.';
    return;
  }
  
  // Limitação de tamanho (2MB)
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (file.size > MAX_SIZE) {
    imageError.value = 'A imagem deve ter menos de 2MB.';
    return;
  }
  
  try {
    imageLoading.value = true;
    
    // Converter para base64 usando o serviço
    const base64Image = await imageToBase64(file);
    editedData.value.imageUrl = base64Image;
    
  } catch (error) {
    console.error('Erro ao processar imagem:', error);
    imageError.value = 'Não foi possível processar a imagem. Tente novamente.';
  } finally {
    imageLoading.value = false;
  }
};

// Remover imagem
const removeImage = () => {
  editedData.value.imageUrl = null;
};

// Formatar preço para BRL
const formatPriceToBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Lidar com entrada de preço
const handlePriceInput = (event: Event) => {
  // Obter apenas dígitos da entrada
  const input = (event.target as HTMLInputElement).value.replace(/\D/g, '');
  
  // Converter para um valor decimal (divide por 100 para transformar centavos em reais)
  let numericValue = input ? parseInt(input) / 100 : 0;
  
  // Limitando o valor máximo a 1 milhão
  if (numericValue > MAX_PRICE_LIMIT) {
    numericValue = MAX_PRICE_LIMIT;
    // Atualizar o campo com valor formatado limitado
    setTimeout(() => {
      priceInput.value = formatPriceToBRL(MAX_PRICE_LIMIT);
    }, 0);
  }
  
  // Armazenar o valor numérico real
  editedData.value.price = numericValue;
  
  // Formatar para exibição no formato brasileiro
  priceInput.value = formatPriceToBRL(numericValue);
};

// Formatar preço ao perder o foco
const formatPrice = () => {
  priceInput.value = formatPriceToBRL(editedData.value.price);
};

// Função para selecionar um valor pré-definido
const selectPriceValue = (value: number) => {
  // Atualizar o valor numérico real
  editedData.value.price = value;
  
  // Formatar para exibição
  priceInput.value = formatPriceToBRL(value);
};

onMounted(() => {
  if (editedData.value.price) {
    priceInput.value = formatPriceToBRL(editedData.value.price);
  }
});
</script>

<template>
  <div class="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
    <h2 class="text-2xl font-bold text-center text-primary mb-6">Editar Informações do Sorteio</h2>
    
    <form @submit.prevent="prepareToSave" class="space-y-6">
      <!-- Informações básicas -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="title">
            Título do Sorteio
          </label>
          <input 
            id="title"
            v-model="editedData.title"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Ex: Sorteio Beneficente UMADRIMC"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="date">
            Data do Sorteio
          </label>
          <input 
            id="date"
            v-model="editedData.raffleDate"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
      
      <!-- Preço do bilhete -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="price">
          Preço do Bilhete
        </label>
        
        <div class="flex flex-col md:flex-row md:items-center gap-2">
          <!-- Input com largura total em mobile e reduzida em desktop -->
          <div class="relative w-full md:w-1/3 md:min-w-[144px] mb-2 md:mb-0">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-700">
              R$
            </span>
            <input 
              id="price"
              v-model="priceInput"
              type="text"
              class="w-full h-10 pl-10 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
              @input="handlePriceInput"
              @blur="formatPrice"
              placeholder="0,00"
            />
          </div>
          
          <!-- Container para botões de valores pré-definidos com grid responsivo -->
          <div class="w-full md:flex-1 grid grid-cols-3 md:grid-cols-6 gap-2">
            <button
              v-for="option in priceOptions"
              :key="option"
              type="button"
              @click="selectPriceValue(option)"
              :class="[
                'h-10 rounded-md px-3 text-sm flex items-center justify-center transition-colors',
                editedData.price === option 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              ]"
            >
              R$ {{ option.toFixed(2).replace('.', ',') }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Descrição do prêmio -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="description">
          Descrição do Prêmio
        </label>
        <textarea 
          id="description"
          v-model="editedData.description"
          rows="4"
          minlength="10"
          style="min-height: 100px;"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          placeholder="Descreva detalhes sobre o item que será sorteado..."
        ></textarea>
        <p class="text-xs text-gray-500 mt-1">
          Escreva pelo menos 10 caracteres para uma boa descrição do prêmio.
        </p>
      </div>
      
      <!-- Upload de imagem -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="imageUpload">
          Imagem do Prêmio
        </label>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Visualização da imagem atual -->
          <div class="border rounded-lg p-2 bg-gray-50 relative">
            <p class="text-xs text-gray-500 mb-1">Imagem atual:</p>
            <div class="relative h-40 flex items-center justify-center">
              <img 
                v-if="editedData.imageUrl && !imageLoading" 
                :src="editedData.imageUrl" 
                alt="Preview" 
                class="max-h-40 max-w-full object-contain rounded"
              />
              
              <!-- Placeholder visual quando não há imagem -->
              <div v-if="!editedData.imageUrl && !imageLoading" class="flex flex-col items-center justify-center h-full w-full border-2 border-dashed border-gray-300 rounded-lg p-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2l1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
                </svg>
                <p class="text-sm text-gray-500 text-center">Nenhuma imagem selecionada</p>
                <p class="text-xs text-primary mt-1">Clique no botão "Escolher arquivo" para adicionar uma imagem</p>
              </div>
              
              <div v-if="imageLoading" class="flex flex-col items-center">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                <span class="text-sm text-gray-500">Processando imagem...</span>
              </div>
            </div>
            
            <!-- Botão para remover imagem com ícone X em 3D -->
            <button 
              v-if="editedData.imageUrl && !imageLoading && editedData.imageUrl.indexOf('placeholder') === -1"
              @click="removeImage"
              type="button"
              class="absolute top-0 right-0 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200"
              aria-label="Remover imagem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="text-danger">
                <!-- Círculo de fundo para efeito 3D -->
                <circle cx="12" cy="12" r="11" fill="white" class="filter drop-shadow-md"/>
                <!-- X com efeito 3D -->
                <path d="M16 8L8 16M8 8l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="filter drop-shadow-sm"/>
              </svg>
            </button>
          </div>
          
          <!-- Input de upload -->
          <div class="flex flex-col justify-center">
            <input
              id="imageUpload"
              type="file"
              accept="image/*"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
              @change="handleImageChange"
              :disabled="imageLoading"
            />
            <p class="text-xs text-gray-500 mt-1">
              Formatos aceitos: JPEG, PNG, GIF, WEBP, SVG, BMP. Tamanho máximo: 2MB.
            </p>
            <p v-if="imageError" class="text-xs text-danger mt-1">
              {{ imageError }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Botões de ação -->
      <div class="flex justify-end space-x-3 pt-6">
        <button 
          type="submit" 
          class="bg-primary hover:bg-primary-dark text-white py-2 px-6 rounded transition-colors font-medium flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Salvar Alterações
        </button>
      </div>
    </form>
    
    <!-- Modal de confirmação -->
    <Modal 
      :show="showModal" 
      :title="isValid ? 'Confirmação' : 'Atenção'"
      @close="cancelSave"
      :closeOnClickOutside="!isValid"
    >
      <p class="py-4">{{ modalMessage }}</p>
      
      <template #footer>
        <div class="flex justify-end space-x-3">
          <button 
            @click="cancelSave"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            v-if="isValid"
            @click="confirmSave"
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Confirmar
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>
