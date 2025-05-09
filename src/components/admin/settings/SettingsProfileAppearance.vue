<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useUserSettingsStore } from '../../../stores/userSettingsStore';
import tinycolor from 'tinycolor2';

const props = defineProps<{
  userId: string;
}>();

const userSettingsStore = useUserSettingsStore();
const primaryColorPicker = ref<HTMLInputElement | null>(null);
const secondaryColorPicker = ref<HTMLInputElement | null>(null);

// Computed properties para temas
const theme = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.appearance.theme || 'light';
  },
  set: (value: 'light' | 'dark' | 'system') => {
    userSettingsStore.updateUserSettings(props.userId, {
      appearance: {
        ...userSettingsStore.userSettings[props.userId]?.appearance,
        theme: value
      }
    });
  }
});

// Computed properties para tamanho de fonte
const fontSize = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.appearance.fontSize || 'medium';
  },
  set: (value: 'small' | 'medium' | 'large') => {
    userSettingsStore.updateUserSettings(props.userId, {
      appearance: {
        ...userSettingsStore.userSettings[props.userId]?.appearance,
        fontSize: value
      }
    });
  }
});

// Computed properties para modo compacto
const compactMode = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.appearance.compactMode || false;
  },
  set: (value: boolean) => {
    userSettingsStore.updateUserSettings(props.userId, {
      appearance: {
        ...userSettingsStore.userSettings[props.userId]?.appearance,
        compactMode: value
      }
    });
  }
});

// Layout preferido
const preferredLayout = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.appearance.layout || 'cards';
  },
  set: (value: 'cards' | 'list' | 'compact') => {
    userSettingsStore.updateUserSettings(props.userId, {
      appearance: {
        ...userSettingsStore.userSettings[props.userId]?.appearance,
        layout: value
      }
    });
  }
});

// Cor primária
const primaryColor = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.appearance.primaryColor || '#FF8C00';
  },
  set: (value: string) => {
    // Validar se é uma cor válida
    if (tinycolor(value).isValid()) {
      userSettingsStore.updateUserSettings(props.userId, {
        appearance: {
          ...userSettingsStore.userSettings[props.userId]?.appearance,
          primaryColor: value
        }
      });
    }
  }
});

// Cor secundária
const secondaryColor = computed({
  get: () => {
    const settings = userSettingsStore.userSettings[props.userId];
    return settings?.appearance.secondaryColor || '#FFC125';
  },
  set: (value: string) => {
    // Validar se é uma cor válida
    if (tinycolor(value).isValid()) {
      userSettingsStore.updateUserSettings(props.userId, {
        appearance: {
          ...userSettingsStore.userSettings[props.userId]?.appearance,
          secondaryColor: value
        }
      });
    }
  }
});

// Gerar cor escura baseada na cor primária
const primaryDarkColor = computed(() => {
  return tinycolor(primaryColor.value).darken(15).toString();
});

// Aplicar as cores do tema ao documento para visualização em tempo real
const applyThemeColors = () => {
  document.documentElement.style.setProperty('--color-primary', primaryColor.value);
  document.documentElement.style.setProperty('--color-primary-dark', primaryDarkColor.value);
  document.documentElement.style.setProperty('--color-secondary', secondaryColor.value);
};

