<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { UserRole } from '../../types/user';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';
import RoleEditModal from '../modals/RoleEditModal.vue';
import UserNoteModal from '../modals/UserNoteModal.vue';
import UserHierarchyView from './UserHierarchyView.vue';
import UserBlockModal from '../modals/UserBlockModal.vue';
import { formatDate } from '../../utils/formatters';

// Store
const userStore = useUserStore();

// Estado local
const selectedUserId = ref<string | null>(null);
const selectedRole = ref<UserRole | undefined>(undefined);
const showRoleModal = ref(false);
const actionSuccess = ref(false);
const actionError = ref<string | null>(null);
const showNoteModal = ref(false);
const showBlockModal = ref(false);
const showHierarchyView = ref(false);
const dateStart = ref<string>('');
const dateEnd = ref<string>('');
const activeFilter = ref<string>('all');
const hierarchyFilter = ref<string>('all');
const showAdvancedFilters = ref(false);
const exportLoading = ref(false);

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

// Opções para filtro de status de atividade
const activeOptions = [
  { value: 'all', label: 'Todos os usuários' },
  { value: 'active', label: 'Usuários ativos' },
  { value: 'blocked', label: 'Usuários bloqueados' },
  { value: 'affiliated', label: 'Com afiliação' },
  { value: 'unaffiliated', label: 'Sem afiliação' }
];

// Cores para os badges de função
const roleBadgeColors = {
  [UserRole.USER]: 'bg-gray-200 text-gray-800',
  [UserRole.TESOUREIRO]: 'bg-blue-200 text-blue-800',
  [UserRole.SECRETARIA]: 'bg-green-200 text-green-800',
  [UserRole.ADMIN]: 'bg-purple-200 text-purple-800'
};

// Filtros avançados computados
const filteredUsers = computed(() => {
  let users = [...userStore.filteredUsers];
  
  // Pré-processar datas de início e fim
  const start = dateStart.value ? new Date(dateStart.value) : null;
  const end = dateEnd.value ? new Date(dateEnd.value) : null;
  if (end) end.setHours(23, 59, 59, 999); // Fim do dia
  
  // Filtrar por data de registro
  if (start) {
    users = users.filter(user => {
      const createdAt = user.createdAt instanceof Date ? user.createdAt : 
        (user.createdAt && (typeof user.createdAt === 'string' || typeof user.createdAt === 'number')) 
        ? new Date(user.createdAt) 
        : new Date();
      return createdAt >= start;
    });
  }
  
  if (end) {
    users = users.filter(user => {
      const createdAt = user.createdAt instanceof Date ? user.createdAt : 
        (user.createdAt && (typeof user.createdAt === 'string' || typeof user.createdAt === 'number')) 
        ? new Date(user.createdAt) 
        : new Date();
      return createdAt <= end;
    });
  }
  
  // Filtrar por status de atividade
  switch (activeFilter.value) {
    case 'active':
      users = users.filter(user => !user.isBlocked);
      break;
    case 'blocked':
      users = users.filter(user => user.isBlocked);
      break;
    case 'affiliated':
      users = users.filter(user => user.affiliatedToId);
      break;
    case 'unaffiliated':
      users = users.filter(user => !user.affiliatedToId);
      break;
    // 'all' não filtra
  }
  
  // Filtrar por hierarquia de afiliação
  if (hierarchyFilter.value !== 'all') {
    users = users.filter(user => user.affiliatedToId === hierarchyFilter.value);
  }
  
  return users;
});

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
  selectedRole.value = currentRole;
  showRoleModal.value = true;
};

// Abrir modal para adicionar/editar notas
const openNoteModal = (userId: string) => {
  selectedUserId.value = userId;
  showNoteModal.value = true;
};

// Abrir modal para bloquear/desbloquear usuário
const openBlockModal = (userId: string) => {
  selectedUserId.value = userId;
  showBlockModal.value = true;
};

// Fechar modais
const closeRoleModal = () => {
  showRoleModal.value = false;
  selectedUserId.value = null;
};

const closeNoteModal = () => {
  showNoteModal.value = false;
  selectedUserId.value = null;
};

