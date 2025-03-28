<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { UserRole } from '../../types/user';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';
import RoleEditModal from '../modals/RoleEditModal.vue';
import { formatDate } from '../../utils/formatters';

// Store
const userStore = useUserStore();

// Estado local
const selectedUserId = ref<string | null>(null);
const selectedRole = ref<UserRole | undefined>(undefined); // Modificado para UserRole | undefined
const showRoleModal = ref(false);
const actionSuccess = ref(false);
const actionError = ref<string | null>(null);

// Mapear nomes das funções para exibição
const roleNames = {
  [UserRole.USER]: 'Membro',
  [UserRole.TESOUREIRO]: 'Tesoureiro',
  [UserRole.SECRETARIA]: 'Secretaria',
  [UserRole.ADMIN]: 'Administrador'
};

// Opções de filtro para o select
const roleOptions = [
  { value: '', label: 'Todos' },
  { value: UserRole.USER, label: 'Membro' },
  { value: UserRole.TESOUREIRO, label: 'Tesoureiros' },
  { value: UserRole.SECRETARIA, label: 'Secretaria' },
  { value: UserRole.ADMIN, label: 'Administradores' }
];

// Cores para os badges de função
const roleBadgeColors = {
  [UserRole.USER]: 'bg-gray-200 text-gray-800',
  [UserRole.TESOUREIRO]: 'bg-blue-200 text-blue-800',
  [UserRole.SECRETARIA]: 'bg-green-200 text-green-800',
  [UserRole.ADMIN]: 'bg-purple-200 text-purple-800'
};

// Carregar usuários ao montar o componente
onMounted(() => {
  fetchUsers();
});

// Buscar usuários
const fetchUsers = async () => {
  await userStore.fetchAllUsers();
};

// Abrir modal para alterar papel
const openRoleModal = (userId: string, currentRole: UserRole) => {
  selectedUserId.value = userId;
  selectedRole.value = currentRole; // Aqui atribuímos o valor correto (UserRole)
  showRoleModal.value = true;
};

// Fechar modal
const closeRoleModal = () => {
  showRoleModal.value = false;
  selectedUserId.value = null;
};

// Atualizar papel do usuário
const updateUserRole = async (userId: string, newRole: UserRole) => {
  try {
    // Verificar se o usuário tem afiliados
    const user = await userStore.fetchUserById(userId);
    if (!user) {
      actionError.value = 'Usuário não encontrado.';
      setTimeout(() => {
        actionError.value = null;
      }, 3000);
      closeRoleModal();
      return;
    }
    
    const hasAffiliates = user.affiliates && user.affiliates.length > 0;
    const hasValidAffiliation = !!user.affiliatedToId;
    
    // Regras de negócio para papéis administrativos:
    // 1. Usuários com afiliados podem ter papéis administrativos
    // 2. Usuários afiliados a outros usuários também podem ter papéis administrativos
    const canHaveAdminRole = hasAffiliates || hasValidAffiliation;
    
    if (!canHaveAdminRole && 
        (newRole === UserRole.ADMIN || 
         newRole === UserRole.SECRETARIA || 
         newRole === UserRole.TESOUREIRO)) {
      actionError.value = 'Apenas usuários com afiliados ou com afiliação válida podem ter papéis administrativos.';
      setTimeout(() => {
        actionError.value = null;
      }, 3000);
      closeRoleModal();
      return;
    }
    
    const success = await userStore.updateUserRole(userId, newRole);
    
    if (success) {
      actionSuccess.value = true;
      setTimeout(() => {
        actionSuccess.value = false;
      }, 3000);
    }
    
    closeRoleModal();
  } catch (error: any) {
    actionError.value = error.message || 'Erro ao atualizar função do usuário.';
    setTimeout(() => {
      actionError.value = null;
    }, 3000);
  }
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Gerenciamento de Usuários</h2>
      <button 
        @click="fetchUsers"
        class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded transition-colors"
      >
        Atualizar
      </button>
    </div>
    
    <!-- Alerts -->
    <Alert 
      v-if="actionSuccess" 
      type="success" 
      message="Função do usuário atualizada com sucesso!" 
      dismissible 
      autoClose
    />
    
    <Alert 
      v-if="actionError" 
      type="error" 
      message="Erro ao atualizar função do usuário." 
      dismissible
    />
    
    <!-- Filters -->
    <div class="mb-6 flex flex-col sm:flex-row gap-4">
      <div class="flex-grow">
        <input 
          v-model="userStore.searchQuery" 
          type="text" 
          placeholder="Buscar por nome ou email..." 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        />
      </div>
      
      <div class="w-full sm:w-48">
        <select 
          v-model="userStore.roleFilter" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
        >
          <option v-for="option in roleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- Users List -->
    <Card class="overflow-hidden">
      <div v-if="userStore.loading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p class="mt-2">Carregando usuários...</p>
      </div>
      
      <div v-else-if="userStore.error" class="text-center py-6 text-danger">
        <p>{{ userStore.error }}</p>
        <button 
          @click="fetchUsers" 
          class="mt-2 bg-primary text-white px-4 py-2 rounded"
        >
          Tentar novamente
        </button>
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Função
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Criado em
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in userStore.filteredUsers" :key="user.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ user.displayName }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">
                  {{ user.email }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
                    roleBadgeColors[user.role] || 'bg-gray-100 text-gray-800'
                  ]"
                >
                  {{ roleNames[user.role] || 'Usuário' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  @click="openRoleModal(user.id, user.role)"
                  class="text-primary hover:text-blue-800"
                >
                  Editar Função
                </button>
              </td>
            </tr>
            
            <tr v-if="userStore.filteredUsers.length === 0">
              <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                Nenhum usuário encontrado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
    
    <!-- Role Edit Modal -->
    <RoleEditModal
      :show="showRoleModal"
      :userId="selectedUserId || undefined"
      :initialRole="selectedRole"
      :roleNames="roleNames"
      @close="closeRoleModal"
      @confirm="updateUserRole"
    />
  </div>
</template>
