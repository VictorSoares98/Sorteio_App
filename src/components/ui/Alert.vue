<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { PropType } from 'vue';

// Definir o tipo para os tipos de alerta permitidos
type AlertType = 'info' | 'success' | 'warning' | 'error';

const props = defineProps({
  type: {
    type: String as PropType<AlertType>,
    default: 'info',
    validator: (value: string) => ['info', 'success', 'warning', 'error'].includes(value)
  },
  message: {
    type: String,
    required: true
  },
  dismissible: {
    type: Boolean,
    default: false
  },
  autoClose: {
    type: Boolean,
    default: false
  },
  duration: {
    type: Number,
    default: 5000
  }
});

const visible = ref(true);
const emit = defineEmits(['close']);

// Usar Record para tipar corretamente os objetos de classes
const typeClasses: Record<AlertType, string> = {
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  error: 'bg-red-50 text-red-700 border-red-200'
};

const iconClasses: Record<AlertType, string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400'
};

// Determinar as classes do ícone com base no tipo
const alertClasses = computed(() => typeClasses[props.type]);
const alertIconClasses = computed(() => iconClasses[props.type]);

// Ícones SVG para cada tipo de alerta
const icons = {
  info: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`,
  success: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>`
};

// Função para fechar o alerta
const closeAlert = () => {
  visible.value = false;
  emit('close');
};

// Configurar fechamento automático se habilitado
onMounted(() => {
  if (props.autoClose) {
    setTimeout(() => {
      closeAlert();
    }, props.duration);
  }
});
</script>

<template>
  <transition
    name="alert-fade"
    @after-leave="$emit('close')"
  >
    <div v-if="visible" :class="[
      'flex items-start p-4 mb-4 border rounded-lg transition-all',
      alertClasses
    ]">
      <!-- Ícone do alerta -->
      <div class="flex-shrink-0 mr-3" :class="alertIconClasses" v-html="icons[type]"></div>
      
      <!-- Conteúdo do alerta -->
      <div class="flex-grow">
        <slot>
          <p>{{ message }}</p>
        </slot>
      </div>
      
      <!-- Botão para fechar (se dismissible) -->
      <button
        v-if="dismissible"
        @click="closeAlert"
        class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-500 focus:outline-none"
        aria-label="Fechar"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </transition>
</template>

<style scoped>
.alert-fade-enter-active,
.alert-fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.alert-fade-enter-from,
.alert-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
