<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import Card from '../ui/Card.vue';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types/user';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase';

const authStore = useAuthStore();
const rankingUsers = ref<any[]>([]);
const isLoading = ref(true);
const unsubscribe = ref<(() => void) | null>(null);

// Melhorado para garantir que todos os cenários são tratados corretamente
const affiliatorInfo = computed(() => {
  const currentUser = authStore.currentUser;
  
  if (!currentUser) {
    return { name: '', email: '', congregation: '', photoURL: '' };
  }
  
  // Se temos informações detalhadas do afiliador, usamos elas
  if (currentUser.affiliatedToInfo) {
    return {
      name: currentUser.affiliatedToInfo.displayName,
      email: currentUser.affiliatedToInfo.email,
      congregation: currentUser.affiliatedToInfo.congregation || '',
      photoURL: currentUser.affiliatedToInfo.photoURL || ''
      // Removida a propriedade providerData que não existe no tipo
    };
  }
  
  // Caso contrário, usamos os campos básicos
  return {
    name: currentUser.affiliatedTo || '',
    email: currentUser.affiliatedToEmail || '',
    congregation: '',
    photoURL: ''
  };
});

// Computadas para identificar o tipo de usuário
const isAdmin = computed(() => {
  return authStore.currentUser?.role === UserRole.ADMIN;
});

const isAdministrativeRole = computed(() => {
  return authStore.currentUser?.role === UserRole.TESOUREIRO || 
         authStore.currentUser?.role === UserRole.SECRETARIA;
});

const isRegularAffiliate = computed(() => {
  return !!authStore.currentUser?.affiliatedTo && 
         authStore.currentUser?.role === UserRole.USER;
});

// Verificar acesso ao ranking (afiliado OU administrativo)
const hasRankingAccess = computed(() => {
  const user = authStore.currentUser;
  if (!user) return false;
  
  // Verifica se possui afiliação
  const hasAffiliation = !!user.affiliatedTo;
  
  // Verifica se é administrador
  const isAdminRole = [UserRole.ADMIN, UserRole.TESOUREIRO, UserRole.SECRETARIA].includes(user.role);
  
  return hasAffiliation || isAdminRole;
});

// Verificar se o usuário tem acesso administrativo para ver todas as vendas
const hasAdminAccess = computed(() => {
  const user = authStore.currentUser;
  if (!user) return false;
  
  return [UserRole.ADMIN, UserRole.TESOUREIRO, UserRole.SECRETARIA].includes(user.role);
});

// Determinar se deve mostrar o número exato de vendas
const shouldShowExactSales = (user: any) => {
  // Sempre mostrar se tiver até 25 vendas
  if (user.totalSales <= 25) return true;
  
  // Acima de 25, mostrar apenas para administradores
  return hasAdminAccess.value;
};

