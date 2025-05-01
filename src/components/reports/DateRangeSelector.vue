<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { formatDate } from '../../utils/formatters';

const props = defineProps({
  defaultRange: {
    type: String,
    default: 'month'
  }
});

const emit = defineEmits(['update:dateRange']);

// Data references
const startDate = ref<Date>(new Date());
const endDate = ref<Date>(new Date());
const selectedRangeType = ref(props.defaultRange);

// Períodos predefinidos
const predefinedRanges = [
  { value: 'week', label: 'Última Semana' },
  { value: 'month', label: 'Mês Atual' },
  { value: 'quarter', label: 'Último Trimestre' },
  { value: 'year', label: 'Ano Atual' },
  { value: 'custom', label: 'Personalizado' }
];

// Configuração do datepicker
const datepickerOptions = {
  enableTimePicker: false,
  autoApply: true,
  locale: 'pt-BR',
  format: (date: Date) => formatDate(date)
};

// Gerar chave para cache com base no intervalo de datas
const cacheKey = computed(() => {
  const start = startDate.value.toISOString().split('T')[0];
  const end = endDate.value.toISOString().split('T')[0];
  return `report_${start}_to_${end}`;
});

// Aplicar intervalo de data com base no tipo selecionado
const applyDateRange = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  
  switch (selectedRangeType.value) {
    case 'week':
      // Última semana
      start.setDate(today.getDate() - 7);
      break;
    case 'month':
      // Mês atual
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'quarter':
      // Último trimestre (3 meses)
      start.setMonth(today.getMonth() - 3);
      break;
    case 'year':
      // Ano atual
      start = new Date(today.getFullYear(), 0, 1);
      break;
    case 'custom':
      // Já está usando as datas selecionadas pelo usuário
      return;
  }
  
  startDate.value = start;
  endDate.value = today;
  
  // Emitir evento com a data formatada
  emitDateRange();
};

// Método para emitir o evento de atualização de intervalo
const emitDateRange = () => {
  emit('update:dateRange', {
    startDate: startDate.value,
    endDate: endDate.value,
    cacheKey: cacheKey.value
  });
};

// Observer para aplicar mudanças quando o tipo de intervalo mudar
watch(() => selectedRangeType.value, () => {
  if (selectedRangeType.value !== 'custom') {
    applyDateRange();
  }
});

// Observer para quando as datas mudarem manualmente
watch([() => startDate.value, () => endDate.value], () => {
  if (selectedRangeType.value === 'custom') {
    emitDateRange();
  }
});

// Inicialização
onMounted(() => {
  applyDateRange();
});
</script>

<template>
  <div class="date-range-selector bg-white p-4 rounded-lg shadow-md border border-gray-200">
    <h3 class="text-sm font-medium text-gray-700 mb-3">Selecione o Período</h3>
    
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
      <!-- Botões de período predefinido -->
      <button 
        v-for="range in predefinedRanges" 
        :key="range.value"
        @click="selectedRangeType = range.value"
        :class="[
          'px-3 py-2 rounded-md text-sm font-medium transition-colors',
          selectedRangeType === range.value
            ? 'bg-primary text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        ]"
      >
        {{ range.label }}
      </button>
    </div>
    
    <!-- Seleção de datas personalizada -->
    <div v-if="selectedRangeType === 'custom'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs text-gray-600 mb-1">Data Inicial</label>
        <Datepicker 
          v-model="startDate"
          :enable-time-picker="datepickerOptions.enableTimePicker"
          :format="datepickerOptions.format"
          placeholder="Selecione uma data"
          :auto-apply="datepickerOptions.autoApply"
          :locale="datepickerOptions.locale"
          input-class-name="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        />
      </div>
      
      <div>
        <label class="block text-xs text-gray-600 mb-1">Data Final</label>
        <Datepicker 
          v-model="endDate"
          :enable-time-picker="datepickerOptions.enableTimePicker"
          :format="datepickerOptions.format"
          placeholder="Selecione uma data"
          :auto-apply="datepickerOptions.autoApply"
          :locale="datepickerOptions.locale"
          input-class-name="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        />
      </div>
    </div>
    
    <!-- Resumo das datas selecionadas -->
    <div v-else class="text-sm text-gray-600 mt-2">
      <span class="font-medium">Período selecionado:</span> 
      {{ formatDate(startDate) }} até {{ formatDate(endDate) }}
    </div>
  </div>
</template>
