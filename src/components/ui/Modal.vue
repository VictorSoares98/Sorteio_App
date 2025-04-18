<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref, computed } from 'vue';
import { onKeyStroke } from '@vueuse/core';

/**
 * Componente Modal base reutilizável
 * Fornece estrutura, overlay e funcionalidades básicas de um modal
 */
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg', 'xl', 'full'].includes(value)
  },
  closeOnClickOutside: {
    type: Boolean,
    default: true
  },
  closeOnEsc: {
    type: Boolean,
    default: true
  },
  persistent: {
    type: Boolean,
    default: false
  },
  hideCloseButton: {
    type: Boolean,
    default: false
  },
  hideFooter: {
    type: Boolean,
    default: false
  },
  forceShowCloseButton: {
    type: Boolean,
    default: false
  },
  position: {
    type: String,
    default: 'center',
    validator: (value: string) => ['center', 'top', 'right', 'bottom', 'left'].includes(value)
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value: string) => ['default', 'danger', 'success', 'warning', 'info'].includes(value)
  },
  noAnimation: {
    type: Boolean,
    default: false
  },
  maxHeight: {
    type: String,
    default: ''
  },
  scrollable: {
    type: Boolean,
    default: true
  },
  preventBodyScroll: {
    type: Boolean,
    default: true
  },
  contentClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'confirm', 'opened', 'closed']);

// Referências DOM
const modalContent = ref<HTMLElement | null>(null);
const initialFocusElement = ref<HTMLElement | null>(null);

// Estado interno
const isVisible = ref(false);
const prevBodyPaddingRight = ref('');
const prevBodyOverflow = ref('');

// Processar tamanho do modal baseado na prop
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'max-w-md';
    case 'md': return 'max-w-lg';
    case 'lg': return 'max-w-2xl';
    case 'xl': return 'max-w-4xl';
    case 'full': return 'max-w-full m-4';
    default: return 'max-w-lg';
  }
});

// Processar posição do modal
const positionClasses = computed(() => {
  switch (props.position) {
    case 'top': return 'items-start mt-16';
    case 'right': return 'items-center justify-end mr-16';
    case 'bottom': return 'items-end mb-16';
    case 'left': return 'items-center justify-start ml-16';
    default: return 'items-center justify-center';
  }
});

// Header classes baseado na variante
const headerClasses = computed(() => {
  switch (props.variant) {
    case 'danger': return 'bg-red-50 border-red-100 text-red-700';
    case 'success': return 'bg-green-50 border-green-100 text-green-700';
    case 'warning': return 'bg-yellow-50 border-yellow-100 text-yellow-700';
    case 'info': return 'bg-blue-50 border-blue-100 text-blue-700';
    default: return 'bg-white border-gray-200 text-gray-800';
  }
});

// Fechar o modal
const closeModal = () => {
  // Permitir fechamento se forceShowCloseButton for true, mesmo com persistent
  if (props.persistent && !props.forceShowCloseButton) return;
  emit('close');
};

// Confirmar ação no modal
const confirmModal = () => {
  emit('confirm');
};

// Fechar ao clicar fora
const handleClickOutside = (event: MouseEvent) => {
  if (!props.closeOnClickOutside || props.persistent) return;
  
  // Fechar somente se o clique foi diretamente no overlay
  if (event.target === event.currentTarget) {
    closeModal();
  }
};

// Gerenciar focus trap
const trapFocus = (event: KeyboardEvent) => {
  if (!isVisible.value || !modalContent.value) return;
  
  // Obter todos os elementos focáveis dentro do modal
  const focusableElements = modalContent.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  // Se o shift + tab pressioando e estamos no primeiro elemento, mover para o último
  if (event.shiftKey && document.activeElement === firstElement) {
    lastElement.focus();
    event.preventDefault();
  } 
  // Se tab pressionado e estamos no último elemento, mover para o primeiro
  else if (!event.shiftKey && document.activeElement === lastElement) {
    firstElement.focus();
    event.preventDefault();
  }
};

// Desabilitar scroll do corpo quando o modal está aberto
const disableBodyScroll = () => {
  if (!props.preventBodyScroll) return;
  
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  prevBodyPaddingRight.value = document.body.style.paddingRight;
  prevBodyOverflow.value = document.body.style.overflow;
  
  document.body.style.paddingRight = `${scrollbarWidth}px`;
  document.body.style.overflow = 'hidden';
};

