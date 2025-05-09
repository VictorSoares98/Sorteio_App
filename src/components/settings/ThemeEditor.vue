<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Pickr from '@simonwep/pickr';
import '@simonwep/pickr/dist/themes/classic.min.css';
import tinycolor from 'tinycolor2';

const props = defineProps<{
  modelValue: {
    primaryColor: string;
    secondaryColor: string;
  }
}>();

const emit = defineEmits(['update:modelValue']);

const primaryPickrEl = ref<HTMLElement | null>(null);
const secondaryPickrEl = ref<HTMLElement | null>(null);
let primaryPickr: Pickr;
let secondaryPickr: Pickr;
// Estado local para cores com validação
const primaryColor = ref(props.modelValue.primaryColor);
const secondaryColor = ref(props.modelValue.secondaryColor);
const colorError = ref('');

// Gerar cores relacionadas com base na cor primária
const generateColorPalette = (color: string) => {
  const tc = tinycolor(color);
  
  return {
    base: tc.toHexString(),
    dark: tc.darken(10).toHexString(),
    light: tc.lighten(10).toHexString(),
    contrast: tc.isLight() ? '#333333' : '#FFFFFF'
  };
};

// Validar cor hexadecimal
const validateColor = (color: string): boolean => {
  return tinycolor(color).isValid();
};

// Aplicar cores ao atualizar
watch([primaryColor, secondaryColor], ([newPrimary, newSecondary]) => {
  if (!validateColor(newPrimary) || !validateColor(newSecondary)) {
    colorError.value = 'Cor inválida. Use formato hexadecimal (#RRGGBB).';
    return;
  }
  
  colorError.value = '';
  emit('update:modelValue', { 
    primaryColor: newPrimary, 
    secondaryColor: newSecondary 
  });
});

// Inicializar color pickers
onMounted(() => {
  // Configuração comum para ambos os pickers
  const pickrConfig = {
    theme: 'classic' as const,
    swatches: [
      '#FF8C00', '#FFC125', '#1976D2', '#4CAF50',
      '#9C27B0', '#F44336', '#607D8B', '#E91E63'
    ],
    components: {
      preview: true,
      opacity: true,
      hue: true,
      interaction: {
        hex: true,
        rgba: true,
        input: true,
        save: true,
        clear: true,
      }
    }
  };
  
  // Inicializar picker para cor primária
  if (primaryPickrEl.value) {
    primaryPickr = Pickr.create({
      ...pickrConfig,
      el: primaryPickrEl.value,
      default: props.modelValue.primaryColor
    });
    
    primaryPickr.on('save', (color: any) => {
      const hex = color.toHEXA().toString();
      primaryColor.value = hex;
    });
  }
  
  // Inicializar picker para cor secundária
  if (secondaryPickrEl.value) {
    secondaryPickr = Pickr.create({
      ...pickrConfig,
      el: secondaryPickrEl.value,
      default: props.modelValue.secondaryColor
    });
    
    secondaryPickr.on('save', (color: any) => {
      const hex = color.toHEXA().toString();
      secondaryColor.value = hex;
    });
  }
});
</script>

<template>
  <div class="theme-editor">
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4">Personalizar Tema</h2>
      
      <!-- Mensagem de erro -->
      <div v-if="colorError" class="text-red-600 mb-4 p-2 bg-red-50 rounded">
        {{ colorError }}
      </div>
      
      <!-- Color Pickers -->
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="block mb-2 font-medium">Cor Primária</label>
          <div class="flex items-center">
            <div ref="primaryPickrEl"></div>
            <input
              v-model="primaryColor"
              type="text"
              class="ml-2 p-2 border rounded"
              placeholder="#RRGGBB"
              maxlength="7"
            />
          </div>
        </div>
        
        <div>
          <label class="block mb-2 font-medium">Cor Secundária</label>
          <div class="flex items-center">
            <div ref="secondaryPickrEl"></div>
            <input
              v-model="secondaryColor"
              type="text"
              class="ml-2 p-2 border rounded"
              placeholder="#RRGGBB"
              maxlength="7"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Prévia das cores -->
    <div class="mb-6">
      <h3 class="text-md font-medium mb-2">Prévia do Tema</h3>
      <div class="grid grid-cols-2 gap-4">
        <!-- Prévia Primária -->
        <div>
          <div class="p-3 rounded" :style="{backgroundColor: primaryColor, color: generateColorPalette(primaryColor).contrast}">
            Cor Primária
          </div>
          <div class="flex mt-1 gap-1">
            <div class="p-2 rounded flex-1" :style="{backgroundColor: generateColorPalette(primaryColor).dark}"></div>
            <div class="p-2 rounded flex-1" :style="{backgroundColor: generateColorPalette(primaryColor).light}"></div>
          </div>
        </div>
        
        <!-- Prévia Secundária -->
        <div>
          <div class="p-3 rounded" :style="{backgroundColor: secondaryColor, color: generateColorPalette(secondaryColor).contrast}">
            Cor Secundária
          </div>
          <div class="flex mt-1 gap-1">
            <div class="p-2 rounded flex-1" :style="{backgroundColor: generateColorPalette(secondaryColor).dark}"></div>
            <div class="p-2 rounded flex-1" :style="{backgroundColor: generateColorPalette(secondaryColor).light}"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Botões de exemplo -->
    <div class="mb-6">
      <h3 class="text-md font-medium mb-2">Exemplos de Componentes</h3>
      <div class="flex gap-2 mb-2">
        <button class="px-4 py-2 rounded" :style="{backgroundColor: primaryColor, color: generateColorPalette(primaryColor).contrast}">
          Botão Primário
        </button>
        <button class="px-4 py-2 rounded" :style="{backgroundColor: secondaryColor, color: generateColorPalette(secondaryColor).contrast}">
          Botão Secundário
        </button>
      </div>
      <div :style="{borderColor: primaryColor}" class="border-l-4 pl-3 py-2">
        Exemplo de borda com cor primária
      </div>
    </div>
  </div>
</template>
