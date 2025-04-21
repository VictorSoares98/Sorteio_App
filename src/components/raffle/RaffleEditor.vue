<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { imageToBase64 } from '../../services/raffle';
import Modal from '../ui/Modal.vue';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { DateTime } from 'luxon';

const props = defineProps<{
  raffleData: any;
}>();

const emit = defineEmits(['save']);

// Criar cópia dos dados para edição
const editedData = ref({ ...props.raffleData });
const imageLoading = ref(false);
const imageError = ref<string | null>(null);
const priceInput = ref('');
const dateError = ref<string | null>(null);

// Valores pré-definidos para o preço do bilhete
const priceOptions = [1, 2, 5, 10, 20, 50];

// Constante para o limite máximo de preço
const MAX_PRICE_LIMIT = 1000000; // 1 milhão em reais

// Estados para o modal de confirmação
const showModal = ref(false);
const modalMessage = ref('');
const isValid = ref(false);

// Configuração do datepicker em português com configuração segura para Luxon
const datepickerLocale = {
  months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  weekdays: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  weekdaysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  firstDay: 0, // Domingo como primeiro dia
  format: 'dd/MM/yyyy' // Definir o formato explicitamente aqui
};

// Configurações avançadas para o datepicker
const minDate = computed(() => {
  // Data mínima é hoje
  return DateTime.now().toJSDate();
});

const maxDate = computed(() => {
  // Data máxima é 1 ano no futuro
  return DateTime.now().plus({ years: 1 }).toJSDate();
});

// Lista de feriados nacionais brasileiros (estática para o ano atual e o próximo)
const getFeriados = (): Date[] => {
  const anoAtual = new Date().getFullYear();
  const proximoAno = anoAtual + 1;
  
  // Lista estática de feriados nacionais para os próximos dois anos
  // Formato: mm/dd/yyyy
  const feriadosStrings = [
    // Ano atual
    `01/01/${anoAtual}`, // Confraternização Universal
    `02/20/${anoAtual}`, // Carnaval
    `04/07/${anoAtual}`, // Sexta-feira Santa
    `04/21/${anoAtual}`, // Tiradentes
    `05/01/${anoAtual}`, // Dia do Trabalho
    `06/15/${anoAtual}`, // Corpus Christi
    `09/07/${anoAtual}`, // Independência do Brasil
    `10/12/${anoAtual}`, // Nossa Senhora Aparecida
    `11/02/${anoAtual}`, // Finados
    `11/15/${anoAtual}`, // Proclamação da República
    `12/25/${anoAtual}`, // Natal
    // Próximo ano
    `01/01/${proximoAno}`, // Confraternização Universal próximo ano
  ];
  
  return feriadosStrings.map(dateStr => new Date(dateStr));
};

// Feriados convertidos para datas
const feriados = getFeriados();

// Função para verificar se uma data é feriado 
// NOTA: Mantida apenas para referência futura - não utilizada atualmente para bloquear dias
const isFeriado = (date: Date): boolean => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return false; // Retorna falso para datas inválidas
  }
  
  return feriados.some(feriado => 
    feriado.getDate() === date.getDate() &&
    feriado.getMonth() === date.getMonth() &&
    feriado.getFullYear() === date.getFullYear()
  );
};

// Função personalizada para verificar se um dia da semana deve ser desabilitado
// Não bloqueia mais fins de semana (nenhum dia da semana será bloqueado)
const isWeekDayDisabled = (date: Date): boolean => {
  // Verificar se o dia é feriado (apenas para referência, não afeta a desabilitação)
  const ehFeriado = isFeriado(date);
  
  // Para fins de depuração, podemos verificar quais dias são feriados
  if (ehFeriado) {
    console.debug(`Data ${date.toLocaleDateString('pt-BR')} é feriado, mas está permitida`);
  }
  
  // Independentemente de ser feriado ou não, permitir todos os dias
  return false;
};

// Verificar se a data é válida
const isDateValid = (date: Date | null): boolean => {
  if (!date) return false;
  
  const jsDate = date instanceof Date ? date : new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Data não pode ser no passado
  if (jsDate < today) {
    dateError.value = 'A data do sorteio não pode ser no passado';
    return false;
  }
  
  // Data não pode ser mais de um ano no futuro
  const maxAllowedDate = new Date();
  maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + 1);
  
  if (jsDate > maxAllowedDate) {
    dateError.value = 'A data do sorteio não pode ser mais de 1 ano no futuro';
    return false;
  }
  
  // Se passou todas as validações, limpar erro e retornar válido
  dateError.value = null;
  return true;
};

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
  
  // Validação avançada de data adicionada aqui
  try {
    const raffleDate = new Date(editedData.value.raffleDate);
    if (!isDateValid(raffleDate)) {
      modalMessage.value = dateError.value || 'Data de sorteio inválida';
      showModal.value = true;
      return false;
    }
  } catch (error) {
    modalMessage.value = 'Formato de data inválido';
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
  // Verificar especificamente se a data está vazia para destacar o campo com erro
  if (!editedData.value.raffleDate.trim()) {
    dateError.value = 'A data do sorteio é obrigatória';
  }
  
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

// Lidar com alterações na data do datepicker
const handleDateChange = (newDate: Date | string | null) => {
  dateError.value = null; // Limpar erros anteriores
  
  if (newDate) {
    // Converter string para Date se necessário
    const dateObj = typeof newDate === 'string' ? new Date(newDate) : newDate;
    
    // Validar a data antes de aceitar
    if (isDateValid(dateObj)) {
      // Converter para formato ISO YYYY-MM-DD (garantir formato consistente)
      if (typeof newDate === 'string') {
        editedData.value.raffleDate = newDate;
      } else {
        editedData.value.raffleDate = dateObj.toISOString().split('T')[0];
      }
    } else {
      // Se a data for inválida, não atualizar o modelo
      // A mensagem de erro já foi definida em isDateValid
    }
  } else {
    editedData.value.raffleDate = '';
  }
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
            Título do Sorteio <span class="text-danger">*</span>
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
          <label class="block text-sm font-medium text-gray-700 mb-1" for="raffle-date-input">
            Data do Sorteio <span class="text-danger">*</span>
          </label>
          <VueDatePicker 
            uid="raffle-date-input"
            id="date"
            v-model="editedData.raffleDate"
            locale="pt-BR"
            :locale-config="datepickerLocale"
            format="dd/MM/yyyy"
            :enable-time-picker="false"
            :min-date="minDate"
            :max-date="maxDate"
            :disabled-days="isWeekDayDisabled"
            :class="{ 'error-date': dateError }"
            input-class-name="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
            @update:model-value="handleDateChange"
            placeholder="Selecione uma data"
            auto-apply
            model-type="yyyy-MM-dd"
            required
          />
          <p v-if="dateError" class="text-xs text-danger mt-1">
            {{ dateError }}
          </p>
          <p v-else class="text-xs text-gray-500 mt-1">
            Escolha uma data entre hoje e um ano no futuro.
          </p>
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

<style scoped>
.error-date :deep(input) {
  border-color: #e3342f !important;
  background-color: #fff5f5 !important;
}

.error-date :deep(.dp__input_wrap) {
  box-shadow: 0 0 0 1px #e3342f;
  border-radius: 0.375rem;
}
</style>
