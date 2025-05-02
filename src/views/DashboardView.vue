<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types/user';

const router = useRouter();
const authStore = useAuthStore();

// Verificar se é admin
const isAdmin = computed(() => {
  return authStore.currentUser?.role === UserRole.ADMIN ||
         authStore.currentUser?.role === UserRole.SECRETARIA ||
         authStore.currentUser?.role === UserRole.TESOUREIRO;
});

// Verificar se o usuário está afiliado a alguém
const isAffiliated = computed(() => {
  return !!authStore.currentUser?.affiliatedTo;
});

// Verificar se o usuário pode acessar o dashboard
const canAccessDashboard = computed(() => {
  return isAdmin.value || !isAffiliated.value;
});

// Redirecionar usuários sem permissão
onMounted(() => {
  if (!canAccessDashboard.value) {
    router.replace('/sorteio');
  }
});
</script>

<template>
  <div>
    <!-- Conteúdo do Dashboard -->
  </div>
</template>