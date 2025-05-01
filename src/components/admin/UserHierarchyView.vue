<script setup lang="ts">
import { ref, watch } from 'vue';
import { useUserStore } from '../../stores/userStore';
import { UserRole } from '../../types/user';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const userStore = useUserStore();
const loading = ref(false);
const hierarchyData = ref<any[]>([]);
const expandedNodes = ref<Set<string>>(new Set());

// Carregar dados de hierarquia quando o modal for aberto
watch(() => props.show, async (newVal) => {
  if (newVal) {
    loading.value = true;
    try {
      await loadHierarchyData();
    } catch (error) {
      console.error('Erro ao carregar dados de hierarquia:', error);
    } finally {
      loading.value = false;
    }
  }
});

// Carregar dados de hierarquia
const loadHierarchyData = async () => {
  // Buscar todos os usuários se ainda não tiver feito
  if (userStore.users.length === 0) {
    await userStore.fetchAllUsers();
  }
  
  // Construir a hierarquia
  hierarchyData.value = buildHierarchy(userStore.users);
};

// Construir a estrutura de hierarquia
const buildHierarchy = (users: any[]) => {
  // Encontrar usuários de nível superior (sem afiliação)
  const topLevelUsers = users.filter(user => !user.affiliatedToId);
  
  // Criar estrutura hierárquica
  return topLevelUsers.map(user => {
    return {
      ...user,
      children: findChildren(user.id, users)
    };
  });
};

// Encontrar filhos de um usuário
const findChildren = (userId: string, users: any[]): any[] => {
  const children = users.filter(user => user.affiliatedToId === userId);
  
  return children.map(child => {
    return {
      ...child,
      children: findChildren(child.id, users)
    };
  });
};

// Alternar expansão de um nó
const toggleNode = (nodeId: string) => {
  if (expandedNodes.value.has(nodeId)) {
    expandedNodes.value.delete(nodeId);
  } else {
    expandedNodes.value.add(nodeId);
  }
};

// Verificar se um nó está expandido
const isNodeExpanded = (nodeId: string) => {
  return expandedNodes.value.has(nodeId);
};