// Melhorada para garantir URLs de avatar válidas e robustas
const getDefaultAvatar = (name: string) => {
  // Se o nome estiver vazio ou for inválido, use um valor padrão
  const displayName = (name || '').trim() || 'user';
  // Limitar a 50 caracteres para evitar URLs muito longas
  const seed = encodeURIComponent(displayName.substring(0, 50));
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=FF8C00`;
};

// Diretiva personalizada para tratar erros de carregamento de imagem
const vImgFallback = {
  mounted: (el: HTMLImageElement, binding: any) => {
    const fallbackSrc = binding.value;
    
    const handleError = () => {
      console.log("Imagem falhou ao carregar, usando fallback:", fallbackSrc);
      el.src = fallbackSrc;
      // Remover o listener para evitar loop infinito se a imagem de fallback também falhar
      el.removeEventListener('error', handleError);
    };
    
    el.addEventListener('error', handleError);
  }
};

// Função para obter avatar seguro (com melhor tratamento de erro)
const getSafeAvatar = (user: any) => {
  // Verificar se o usuário existe
  if (!user) return getDefaultAvatar('Usuário');
  
  // 1. Verificar se há photoURL direta no usuário
  if (user.photoURL && user.photoURL.trim() !== '') {
    return user.photoURL;
  }
  
  // 2. Verificar se o usuário tem providerData (informações de login com Google)
  if (user.providerData && Array.isArray(user.providerData) && user.providerData.length > 0) {
    // Procurar por um provedor Google
    const googleProvider = user.providerData.find((provider: any) => 
      provider.providerId === 'google.com' && provider.photoURL && provider.photoURL.trim() !== ''
    );
    
    if (googleProvider && googleProvider.photoURL) {
      console.log("Usando foto do Google para:", user.displayName || user.email);
      return googleProvider.photoURL;
    }
  }
  
  // 3. Se não encontrou nenhuma foto, retornar avatar padrão
  return getDefaultAvatar(user.displayName || 'Usuário');
};

// Função otimizada para buscar avatar do afiliador com melhor tratamento para fotos do Google
const getAffiliatorAvatar = () => {
  const currentUser = authStore.currentUser;
  if (!currentUser) return getDefaultAvatar('');
  
  // Se temos o objeto completo do afiliador
  if (currentUser.affiliatedToInfo) {
    // Verificar se há photoURL direta no usuário afiliador
    if (currentUser.affiliatedToInfo.photoURL && 
        currentUser.affiliatedToInfo.photoURL.trim() !== '') {
      return currentUser.affiliatedToInfo.photoURL;
    }
    
    // Como não temos acesso ao providerData do afiliador, usamos o nome para gerar avatar
    return getDefaultAvatar(currentUser.affiliatedToInfo.displayName);
  }
  
  // Se só temos o nome do afiliador, gerar avatar baseado no nome
  if (currentUser.affiliatedTo) {
    return getDefaultAvatar(currentUser.affiliatedTo);
  }
  
  // Fallback final
  return getDefaultAvatar('Afiliador');
};

// Função para exibir troféus ou medalhas conforme a posição e vendas
const getTrophyEmoji = (position: number, totalSales: number) => {
  if (totalSales <= 0) return position;
  if (position === 1) return '🏆';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return position;
};

// Definir interface para o usuário do ranking
interface RankingUser {
  id: string;
  displayName: string;
  photoURL?: string;
  email: string;
  role: UserRole;
  congregation?: string;
  totalSales: number;
  position: number;
}

// Formatar contagem de vendas conforme as regras
const formatSalesCount = (user: RankingUser) => {
  if (shouldShowExactSales(user)) {
    return `${user.totalSales} ${user.totalSales === 1 ? 'venda' : 'vendas'}`;
  }
  
  return '25+ vendas';
};

// Função corrigida para buscar dados de ranking sem causar loop infinito
const fetchRankingData = async () => {
  try {
    isLoading.value = true;
    
    // Obter todos os usuários primeiro
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const usersData: any[] = [];
    
    // Para cada usuário, processar seus dados
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      
      // Buscar pedidos do usuário para calcular total de vendas
      const totalSales = await processOrdersForUser(userDoc.id);
      
      // Adicionar usuário ao array com suas vendas calculadas
      // Incluindo providerData para acesso à foto do Google
      usersData.push({
        id: userDoc.id,
        displayName: userData.displayName || 'Usuário',
        photoURL: userData.photoURL,
        email: userData.email,
        role: userData.role,
        congregation: userData.congregation,
        totalSales: totalSales,
        providerData: userData.providerData  // Adicionado: incluir dados do provedor
      });
    }
    
    // Ordenar usuários por total de vendas (decrescente)
    usersData.sort((a, b) => b.totalSales - a.totalSales);
    
    // Adicionar posição no ranking
    usersData.forEach((user, index) => {
      user.position = index + 1;
    });
    
    rankingUsers.value = usersData;
    isLoading.value = false;
    
    // Configurar listener apenas para atualizações
    setupRealTimeUpdates();
  } catch (error) {
    console.error("Erro ao buscar dados de ranking:", error);
    isLoading.value = false;
  }
};

// Extraindo a lógica de processamento de pedidos para reutilização
const processOrdersForUser = async (userId: string): Promise<number> => {
  const ordersCollection = collection(db, 'orders');
  
  // Criar duas queries para buscar por sellerId ou originalSellerId
  const query1 = query(ordersCollection, where('sellerId', '==', userId));
  const query2 = query(ordersCollection, where('originalSellerId', '==', userId));
  
  const [snapshot1, snapshot2] = await Promise.all([getDocs(query1), getDocs(query2)]);
  
  // Mesclar os resultados das duas queries, evitando duplicatas
  const processedOrderIds = new Set<string>();
  let totalSales = 0;
  
  // Processar primeira query
  snapshot1.forEach(orderDoc => {
    if (processedOrderIds.has(orderDoc.id)) return;
    processedOrderIds.add(orderDoc.id);
    
    const orderData = orderDoc.data();
    // Filtrar pedidos válidos
    if (
      orderData.generatedNumbers && 
      Array.isArray(orderData.generatedNumbers) &&
      (!orderData.status || (orderData.status !== 'pending' && orderData.status !== 'cancelled'))
    ) {
      totalSales += orderData.generatedNumbers.length;
    }
  });
  
  // Processar segunda query
  snapshot2.forEach(orderDoc => {
    if (processedOrderIds.has(orderDoc.id)) return;
    processedOrderIds.add(orderDoc.id);
    
    const orderData = orderDoc.data();
    if (
      orderData.generatedNumbers && 
      Array.isArray(orderData.generatedNumbers) &&
      (!orderData.status || (orderData.status !== 'pending' && orderData.status !== 'cancelled'))
    ) {
      totalSales += orderData.generatedNumbers.length;
    }
  });
  
  return totalSales;
};

// Nova função para configurar atualizações em tempo real após a carga inicial
const setupRealTimeUpdates = () => {
  // Limpar qualquer listener anterior
  if (unsubscribe.value) {
    unsubscribe.value();
  }
  
  // Configurar listener para a coleção de orders para detectar novas vendas
  const ordersCollection = collection(db, 'orders');
  unsubscribe.value = onSnapshot(ordersCollection, () => {
    console.log("Detectada alteração em pedidos, atualizando ranking...");
    refreshRankingData();
  });
};

// Função otimizada para atualizar dados sem reconfigurar listeners
const refreshRankingData = async () => {
  try {
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    const usersData: any[] = [];
    
    // Para cada usuário, buscar suas vendas utilizando a função de utilidade
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const totalSales = await processOrdersForUser(userDoc.id);
      
      // Incluir providerData para que possamos acessar a foto do Google
      usersData.push({
        id: userDoc.id,
        displayName: userData.displayName || 'Usuário',
        photoURL: userData.photoURL,
        email: userData.email,
        role: userData.role,
        congregation: userData.congregation,
        totalSales: totalSales,
        providerData: userData.providerData  // Adicionado: incluir dados do provedor
      });
    }
    
    // Ordenar e atualizar posições
    usersData.sort((a, b) => b.totalSales - a.totalSales);
    usersData.forEach((user, index) => {
      user.position = index + 1;
    });
    
    rankingUsers.value = usersData;
  } catch (error) {
    console.error("Erro ao atualizar dados de ranking:", error);
  }
};

// Buscar dados quando o componente for montado
onMounted(() => {
  fetchRankingData();
});

// Limpar listener quando o componente for desmontado
onUnmounted(() => {
  if (unsubscribe.value) {
    unsubscribe.value();
  }
});
</script>

<template>
  <Card title="Ranking de Desempenho">
    <div class="p-2 md:p-6">
      <div class="text-center mb-3 md:mb-6">
        <h2 class="text-lg md:text-xl font-bold text-primary mb-2">Acompanhe seu Desempenho</h2>
        
        <!-- Para Afiliados Comuns -->
        <div v-if="isRegularAffiliate" class="bg-gray-50 p-2 md:p-3 rounded-lg mb-3">
          <div class="flex flex-col items-center mb-2 md:mb-3">
            <!-- Substituir pelo método melhorado para obter avatar do afiliador -->
            <img 
              :src="getAffiliatorAvatar()"
              v-img-fallback="getDefaultAvatar(affiliatorInfo.name)"
              alt="Avatar do afiliador"
              class="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-primary mb-2"
            >
            <p class="text-gray-700 font-medium text-sm md:text-base">Você está afiliado a:</p>
            <p class="text-primary font-bold text-sm md:text-base">{{ affiliatorInfo.name }}</p>
            <p v-if="affiliatorInfo.email" class="text-gray-600 text-xs md:text-sm">{{ affiliatorInfo.email }}</p>
            <p v-if="affiliatorInfo.congregation" class="text-gray-500 text-xs">{{ affiliatorInfo.congregation }}</p>
          </div>
          
          <p class="text-gray-600 text-xs md:text-sm mt-1 md:mt-2">
            Como afiliado, você pode acompanhar seu desempenho e comparar com outros vendedores.
          </p>
        </div>
        
        <!-- Para Tesoureiro e Secretaria -->
        <div v-else-if="isAdministrativeRole && authStore.currentUser?.affiliatedTo" class="bg-gray-50 p-2 md:p-3 rounded-lg mb-3">
          <div class="flex flex-col items-center mb-2 md:mb-3">
            <!-- Substituir pelo método melhorado para obter avatar do afiliador -->
            <img 
              :src="getAffiliatorAvatar()"
              v-img-fallback="getDefaultAvatar(affiliatorInfo.name)"
              alt="Avatar do afiliador"
              class="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-primary mb-2"
            >
            <p class="text-gray-700 font-medium text-sm md:text-base">Você está afiliado a:</p>
            <p class="text-primary font-bold text-sm md:text-base">{{ affiliatorInfo.name }}</p>
            <p v-if="affiliatorInfo.email" class="text-gray-600 text-xs md:text-sm">{{ affiliatorInfo.email }}</p>
            <p v-if="affiliatorInfo.congregation" class="text-gray-500 text-xs">{{ affiliatorInfo.congregation }}</p>
          </div>
          
          <p class="text-gray-600 text-xs md:text-sm mt-1 md:mt-2">
            Como afiliado e membro administrativo, você pode acompanhar seu desempenho e o ranking geral.
          </p>
        </div>
        
        <!-- Para Administrador -->
        <div v-else-if="isAdmin" class="bg-blue-50 p-2 md:p-3 rounded-lg mb-3 border border-blue-200">
          <p class="text-blue-700 font-medium text-sm md:text-base">Acesso de Administrador</p>
          <p class="text-blue-600 text-xs md:text-sm mt-1">
            Como administrador, você pode visualizar o desempenho geral do ranking, incluindo afiliados e administradores com vendas.
          </p>
        </div>
        
        <!-- Para Tesoureiro/Secretaria sem afiliação -->
        <div v-else-if="isAdministrativeRole && !authStore.currentUser?.affiliatedTo" class="bg-yellow-50 p-2 md:p-3 rounded-lg mb-3 border border-yellow-200">
          <p class="text-yellow-700 font-medium text-sm md:text-base">Acesso Administrativo</p>
          <p class="text-yellow-600 text-xs md:text-sm mt-1">
            Como membro administrativo, você tem acesso ao ranking geral de vendas.
          </p>
        </div>
        
        <!-- Fallback para outros casos (não deve ocorrer normalmente) -->
        <div v-else class="bg-yellow-50 p-2 md:p-3 rounded-lg mb-3 border border-yellow-200">
          <p class="text-yellow-700 text-sm md:text-base">Ranking disponível</p>
          <p class="text-yellow-600 text-xs md:text-sm">
            Você tem acesso ao ranking de vendas.
          </p>
        </div>
      </div>
      
      <!-- Exibição do ranking -->
      <div v-if="hasRankingAccess">
        <!-- Loading state -->
        <div v-if="isLoading" class="flex justify-center items-center p-3 md:p-8">
          <svg class="animate-spin h-6 w-6 md:h-8 md:w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-600 text-sm md:text-base">Carregando ranking...</span>
        </div>
        
        <!-- Ranking list -->
        <div v-else-if="rankingUsers.length > 0" class="space-y-1.5 md:space-y-3">
          <div v-for="user in rankingUsers" :key="user.id" 
               class="rounded-lg border transition-all"
               :class="[
                 user.totalSales <= 25
                   ? 'bg-red-100 border-red-300' 
                   : 'bg-gray-50 border-gray-200',
                 user.id === authStore.currentUser?.id 
                   ? 'ring-2 ring-primary ring-opacity-50' 
                   : ''
               ]">
            <!-- Layout específico para mobile -->
            <div class="md:hidden w-full flex flex-col px-1.5 py-2">
              <!-- Cabeçalho com dados principais -->
              <div class="flex items-center w-full">
                <!-- Posição no ranking e troféu -->
                <div class="flex-shrink-0 w-6 md:w-8 text-center font-bold">
                  <span :class="{ 'text-lg': user.position <= 3 && user.totalSales > 0 }">
                    {{ getTrophyEmoji(user.position, user.totalSales) }}
                  </span>
                </div>
                
                <!-- Avatar do usuário com tratamento de erro -->
                <div class="flex-shrink-0 ml-1">
                  <img 
                    :src="getSafeAvatar(user)"
                    v-img-fallback="getDefaultAvatar(user.displayName)"
                    alt="Avatar"
                    class="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover border border-gray-200"
                  >
                </div>
                
                <!-- Dados principais do usuário -->
                <div class="ml-1.5 flex-grow overflow-hidden">
                  <p class="font-medium text-gray-800 text-sm truncate">{{ user.displayName }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
                </div>
                
                <!-- Contagem de vendas e tipo de usuário (movido para cá) -->
                <div class="flex-shrink-0 ml-1 flex flex-col items-end">
                  <span :class="[
                    'px-1.5 py-0.5 rounded-full text-xs font-medium',
                    user.totalSales === 0
                      ? 'bg-gray-100 text-gray-600'
                      : user.totalSales <= 25 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                  ]">
                    {{ formatSalesCount(user) }}
                  </span>
                  
                  <!-- Tipo de usuário movido para abaixo das vendas -->
                  <span class="px-1.5 py-0.5 text-xs rounded-full font-medium mt-1" 
                        :class="{
                          'bg-orange-100 text-orange-800': user.role === UserRole.USER,
                          'bg-blue-100 text-blue-800': user.role === UserRole.ADMIN,
                          'bg-green-100 text-green-800': user.role === UserRole.SECRETARIA,
                          'bg-yellow-100 text-yellow-800': user.role === UserRole.TESOUREIRO
                        }">
                    {{ 
                      user.role === UserRole.ADMIN ? 'Admin' : 
                      user.role === UserRole.SECRETARIA ? 'Secretário' :
                      user.role === UserRole.TESOUREIRO ? 'Tesoureiro' : 'Usuário'
                    }}
                  </span>
                </div>
              </div>
              
              <!-- Informações adicionais em nova linha para mobile (apenas congregação agora) -->
              <div v-if="user.congregation" class="w-full mt-1 flex flex-wrap gap-1">
                <span class="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {{ user.congregation }}
                </span>
              </div>
            </div>
            
            <!-- Layout para desktop - mantido original -->
            <div class="hidden md:flex items-center p-3">
              <!-- Posição no ranking e troféu -->
              <div class="flex-shrink-0 w-10 text-center font-bold">
                <span :class="{ 'text-xl': user.position <= 3 && user.totalSales > 0 }">
                  {{ getTrophyEmoji(user.position, user.totalSales) }}
                </span>
              </div>
              
              <!-- Avatar do usuário com tratamento de erro -->
              <div class="flex-shrink-0 ml-2">
                <img 
                  :src="getSafeAvatar(user)"
                  v-img-fallback="getDefaultAvatar(user.displayName)"
                  alt="Avatar"
                  class="w-10 h-10 rounded-full object-cover border border-gray-200"
                >
              </div>
              
              <!-- Informações do usuário (exatamente como no original) -->
              <div class="ml-4 flex-grow">
                <div class="flex flex-col sm:flex-row sm:justify-between">
                  <div>
                    <p class="font-medium text-gray-800">{{ user.displayName }}</p>
                    <p class="text-xs text-gray-500">{{ user.email }}</p>
                  </div>
                  
                  <!-- Contagem de vendas e tipo de usuário -->
                  <div class="mt-1 sm:mt-0 flex flex-col items-end">
                    <span :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      user.totalSales === 0
                        ? 'bg-gray-100 text-gray-600'
                        : user.totalSales <= 25 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                    ]">
                      {{ formatSalesCount(user) }}
                    </span>
                    
                    <!-- Tipo de usuário movido para abaixo das vendas -->
                    <span class="px-2 py-0.5 text-xs rounded-full font-medium mt-1" 
                          :class="{
                            'bg-orange-100 text-orange-800': user.role === UserRole.USER,
                            'bg-blue-100 text-blue-800': user.role === UserRole.ADMIN,
                            'bg-green-100 text-green-800': user.role === UserRole.SECRETARIA,
                            'bg-yellow-100 text-yellow-800': user.role === UserRole.TESOUREIRO
                          }">
                      {{ 
                        user.role === UserRole.ADMIN ? 'Administrador' : 
                        user.role === UserRole.SECRETARIA ? 'Secretário' :
                        user.role === UserRole.TESOUREIRO ? 'Tesoureiro' : 'Usuário'
                      }}
                    </span>
                  </div>
                </div>
                
                <!-- Apenas informação de congregação agora -->
                <div v-if="user.congregation" class="mt-1 flex flex-wrap gap-1">
                  <span class="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {{ user.congregation }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Empty state -->
        <div v-else class="bg-gray-50 border border-gray-200 p-3 md:p-6 rounded-lg text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 md:h-16 md:w-16 mx-auto text-gray-400 mb-2 md:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h3 class="text-base md:text-lg font-medium text-gray-800 mb-1 md:mb-2">Nenhum dado de ranking disponível</h3>
          <p class="text-gray-600 text-xs md:text-sm">
            Não encontramos nenhuma venda registrada no sistema. O ranking será atualizado automaticamente
            quando houver vendas.
          </p>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
/* Estilos para destacar o usuário atual */
.current-user {
  box-shadow: 0 0 0 2px theme('colors.primary');
}

/* Animação para loading */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