// Aplicar cores ao montar o componente
onMounted(() => {
  applyThemeColors();
});
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <h3 class="text-lg font-medium text-primary mb-4">Aparência</h3>
    
    <!-- Tema -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Tema</h4>
      <div class="flex flex-wrap gap-3">
        <label 
          v-for="option in ['light', 'dark', 'system']" 
          :key="option"
          class="flex items-center"
        >
          <input 
            type="radio" 
            :value="option" 
            v-model="theme" 
            class="form-checkbox mr-2"
          />
          <span class="text-gray-700">{{ 
            option === 'light' ? 'Claro' : 
            option === 'dark' ? 'Escuro' : 'Sistema' 
          }}</span>
        </label>
      </div>
    </div>
    
    <!-- Cores -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Cores do Tema</h4>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-gray-600 mb-1">Cor Primária</label>
          <div class="flex items-center">
            <input 
              type="color" 
              v-model="primaryColor" 
              class="w-10 h-10 mr-2 border border-gray-300 rounded cursor-pointer"
              @change="applyThemeColors"
              ref="primaryColorPicker"
            />
            <input 
              type="text" 
              v-model="primaryColor" 
              class="form-input flex-1" 
              maxlength="7"
              @change="applyThemeColors"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm text-gray-600 mb-1">Cor Secundária</label>
          <div class="flex items-center">
            <input 
              type="color" 
              v-model="secondaryColor" 
              class="w-10 h-10 mr-2 border border-gray-300 rounded cursor-pointer"
              @change="applyThemeColors"
              ref="secondaryColorPicker"
            />
            <input 
              type="text" 
              v-model="secondaryColor" 
              class="form-input flex-1" 
              maxlength="7"
              @change="applyThemeColors"
            />
          </div>
        </div>
      </div>
      
      <!-- Previsualização de cores -->
      <div class="mt-4 border border-gray-200 p-3 rounded-md">
        <h5 class="text-sm font-medium mb-2">Previsualização</h5>
        <div class="flex gap-2">
          <div class="p-3 rounded flex-1 text-center text-white" :style="{ backgroundColor: primaryColor }">
            Cor Primária
          </div>
          <div class="p-3 rounded flex-1 text-center text-gray-800" :style="{ backgroundColor: secondaryColor }">
            Cor Secundária
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="p-2 rounded flex-1 text-center text-white" :style="{ backgroundColor: primaryColor }">
            Botão Primário
          </button>
          <button class="p-2 rounded flex-1 text-center text-gray-800 hover:text-white transition-colors" 
                 :style="{ backgroundColor: secondaryColor, borderColor: primaryDarkColor }">
            Botão Secundário
          </button>
        </div>
      </div>
    </div>
    
    <!-- Layout preferido -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Layout Preferido</h4>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label class="border rounded-md p-3 cursor-pointer" :class="preferredLayout === 'cards' ? 'border-primary bg-primary/5' : 'border-gray-200'">
          <div class="flex items-center justify-between mb-2">
            <input type="radio" value="cards" v-model="preferredLayout" class="form-radio" />
            <span class="font-medium">Cards</span>
          </div>
          <div class="h-16 bg-gray-100 rounded flex items-center justify-center">
            <div class="w-8 h-8 bg-gray-300 rounded m-1"></div>
            <div class="w-8 h-8 bg-gray-300 rounded m-1"></div>
          </div>
        </label>
        
        <label class="border rounded-md p-3 cursor-pointer" :class="preferredLayout === 'list' ? 'border-primary bg-primary/5' : 'border-gray-200'">
          <div class="flex items-center justify-between mb-2">
            <input type="radio" value="list" v-model="preferredLayout" class="form-radio" />
            <span class="font-medium">Lista</span>
          </div>
          <div class="h-16 bg-gray-100 rounded flex flex-col justify-center p-1">
            <div class="h-4 bg-gray-300 rounded-sm my-1"></div>
            <div class="h-4 bg-gray-300 rounded-sm my-1"></div>
          </div>
        </label>
        
        <label class="border rounded-md p-3 cursor-pointer" :class="preferredLayout === 'compact' ? 'border-primary bg-primary/5' : 'border-gray-200'">
          <div class="flex items-center justify-between mb-2">
            <input type="radio" value="compact" v-model="preferredLayout" class="form-radio" />
            <span class="font-medium">Compacto</span>
          </div>
          <div class="h-16 bg-gray-100 rounded flex flex-col justify-center p-1">
            <div class="h-2 bg-gray-300 rounded-sm my-0.5"></div>
            <div class="h-2 bg-gray-300 rounded-sm my-0.5"></div>
            <div class="h-2 bg-gray-300 rounded-sm my-0.5"></div>
          </div>
        </label>
      </div>
    </div>
    
    <!-- Tamanho da fonte -->
    <div class="mb-6">
      <h4 class="font-medium text-gray-700 mb-2">Tamanho da Fonte</h4>
      <div class="flex flex-wrap gap-3">
        <label 
          v-for="option in ['small', 'medium', 'large']" 
          :key="option"
          class="flex items-center"
        >
          <input 
            type="radio" 
            :value="option" 
            v-model="fontSize" 
            class="form-checkbox mr-2"
          />
          <span class="text-gray-700" :class="{
            'text-sm': option === 'small',
            'text-base': option === 'medium',
            'text-lg': option === 'large',
          }">{{ 
            option === 'small' ? 'Pequena' : 
            option === 'medium' ? 'Média' : 'Grande' 
          }}</span>
        </label>
      </div>
    </div>
    
    <!-- Modo compacto -->
    <div>
      <label class="flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          v-model="compactMode" 
          class="form-checkbox mr-2"
        />
        <span class="text-gray-700">Modo Compacto <span class="text-xs text-gray-500">(reduz o espaçamento na interface)</span></span>
      </label>
    </div>
  </div>
</template>
