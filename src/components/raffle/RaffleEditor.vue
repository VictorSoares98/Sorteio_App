<script setup lang="ts">
import { ref, onMounted, computed, defineAsyncComponent, watch } from 'vue';
import Modal from '../ui/Modal.vue';
// Implementação de lazy-loading para o datepicker
const VueDatePicker = defineAsyncComponent(() => 
  import('@vuepic/vue-datepicker').then(mod => {
    // Importar CSS de forma dinâmica para melhorar o carregamento inicial
    import('@vuepic/vue-datepicker/dist/main.css');
    return mod;
  })
);

import { useRaffleValidation } from '../../composables/useRaffleValidation';
import { useImageProcessing } from '../../composables/useImageProcessing';
import type { RaffleData } from '../../services/raffle';
import { MAX_AVAILABLE_NUMBERS, MIN_AVAILABLE_NUMBERS } from '../../utils/constants';

const props = defineProps<{
  raffleData: RaffleData;
}>();

const emit = defineEmits(['save']);

// Utilizar os composables
const { 
  dateError, 
  modalMessage, 
  showModal, 
  isValid, 
  isDateValid, 
  validateForm, 
  getDateLimits,
  getPriceLimit 
} = useRaffleValidation();

const { 
  imageLoading, 
  imageError, 
  processImage 
} = useImageProcessing();

// Criar cópia dos dados para edição
const editedData = ref({ ...props.raffleData });
// Controlar se o horário específico está habilitado
const enableSpecificTime = ref(!!props.raffleData.raffleTime);
const priceInput = ref('');
const availableNumbersInput = ref('');

// Valores pré-definidos para o preço do bilhete
const priceOptions = [1, 2, 5, 10, 20, 50];

// Valores pré-definidos para quantidade de números disponíveis
const numbersOptions = [100, 500, 1000, 2000, 5000, 10000];

// Obter o limite máximo de preço do composable
const MAX_PRICE_LIMIT = getPriceLimit();

// Configuração do datepicker em português com configuração segura para Luxon
const datepickerLocale = {
  months: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  weekdays: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  weekdaysShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  firstDay: 0, // Domingo como primeiro dia
  format: 'dd/MM/yyyy' // Definir o formato explicitamente aqui
};

// Obter limites de data do composable
const dateLimits = getDateLimits();
const minDate = computed(() => dateLimits.minDate);
const maxDate = computed(() => dateLimits.maxDate);

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

// Tipagem explícita para a função de verificação de feriados
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

// Definir as opções de visibilidade
const visibilityOptions = [
  { value: 'universal', label: 'Universal - Visível para todos' },
  { value: 'private', label: 'Privado - Apenas você pode ver' },
  { value: 'affiliates', label: 'Afiliados - Visível para sua rede' },
  { value: 'admin', label: 'Administrativo - Visível para administradores' }
];

// Estado para controlar visibilidade bloqueada
const visibilityLocked = ref(false);
const visibilityLockedMessage = ref('');

// Verificar se o sorteio tem vendas ao montar o componente
onMounted(async () => {
  if (props.raffleData.id && props.raffleData.visibility === 'universal') {
    try {
      const { checkIfRaffleHasSales } = await import('../../services/raffle');
      const hasSales = await checkIfRaffleHasSales(props.raffleData.id);
      
      if (hasSales) {
        visibilityLocked.value = true;
        visibilityLockedMessage.value = 'A visibilidade não pode ser alterada pois este sorteio já possui vendas registradas.';
      }
    } catch (error) {
      console.error('Erro ao verificar vendas do sorteio:', error);
    }
  }
});