const closeBlockModal = () => {
  showBlockModal.value = false;
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

// Salvar nota para usuário
const saveUserNote = async (userId: string, note: string) => {
  try {
    await userStore.saveUserNote(userId, note);
    actionSuccess.value = true;
    setTimeout(() => {
      actionSuccess.value = false;
    }, 3000);
    closeNoteModal();
  } catch (error: any) {
    actionError.value = error.message || 'Erro ao salvar nota do usuário.';
    setTimeout(() => {
      actionError.value = null;
    }, 3000);
  }
};

// Bloquear/Desbloquear usuário
const toggleUserBlock = async (userId: string, isBlocked: boolean, blockReason?: string, blockDuration?: number) => {
  try {
    await userStore.toggleUserBlock(userId, isBlocked, blockReason, blockDuration);
    actionSuccess.value = true;
    setTimeout(() => {
      actionSuccess.value = false;
    }, 3000);
    closeBlockModal();
    fetchUsers(); // Recarregar a lista após alterar o status
  } catch (error: any) {
    actionError.value = error.message || 'Erro ao alterar status do usuário.';
    setTimeout(() => {
      actionError.value = null;
    }, 3000);
  }
};

// Exportar dados
const exportUsers = async (format: 'csv' | 'excel') => {
  if (exportLoading.value) return;
  
  try {
    exportLoading.value = true;
    const users = filteredUsers.value;
    
    // Definir campos a serem exportados
    const fields = [
      { label: 'Nome', key: 'displayName' },
      { label: 'Email', key: 'email' },
      { label: 'Função', key: 'role' },
      { label: 'Data de Cadastro', key: 'createdAt' },
      { label: 'Status', key: 'status' }
    ];
    
    // Preparar dados para exportação
    const data = users.map(user => ({
      displayName: user.displayName || '',
      email: user.email || '',
      role: roleNames[user.role] || 'Usuário',
      createdAt: user.createdAt ? formatDate(user.createdAt) : '',
      status: user.isBlocked ? 'Bloqueado' : 'Ativo'
    }));
    
    // Exportar como CSV ou Excel via userStore
    if (format === 'csv') {
      await userStore.exportUsersToCSV(data, fields);
    } else {
      await userStore.exportUsersToExcel(data, fields);
    }
    
    actionSuccess.value = true;
    setTimeout(() => {
      actionSuccess.value = false;
    }, 3000);
  } catch (error: any) {
    actionError.value = error.message || 'Erro ao exportar usuários.';
    setTimeout(() => {
      actionError.value = null;
    }, 3000);
  } finally {
    exportLoading.value = false;
  }
};

// Alternar exibição dos filtros avançados
const toggleAdvancedFilters = () => {
  showAdvancedFilters.value = !showAdvancedFilters.value;
};

// Limpar filtros avançados
const clearAdvancedFilters = () => {
  dateStart.value = '';
  dateEnd.value = '';
  activeFilter.value = 'all';
  hierarchyFilter.value = 'all';
};

// Ver hierarquia de afiliações
const viewHierarchy = () => {
  showHierarchyView.value = true;
};

// Fechar visualização de hierarquia
const closeHierarchyView = () => {
  showHierarchyView.value = false;
};

// Verificar se um usuário tem notas
const hasNotes = (userId: string) => {
  return userStore.userNotes && userStore.userNotes[userId];
};

// Verificar se um usuário está bloqueado
const isUserBlocked = (user: any) => {
  return user.isBlocked === true;
};

</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-2xl font-bold">Gerenciamento de Usuários</h2>
      <div class="flex gap-2">
        <button 
          @click="fetchUsers"
          class="bg-primary hover:bg-primary-dark text-white px-3 py-1 rounded transition-colors text-sm"
        >
          <span class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </span>
        </button>
        <button 
          @click="viewHierarchy"
          class="bg-secondary hover:bg-secondary-dark text-gray-800 px-3 py-1 rounded transition-colors text-sm"
        >
          <span class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Visualizar Hierarquia
          </span>
        </button>
      </div>
    </div>
    
    <!-- Alerts -->
    <Alert 
      v-if="actionSuccess" 
      type="success" 
      message="Operação realizada com sucesso!" 
      dismissible 
      autoClose
    />
    
    <Alert 
      v-if="actionError" 
      type="error" 
      :message="actionError" 
      dismissible
    />
    
    <!-- Basic Filters -->
    <div class="mb-4 flex flex-col sm:flex-row gap-4">
      <div class="flex-grow">
        <input 
          v-model="userStore.searchQuery" 
          type="text" 
          placeholder="Buscar por nome, email ou congregação..." 
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
      
      <button 
        @click="toggleAdvancedFilters"
        class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded transition-colors flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {{ showAdvancedFilters ? 'Ocultar Filtros' : 'Filtros Avançados' }}
      </button>
    </div>
    
    <!-- Advanced Filters -->
    <div v-if="showAdvancedFilters" class="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
      <h3 class="text-sm font-medium text-gray-700 mb-3">Filtros Avançados</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Filtro por Data de Registro -->
        <div>
          <label class="block text-xs text-gray-600 mb-1">Data de Registro (De)</label>
          <input 
            v-model="dateStart" 
            type="date" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
        
        <div>
          <label class="block text-xs text-gray-600 mb-1">Data de Registro (Até)</label>
          <input 
            v-model="dateEnd" 
            type="date" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
        
        <!-- Filtro por Status de Atividade -->
        <div>
          <label class="block text-xs text-gray-600 mb-1">Status de Atividade</label>
          <select 
            v-model="activeFilter" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
          >
            <option v-for="option in activeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="mt-4 flex justify-between">
        <!-- Exportar Dados -->
        <div>
          <label class="block text-xs text-gray-600 mb-1">Exportar Dados</label>
          <div class="flex gap-2">
            <button 
              @click="exportUsers('csv')" 
              :disabled="exportLoading"
              class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              <span v-if="exportLoading">Exportando...</span>
              <span v-else class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </span>
            </button>
            
            <button 
              @click="exportUsers('excel')" 
              :disabled="exportLoading"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
            >
              <span v-if="exportLoading">Exportando...</span>
              <span v-else class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </span>
            </button>
          </div>
        </div>
        
        <!-- Limpar Filtros -->
        <button 
          @click="clearAdvancedFilters"
          class="self-end bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm"
        >
          Limpar Filtros
        </button>
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
                Status
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
            <tr v-for="user in filteredUsers" :key="user.id" :class="{ 'bg-red-50': isUserBlocked(user) }">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div class="text-sm font-medium text-gray-900 flex items-center">
                    {{ user.displayName }}
                    <!-- Indicador de notas -->
                    <span v-if="hasNotes(user.id)" class="ml-2 text-yellow-500" title="Este usuário tem notas administrativas">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </span>
                  </div>
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
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    'px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full',
                    user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  ]"
                >
                  {{ user.isBlocked ? 'Bloqueado' : 'Ativo' }}
                </span>
                <div v-if="user.blockReason" class="text-xs text-red-500 mt-1">
                  {{ user.blockReason }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.createdAt ? formatDate(user.createdAt) : 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex justify-end space-x-2">
                  <button 
                    @click="openRoleModal(user.id, user.role)"
                    class="text-primary hover:text-primary-dark"
                    title="Editar função"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button 
                    @click="openNoteModal(user.id)"
                    class="text-yellow-500 hover:text-yellow-700"
                    title="Adicionar/editar notas"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    @click="openBlockModal(user.id)"
                    :class="[
                      user.isBlocked ? 'text-green-500 hover:text-green-700' : 'text-red-500 hover:text-red-700'
                    ]"
                    :title="user.isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'"
                  >
                    <svg v-if="user.isBlocked" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-3V7a3 3 0 00-6 0v3m12 0a2 2 0 012 2v3a2 2 0 01-2 2H7a2 2 0 01-2-2v-3a2 2 0 012-2h9z" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            
            <tr v-if="filteredUsers.length === 0">
              <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                Nenhum usuário encontrado
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
    
    <!-- Modals -->
    <RoleEditModal
      :show="showRoleModal"
      :userId="selectedUserId || undefined"
      :initialRole="selectedRole"
      :roleNames="roleNames"
      @close="closeRoleModal"
      @confirm="updateUserRole"
    />
    
    <UserNoteModal
      :show="showNoteModal"
      :userId="selectedUserId || undefined"
      @close="closeNoteModal"
      @save="saveUserNote"
    />
    
    <UserBlockModal
      :show="showBlockModal"
      :userId="selectedUserId || undefined"
      @close="closeBlockModal"
      @toggle-block="toggleUserBlock"
    />
    
    <UserHierarchyView
      :show="showHierarchyView"
      @close="closeHierarchyView"
    />
  </div>
</template>