// Obter a cor do badge de papel
const getRoleBadgeColor = (role: UserRole) => {
  switch(role) {
    case UserRole.ADMIN:
      return 'bg-purple-200 text-purple-800';
    case UserRole.SECRETARIA:
      return 'bg-green-200 text-green-800';
    case UserRole.TESOUREIRO:
      return 'bg-blue-200 text-blue-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
};

// Fechar o modal
const closeModal = () => {
  emit('close');
};

// Expandir todos os nós
const expandAll = () => {
  hierarchyData.value.forEach(user => {
    expandAllNodes(user);
  });
};

// Colapsar todos os nós
const collapseAll = () => {
  expandedNodes.value.clear();
};

// Função recursiva para expandir todos os nós
const expandAllNodes = (node: any) => {
  if (node.id) {
    expandedNodes.value.add(node.id);
  }
  if (node.children && node.children.length > 0) {
    node.children.forEach((child: any) => {
      expandAllNodes(child);
    });
  }
};
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b flex justify-between items-center">
        <h3 class="text-lg font-medium text-gray-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Visualização de Hierarquia
        </h3>
        <div class="flex space-x-2">
          <button 
            @click="expandAll"
            class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
          >
            Expandir Tudo
          </button>
          <button 
            @click="collapseAll"
            class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded"
          >
            Colapsar Tudo
          </button>
          <button
            @click="closeModal"
            class="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Content -->
      <div class="p-4 flex-grow overflow-auto">
        <div v-if="loading" class="flex justify-center items-center h-20">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
        
        <div v-else-if="hierarchyData.length === 0" class="text-center py-10">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-gray-600">Nenhum dado de hierarquia disponível</p>
        </div>
        
        <div v-else class="hierarchy-tree">
          <template v-for="node in hierarchyData" :key="`root-${node.id || 'anonymous'}`">
            <div class="hierarchy-node">
              <!-- Nó raiz -->
              <div class="flex items-center p-2 hover:bg-gray-50 border-l-4 border-primary rounded">
                <button 
                  v-if="node.children && node.children.length > 0"
                  @click="toggleNode(node.id)"
                  class="mr-1.5 h-5 w-5 flex items-center justify-center"
                >
                  <svg v-if="isNodeExpanded(node.id)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <span v-else class="mr-1.5 h-5 w-5"></span>
                
                <div class="flex items-center">
                  <div class="font-medium">{{ node.displayName || node.email }}</div>
                  <span 
                    :class="[
                      'ml-2 px-2 py-0.5 text-xs rounded-full',
                      getRoleBadgeColor(node.role)
                    ]"
                  >
                    {{ node.role === UserRole.ADMIN ? 'Admin' : 
                       node.role === UserRole.SECRETARIA ? 'Secretário' :
                       node.role === UserRole.TESOUREIRO ? 'Tesoureiro' : 'Membro' }}
                  </span>
                  
                  <!-- Contador de afiliados -->
                  <span v-if="node.children && node.children.length > 0" class="ml-2 text-xs text-gray-500">
                    ({{ node.children.length }} afiliados)
                  </span>
                </div>
              </div>
              
              <!-- Nós filhos (recursivos) -->
              <div v-if="node.children && node.children.length > 0 && isNodeExpanded(node.id)"
                   class="pl-6 border-l border-gray-200 mt-1"
              >
                <template v-for="child in node.children" :key="`child-${child.id || 'anonymous'}`">
                  <div class="hierarchy-node mt-1">
                    <!-- Nó filho -->
                    <div class="flex items-center p-2 hover:bg-gray-50 border-l-4 border-gray-300 rounded">
                      <button 
                        v-if="child.children && child.children.length > 0"
                        @click="toggleNode(child.id)"
                        class="mr-1.5 h-5 w-5 flex items-center justify-center"
                      >
                        <svg v-if="isNodeExpanded(child.id)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <span v-else class="mr-1.5 h-5 w-5"></span>
                      
                      <div class="flex items-center">
                        <div class="font-medium">{{ child.displayName || child.email }}</div>
                        <span 
                          :class="[
                            'ml-2 px-2 py-0.5 text-xs rounded-full',
                            getRoleBadgeColor(child.role)
                          ]"
                        >
                          {{ child.role === UserRole.ADMIN ? 'Admin' : 
                             child.role === UserRole.SECRETARIA ? 'Secretário' :
                             child.role === UserRole.TESOUREIRO ? 'Tesoureiro' : 'Membro' }}
                        </span>
                        
                        <!-- Contador de afiliados -->
                        <span v-if="child.children && child.children.length > 0" class="ml-2 text-xs text-gray-500">
                          ({{ child.children.length }} afiliados)
                        </span>
                      </div>
                    </div>
                    
                    <!-- Renderização recursiva para os filhos dos filhos -->
                    <div
                      v-if="child.children && child.children.length > 0 && isNodeExpanded(child.id)"
                      class="pl-6 border-l border-gray-200 mt-1"
                    >
                      <!-- Component recursivo para níveis mais profundos -->
                      <template v-for="grandchild in child.children" :key="`grandchild-${grandchild.id || 'anonymous'}`">
                        <div class="hierarchy-node mt-1">
                          <!-- Estrutura similar para o neto -->
                          <div class="flex items-center p-2 hover:bg-gray-50 border-l-4 border-gray-200 rounded">
                            <button 
                              v-if="grandchild.children && grandchild.children.length > 0"
                              @click="toggleNode(grandchild.id)"
                              class="mr-1.5 h-5 w-5 flex items-center justify-center"
                            >
                              <svg v-if="isNodeExpanded(grandchild.id)" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            <span v-else class="mr-1.5 h-5 w-5"></span>
                            
                            <div class="flex items-center">
                              <div class="font-medium">{{ grandchild.displayName || grandchild.email }}</div>
                              <span 
                                :class="[
                                  'ml-2 px-2 py-0.5 text-xs rounded-full',
                                  getRoleBadgeColor(grandchild.role)
                                ]"
                              >
                                {{ grandchild.role === UserRole.ADMIN ? 'Admin' : 
                                   grandchild.role === UserRole.SECRETARIA ? 'Secretário' :
                                   grandchild.role === UserRole.TESOUREIRO ? 'Tesoureiro' : 'Membro' }}
                              </span>
                            </div>
                          </div>
                          
                          <!-- Renderização adicional se necessário -->
                          <div 
                            v-if="grandchild.children && grandchild.children.length > 0 && isNodeExpanded(grandchild.id)" 
                            class="pl-6 border-l border-gray-200 mt-1"
                          >
                            <div v-for="ggchild in grandchild.children" :key="`ggc-${ggchild.id || 'anonymous'}`" class="p-2 hover:bg-gray-50 rounded">
                              <div class="font-medium">{{ ggchild.displayName || ggchild.email }}</div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hierarchy-tree {
  font-size: 0.875rem;
}

.hierarchy-node {
  margin-bottom: 0.5rem;
}

/* Estilos para linhas de conexão na árvore */
.hierarchy-node .hierarchy-node {
  position: relative;
}

.hierarchy-node .hierarchy-node::before {
  content: '';
  position: absolute;
  left: -1rem;
  top: 1rem;
  width: 0.75rem;
  height: 1px;
  background-color: #d1d5db;
}

/* Ajuste para o último item de cada nível */
.hierarchy-node .hierarchy-node:last-child::after {
  content: '';
  position: absolute;
  left: -1rem;
  top: 0;
  height: 1rem;
  width: 1px;
  background-color: white;
}
</style>