// Reabilitar scroll do corpo quando o modal é fechado
const enableBodyScroll = () => {
  if (!props.preventBodyScroll) return;
  
  document.body.style.paddingRight = prevBodyPaddingRight.value;
  document.body.style.overflow = prevBodyOverflow.value;
};

// Quando o modal está visível, setar o foco no primeiro elemento focável
const focusFirstElement = () => {
  if (!modalContent.value) return;
  
  // Se temos um elemento inicial de foco definido, usá-lo
  if (initialFocusElement.value) {
    initialFocusElement.value.focus();
    return;
  }
  
  // Caso contrário, focar no primeiro elemento focável
  const focusableElements = modalContent.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  if (focusableElements.length > 0) {
    (focusableElements[0] as HTMLElement).focus();
  }
};

// Anexar listeners de teclado
onKeyStroke('Escape', (e) => {
  if (props.closeOnEsc && props.show && !props.persistent) {
    closeModal();
    e.preventDefault();
  }
});

// Observar mudanças na prop 'show'
watch(() => props.show, (newVal) => {
  isVisible.value = newVal;
  
  if (newVal) {
    disableBodyScroll();
    // Esperar pela transição antes de focar
    setTimeout(() => {
      focusFirstElement();
      emit('opened');
    }, 100);
  } else {
    enableBodyScroll();
    setTimeout(() => {
      emit('closed');
    }, 300); // esperar pela transição completar
  }
});

// Ao montar, ativar o modal se estiver visível
onMounted(() => {
  if (props.show) {
    isVisible.value = true;
    disableBodyScroll();
    setTimeout(focusFirstElement, 100);
  }
  
  // Adicionar o keydown no documento para o focus trap
  document.addEventListener('keydown', trapFocus);
});

// Remover event listeners e restaurar scroll ao desmontar
onBeforeUnmount(() => {
  enableBodyScroll();
  document.removeEventListener('keydown', trapFocus);
});
</script>

<template>
  <teleport to="body">
    <transition 
      name="modal" 
      :duration="noAnimation ? 0 : 300"
      @after-enter="emit('opened')"
      @after-leave="emit('closed')"
    >
      <div v-if="show" 
           class="fixed inset-0 flex z-50 overflow-y-auto modal-container" 
           :class="positionClasses"
           @click="handleClickOutside"
      >
        <!-- Overlay -->
        <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
        
        <!-- Modal Container -->
        <div 
          ref="modalContent"
          class="bg-white rounded-lg shadow-xl relative mx-auto my-auto transition-all transform modal-content"
          :class="[sizeClasses, { 'scale-95 opacity-0': !isVisible, 'scale-100 opacity-100': isVisible }]"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" 
               class="px-6 py-4 flex justify-between items-center border-b" 
               :class="headerClasses"
          >
            <slot name="header">
              <h3 class="text-lg font-medium">{{ title }}</h3>
            </slot>
            
            <!-- Botão fechar (versão melhorada 3D) -->
            <button 
              v-if="(!hideCloseButton && !persistent) || forceShowCloseButton" 
              @click="closeModal" 
              class="ml-auto text-gray-400 hover:text-gray-600 focus:outline-none transition-transform hover:scale-110"
              aria-label="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-6 w-6" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
                  style="filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.3));" />
              </svg>
            </button>
          </div>
          
          <!-- Conteúdo com opção de scroll -->
          <div class="px-6 py-4" 
               :class="[
                 contentClass,
                 { 'overflow-y-auto': scrollable },
                 maxHeight ? `max-h-${maxHeight}` : ''
               ]"
          >
            <slot></slot>
          </div>
          
          <!-- Footer / Botões -->
          <div v-if="!hideFooter || $slots.footer" class="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3 rounded-b-lg">
            <slot name="footer">
              <button 
                @click="closeModal" 
                class="bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-4 rounded transition-colors"
              >
                <slot name="cancel-text">Cancelar</slot>
              </button>
              <button 
                @click="confirmModal"
                class="bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded transition-colors"
              >
                <slot name="confirm-text">Confirmar</slot>
              </button>
            </slot>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
/* Animações de entrada/saída */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .bg-white,
.modal-enter-from .modal-content {
  transform: scale(0.95);
}

.modal-leave-to .bg-white,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

/* Garantir que o modal seja visível em todas as condições */
.modal-container {
  display: flex;
  z-index: 50; 
}
</style>
