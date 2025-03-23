<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';

const router = useRouter();
const authStore = useAuthStore();
const isOpen = ref(false);

const isAdmin = computed(() => authStore.isAdmin);

const toggleSidebar = () => {
  isOpen.value = !isOpen.value;
};

const closeSidebar = () => {
  isOpen.value = false;
};

const navigateTo = (path: string) => {
  router.push(path);
  closeSidebar();
};
</script>

<template>
  <div>
    <!-- Toggle Button -->
    <button
      @click="toggleSidebar"
      class="fixed z-20 top-4 left-4 bg-primary text-white rounded-full p-2 shadow-md md:hidden"
      aria-label="Abrir menu"
    >
      <svg v-if="!isOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
      <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
    
    <!-- Overlay -->
    <div 
      v-show="isOpen" 
      @click="closeSidebar"
      class="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity"
    ></div>
    
    <!-- Sidebar -->
    <div
      :class="[
        'fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform z-40',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'md:translate-x-0 md:static md:h-auto'
      ]"
    >
      <!-- Sidebar Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-xl font-bold text-primary">UMADRIMC</h2>
        <button @click="closeSidebar" class="md:hidden text-gray-600 hover:text-gray-800">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- Navigation Links -->
      <nav class="px-4 py-2">
        <ul class="space-y-2">
          <li>
            <button
              @click="navigateTo('/')"
              class="flex items-center w-full px-2 py-2 text-gray-800 hover:bg-gray-100 hover:text-primary rounded"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
              </svg>
              Início
            </button>
          </li>
          <li>
            <button
              @click="navigateTo('/profile')"
              class="flex items-center w-full px-2 py-2 text-gray-800 hover:bg-gray-100 hover:text-primary rounded"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              Meu Perfil
            </button>
          </li>
          
          <template v-if="isAdmin">
            <li class="border-t my-2 pt-2">
              <button
                @click="navigateTo('/admin')"
                class="flex items-center w-full px-2 py-2 text-gray-800 hover:bg-gray-100 hover:text-primary rounded"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Administração
              </button>
            </li>
          </template>
        </ul>
      </nav>
    </div>
  </div>
</template>