// Preparar para salvar alterações
const prepareToSave = () => {
  // Verificar especificamente se a data está vazia para destacar o campo com erro
  if (!editedData.value.raffleDate.trim()) {
    dateError.value = 'A data do sorteio é obrigatória';
  }
  
  // Validar o formato do horário antes de salvar
  validateRaffleTime();
  
  const validationResult = validateForm(editedData.value);
  
  if (validationResult.isValid) {
    // Log para depuração dos valores que serão salvos
    console.log('[RaffleEditor] Dados que serão salvos:', JSON.stringify({
      date: editedData.value.raffleDate,
      time: editedData.value.raffleTime
    }));
    
    modalMessage.value = 'Deseja salvar as alterações realizadas no sorteio?';
    isValid.value = true;
    showModal.value = true;
  } else {
    modalMessage.value = validationResult.message || 'Verifique os dados do formulário';
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

// Lidar com atualização de imagem - Usando o composable
const handleImageChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (!file) return;
  
  const base64Image = await processImage(file);
  if (base64Image) {
    editedData.value.imageUrl = base64Image;
  }
};

// Remover imagem - Corrigido para usar string vazia em vez de null
const removeImage = () => {
  editedData.value.imageUrl = '';
};

// Formatar preço para BRL
const formatPriceToBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

// Formatar número com separadores de milhar
const formatNumberWithSeparators = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
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

// Lidar com entrada de quantidade de números
const handleAvailableNumbersInput = (event: Event) => {
  // Obter apenas dígitos da entrada
  const input = (event.target as HTMLInputElement).value.replace(/\D/g, '');
  
  // Converter para número
  let numericValue = input ? parseInt(input) : 0;
  
  // Limitar o valor ao máximo permitido
  if (numericValue > MAX_AVAILABLE_NUMBERS) {
    numericValue = MAX_AVAILABLE_NUMBERS;
    // Atualizar o campo com valor formatado limitado
    setTimeout(() => {
      availableNumbersInput.value = formatNumberWithSeparators(MAX_AVAILABLE_NUMBERS);
    }, 0);
  }
  
  // Garantir o valor mínimo
  if (numericValue < MIN_AVAILABLE_NUMBERS) {
    numericValue = MIN_AVAILABLE_NUMBERS;
  }
  
  // Armazenar o valor numérico real
  editedData.value.availableNumbers = numericValue;
  
  // Formatar para exibição com separadores de milhar
  availableNumbersInput.value = formatNumberWithSeparators(numericValue);
};

// Formatar preço ao perder o foco
const formatPrice = () => {
  priceInput.value = formatPriceToBRL(editedData.value.price);
};

// Formatar número ao perder o foco
const formatAvailableNumbers = () => {
  if (!editedData.value.availableNumbers || editedData.value.availableNumbers < MIN_AVAILABLE_NUMBERS) {
    editedData.value.availableNumbers = MIN_AVAILABLE_NUMBERS;
  }
  availableNumbersInput.value = formatNumberWithSeparators(editedData.value.availableNumbers);
};

// Função para selecionar um valor pré-definido
const selectPriceValue = (value: number) => {
  // Atualizar o valor numérico real
  editedData.value.price = value;
  
  // Formatar para exibição
  priceInput.value = formatPriceToBRL(value);
};

// Função para selecionar um valor pré-definido de números
const selectNumbersValue = (value: number) => {
  // Atualizar o valor numérico real
  editedData.value.availableNumbers = value;
  
  // Formatar para exibição
  availableNumbersInput.value = formatNumberWithSeparators(value);
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

// Nova função para lidar com mudanças no horário
const handleTimeChange = (newTime: string | Date | null) => {
  if (newTime) {
    // Se for um objeto Date, extrair apenas a parte de horas e minutos
    if (newTime instanceof Date) {
      const hours = String(newTime.getHours()).padStart(2, '0');
      const minutes = String(newTime.getMinutes()).padStart(2, '0');
      editedData.value.raffleTime = `${hours}:${minutes}`;
      console.log(`[RaffleEditor] Horário definido a partir de Date: ${editedData.value.raffleTime}`);
    } else if (typeof newTime === 'string') {
      // Validar e padronizar o formato da string de hora
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
      if (timeRegex.test(newTime)) {
        // Extrair apenas horas e minutos, ignorando segundos
        const [hours, minutes] = newTime.split(':').map(Number);
        // Garantir formato HH:MM sempre
        editedData.value.raffleTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        console.log(`[RaffleEditor] Horário definido a partir de string: ${editedData.value.raffleTime}`);
      } else {
        console.warn(`[RaffleEditor] Formato de hora inválido: ${newTime}, usando 12:00 como padrão`);
        editedData.value.raffleTime = '12:00';
      }
    }
  } else {
    editedData.value.raffleTime = null;
    console.log('[RaffleEditor] Horário removido/limpo');
  }
};

// Observar mudanças no checkbox de horário específico
watch(enableSpecificTime, (newValue) => {
  if (!newValue) {
    // Se o checkbox for desmarcado, limpar o horário
    editedData.value.raffleTime = null;
    console.log('[RaffleEditor] Checkbox desmarcado, horário removido');
  } else if (!editedData.value.raffleTime) {
    // Se o checkbox for marcado e não houver horário definido, definir um horário padrão (12:00)
    editedData.value.raffleTime = '12:00';
    console.log('[RaffleEditor] Checkbox marcado, horário padrão definido: 12:00');
  }
});

// Função para validar o tempo antes de salvar
const validateRaffleTime = (): boolean => {
  if (!enableSpecificTime.value) {
    // Se não estiver habilitado, não precisa validar
    editedData.value.raffleTime = null;
    return true;
  }
  
  if (!editedData.value.raffleTime) {
    // Se horário estiver habilitado mas estiver vazio, usar padrão
    editedData.value.raffleTime = '12:00';
    console.log('[RaffleEditor] Horário não definido, usando padrão: 12:00');
    return true;
  }
  
  // Verificar se o raffleTime é um objeto e convertê-lo para string no formato HH:MM
  if (typeof editedData.value.raffleTime === 'object') {
    try {
      // Verificar se é um objeto Date usando método seguro para TypeScript
      const timeValue = editedData.value.raffleTime as unknown;
      
      if (timeValue instanceof Date) {
        const hours = String(timeValue.getHours()).padStart(2, '0');
        const minutes = String(timeValue.getMinutes()).padStart(2, '0');
        editedData.value.raffleTime = `${hours}:${minutes}`;
        console.log(`[RaffleEditor] Convertido objeto Date para string: ${editedData.value.raffleTime}`);
      } 
      // Se for outro tipo de objeto (como retornado pelo DatePicker)
      else {
        // Usar uma abordagem segura para TypeScript para acessar propriedades potenciais
        const timeObj = timeValue as Record<string, any>;
        
        // Extrair horas e minutos, dependendo da estrutura do objeto
        let hours: number, minutes: number;
        
        if (typeof timeObj.getHours === 'function') {
          // Usa API tipo Date
          hours = timeObj.getHours();
          minutes = timeObj.getMinutes();
        } else {
          // Usa propriedades diretas
          hours = timeObj.hours || 0;
          minutes = timeObj.minutes || 0;
        }
        
        // Formatar como string HH:MM
        editedData.value.raffleTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        console.log(`[RaffleEditor] Convertido objeto genérico para string: ${editedData.value.raffleTime}`);
      }
    } catch (error) {
      console.error('[RaffleEditor] Erro ao converter objeto de horário:', error);
      editedData.value.raffleTime = '12:00';
    }
  }
  
  // Agora que garantimos que é uma string, validar o formato HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (typeof editedData.value.raffleTime !== 'string' || !timeRegex.test(editedData.value.raffleTime)) {
    console.error(`[RaffleEditor] Formato de horário inválido: ${editedData.value.raffleTime}, corrigindo para 12:00`);
    // Corrigir para o formato padrão
    editedData.value.raffleTime = '12:00';
  }
  
  return true;
};

onMounted(() => {
  if (editedData.value.price) {
    priceInput.value = formatPriceToBRL(editedData.value.price);
  }
  
  // Inicializar o campo de números disponíveis
  if (editedData.value.availableNumbers) {
    availableNumbersInput.value = formatNumberWithSeparators(editedData.value.availableNumbers);
  } else {
    // Valor padrão se não estiver definido
    editedData.value.availableNumbers = 1000;
    availableNumbersInput.value = formatNumberWithSeparators(1000);
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
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
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
            :class="{ 'error-date': dateError, 'datepicker-custom': true }"
            input-class-name="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
            @update:model-value="handleDateChange"
            placeholder="Selecione uma data"
            auto-apply
            model-type="yyyy-MM-dd"
            required
          />
          
          <!-- Checkbox para habilitar horário específico -->
          <div class="mt-2 flex items-center">
            <input 
              id="enable-specific-time" 
              v-model="enableSpecificTime" 
              type="checkbox" 
              class="form-checkbox h-4 w-4 text-primary border-gray-300 rounded"
            />
            <label for="enable-specific-time" class="ml-2 block text-sm text-gray-700">
              Adicionar horário específico para o sorteio
            </label>
          </div>
          
          <!-- Seletor de hora (visível apenas quando o checkbox está marcado) -->
          <div v-if="enableSpecificTime" class="mt-3">
            <label class="block text-sm font-medium text-gray-700 mb-1" for="raffle-time-input">
              Horário do Sorteio
            </label>
            <VueDatePicker 
              uid="raffle-time-input"
              id="time"
              v-model="editedData.raffleTime"
              time-picker
              :enable-seconds="false"
              :only-time="true"
              :format="'HH:mm'"
              :locale-config="datepickerLocale"
              class="datepicker-custom"
              input-class-name="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
              @update:model-value="handleTimeChange"
              placeholder="Selecione o horário"
              auto-apply
            />
          </div>
          
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
              class="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
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
      
      <!-- Quantidade de números disponíveis -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="availableNumbers">
          Quantidade de Números Disponíveis
        </label>
        
        <div class="flex flex-col md:flex-row md:items-center gap-2">
          <!-- Input com largura total em mobile e reduzida em desktop -->
          <div class="relative w-full md:w-1/3 md:min-w-[144px] mb-2 md:mb-0">
            <input 
              id="availableNumbers"
              v-model="availableNumbersInput"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
              @input="handleAvailableNumbersInput"
              @blur="formatAvailableNumbers"
              placeholder="1000"
            />
          </div>
          
          <!-- Container para botões de valores pré-definidos com grid responsivo -->
          <div class="w-full md:flex-1 grid grid-cols-3 md:grid-cols-6 gap-2">
            <button
              v-for="option in numbersOptions"
              :key="option"
              type="button"
              @click="selectNumbersValue(option)"
              :class="[
                'h-10 rounded-md px-3 text-sm flex items-center justify-center transition-colors',
                editedData.availableNumbers === option 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              ]"
            >
              {{ formatNumberWithSeparators(option) }}
            </button>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Defina quantos números estarão disponíveis para compra neste sorteio (máximo: {{ formatNumberWithSeparators(MAX_AVAILABLE_NUMBERS) }}).
        </p>
      </div>
      
      <!-- Visibilidade do sorteio -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Visibilidade do Sorteio
        </label>
        <select
          v-model="editedData.visibility"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary h-[42px]"
          :disabled="visibilityLocked"
        >
          <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        
        <!-- Mensagem de visibilidade bloqueada -->
        <p v-if="visibilityLocked" class="text-xs text-orange-600 mt-1">
          {{ visibilityLockedMessage }}
        </p>
        <p v-else class="text-xs text-gray-500 mt-1">
          Defina quem pode ver este sorteio no sistema
        </p>
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
/* Estilos específicos para o datepicker para garantir altura correta e alinhamento vertical */
.datepicker-custom :deep(.dp__input) {
  height: 42px !important;
  display: flex !important;
  align-items: center !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.datepicker-custom :deep(.dp__input_wrap) {
  margin-bottom: 0 !important;
}

.datepicker-custom :deep(.dp__pointer) {
  height: 42px !important;
}

.error-date :deep(input) {
  border-color: #e3342f !important;
  background-color: #fff5f5 !important;
}

.error-date :deep(.dp__input_wrap) {
  box-shadow: 0 0 0 1px #e3342f;
  border-radius: 0.375rem;
}
</style>
