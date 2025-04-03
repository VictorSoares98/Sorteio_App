import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useOrderStore } from '../stores/orderStore';
import { 
  generateTemporaryAffiliateCode as generateTempCode,
  affiliateToUser as affiliate,
  getAffiliatedUsers as fetchUsers,
  removeAffiliate as removeAff,
  updateAffiliateRole as updateRole,
  findUserByAffiliateCode
} from '../services/profile';
import { UserRole, type User } from '../types/user';

// Interface para métricas de afiliados
export interface AffiliateSalesMetrics {
  totalSales: number;
  totalValue: number;
  lastSaleDate: Date | null;
  salesThisMonth: number;
  salesLastMonth: number;
  growthRate: number; // Percentual de crescimento
}

export function useAffiliateCode() {
  const authStore = useAuthStore();
  const orderStore = useOrderStore();
  const currentUser = computed(() => authStore.currentUser);
  
  // Estado para códigos de afiliação
  const loading = ref(false);
  const error = ref<string | null>(null);
  const success = ref<string | null>(null);
  const isGeneratingCode = ref(false);
  const affiliatedUsers = ref<User[]>([]);
  const affiliateSalesMetrics = ref<Record<string, AffiliateSalesMetrics>>({});
  
  // Gerenciamento de estado de timeouts para limpeza automática de mensagens
  const timeoutIds = ref<number[]>([]);
  
  // Limpar todos os timeouts ao desmontar o componente
  const clearAllTimeouts = () => {
    timeoutIds.value.forEach(id => window.clearTimeout(id));
    timeoutIds.value = [];
  };
  
  // Definir mensagem de erro temporária
  const setTemporaryError = (message: string, duration = 5000) => {
    error.value = message;
    
    const timeoutId = window.setTimeout(() => {
      error.value = null;
    }, duration);
    
    timeoutIds.value.push(timeoutId);
  };
  
  // Definir mensagem de sucesso temporária
  const setTemporarySuccess = (message: string, duration = 5000) => {
    success.value = message;
    
    const timeoutId = window.setTimeout(() => {
      success.value = null;
    }, duration);
    
    timeoutIds.value.push(timeoutId);
  };
  
  // Verificar se um código é válido com base em sua data de expiração
  const isCodeValid = computed(() => {
    if (!currentUser.value?.affiliateCode) return false;
    if (!currentUser.value.affiliateCodeExpiry) return true;
    
    // Converter Timestamp para Date
    const expiryTimestamp = currentUser.value.affiliateCodeExpiry;
    let expiryDate: Date;
    
    if (expiryTimestamp && typeof expiryTimestamp === 'object' && 'toDate' in expiryTimestamp) {
      expiryDate = expiryTimestamp.toDate();
    } else if (expiryTimestamp instanceof Date) {
      expiryDate = expiryTimestamp;
    } else {
      // Falback: Se não conseguir converter, considerar expirado
      return false;
    }
    
    return expiryDate > new Date();
  });
  
  // Calcular tempo restante para expiração do código
  const timeRemaining = computed(() => {
    if (!currentUser.value?.affiliateCode || !currentUser.value.affiliateCodeExpiry) {
      return 'Código permanente';
    }
    
    // Converter o timestamp para Date
    const expiryTimestamp = currentUser.value.affiliateCodeExpiry;
    let expiryDate: Date;
    
    if (expiryTimestamp && typeof expiryTimestamp === 'object' && 'toDate' in expiryTimestamp) {
      expiryDate = expiryTimestamp.toDate();
    } else if (expiryTimestamp instanceof Date) {
      expiryDate = expiryTimestamp;
    } else {
      return 'Expiração desconhecida';
    }
    
    const now = new Date();
    if (expiryDate <= now) {
      return 'Expirado';
    }
    
    // Calcular a diferença
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins <= 0) {
      return `${diffSecs}s restantes`;
    }
    
    return `${diffMins}m ${diffSecs}s restantes`;
  });
  
  // Verificar o código atual
  const checkCurrentCode = async () => {
    if (!currentUser.value?.affiliateCode) return;
    
    try {
      // Verificar se o código ainda é válido usando o serviço de perfil
      const userWithCode = await findUserByAffiliateCode(currentUser.value.affiliateCode);
      
      // Se o código não estiver associado a nenhum usuário ou não retornar o usuário atual, está inválido
      if (!userWithCode || userWithCode.id !== currentUser.value.id) {
        console.log('[useAffiliateCode] Código não encontrado ou associado a outro usuário');
        return false;
      }
      
      return isCodeValid.value;
    } catch (err) {
      console.error('[useAffiliateCode] Erro ao verificar código:', err);
      return false;
    }
  };
  
  // Buscar afiliados
  const fetchAffiliatedUsers = async () => {
    if (!currentUser.value) return;
    
    loading.value = true;
    try {
      // Redefinir o estado de erro
      error.value = null;
      
      // Buscar afiliados usando o serviço
      const users = await fetchUsers(currentUser.value.id);
      affiliatedUsers.value = users;
      
      // Após buscar afiliados, buscar métricas para cada um
      await fetchAffiliatesMetrics();
      
      return users;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao buscar afiliados:', err);
      setTemporaryError('Não foi possível carregar os afiliados. Tente novamente mais tarde.');
      return [];
    } finally {
      loading.value = false;
    }
  };
  
  // Gerar código temporário
  const generateTemporaryAffiliateCode = async () => {
    if (!currentUser.value) {
      setTemporaryError('Você precisa estar autenticado para gerar um código.');
      return null;
    }
    
    isGeneratingCode.value = true;
    
    try {
      // Redefinir estado de erro
      error.value = null;
      
      // Gerar código utilizando o serviço
      const code = await generateTempCode(currentUser.value.id);
      
      // Recarregar dados do usuário para atualizar o código no estado
      await authStore.fetchUserData(true);
      
      // Mostrar mensagem de sucesso
      setTemporarySuccess('Código de afiliação gerado com sucesso!');
      
      return code;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao gerar código:', err);
      setTemporaryError(err.message || 'Não foi possível gerar o código de afiliação.');
      return null;
    } finally {
      isGeneratingCode.value = false;
    }
  };
  
  // Afiliar-se a outro usuário
  const affiliateToUser = async (targetIdentifier: string, isEmail: boolean = false) => {
    if (!currentUser.value) {
      setTemporaryError('Você precisa estar autenticado para se afiliar.');
      return { success: false };
    }
    
    // Verificar auto-afiliação
    if (isEmail && currentUser.value.email === targetIdentifier) {
      setTemporaryError('Você não pode se afiliar a si mesmo.');
      return { success: false };
    }
    
    try {
      // Redefinir estado de erro
      error.value = null;
      
      // Processar afiliação
      const result = await affiliate(currentUser.value.id, targetIdentifier, isEmail);
      
      if (result.success) {
        // Recarregar dados do usuário para atualizar informações de afiliação
        await authStore.fetchUserData(true);
        
        // Mostrar mensagem de sucesso
        setTemporarySuccess('Afiliação realizada com sucesso!');
      } else {
        // Mostrar mensagem de erro
        setTemporaryError(result.message || 'Não foi possível realizar a afiliação.');
      }
      
      return result;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao processar afiliação:', err);
      setTemporaryError(err.message || 'Ocorreu um erro ao processar a afiliação.');
      return { success: false };
    }
  };
  
  // Remover um afiliado
  const removeAffiliate = async (affiliateId: string) => {
    if (!currentUser.value) {
      setTemporaryError('Você precisa estar autenticado para remover um afiliado.');
      return { success: false };
    }
    
    try {
      // Redefinir estado de erro
      error.value = null;
      
      // Processar remoção
      const result = await removeAff(currentUser.value.id, affiliateId);
      
      if (result.success) {
        // Recarregar dados do usuário e lista de afiliados
        await authStore.fetchUserData(true);
        await fetchAffiliatedUsers();
        
        // Mostrar mensagem de sucesso
        setTemporarySuccess('Afiliado removido com sucesso!');
      } else {
        // Mostrar mensagem de erro
        setTemporaryError(result.message || 'Não foi possível remover o afiliado.');
      }
      
      return result;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao remover afiliado:', err);
      setTemporaryError(err.message || 'Ocorreu um erro ao remover o afiliado.');
      return { success: false };
    }
  };
  
  // Atualizar papel de um afiliado
  const updateAffiliateRole = async (affiliateId: string, newRole: UserRole) => {
    if (!currentUser.value) {
      setTemporaryError('Você precisa estar autenticado para atualizar um papel.');
      return { success: false };
    }
    
    try {
      // Redefinir estado de erro
      error.value = null;
      
      // Processar atualização
      const result = await updateRole(currentUser.value.id, affiliateId, newRole);
      
      if (result.success) {
        // Recarregar dados do usuário e lista de afiliados
        await fetchAffiliatedUsers();
        
        // Mostrar mensagem de sucesso
        setTemporarySuccess('Papel atualizado com sucesso!');
      } else {
        // Mostrar mensagem de erro
        setTemporaryError(result.message || 'Não foi possível atualizar o papel.');
      }
      
      return result;
    } catch (err: any) {
      console.error('[useAffiliateCode] Erro ao atualizar papel:', err);
      setTemporaryError(err.message || 'Ocorreu um erro ao atualizar o papel.');
      return { success: false };
    }
  };

  // NOVA FUNCIONALIDADE: Métricas de desempenho para afiliados
  const fetchAffiliatesMetrics = async () => {
    if (!currentUser.value || affiliatedUsers.value.length === 0) return;
    
    try {
      // Carregar todos os pedidos para análise
      await orderStore.fetchAllOrders();
      const allOrders = orderStore.orders;
      
      // Preparar métricas para cada afiliado
      const metrics: Record<string, AffiliateSalesMetrics> = {};
      
      // Data atual e cálculo de meses
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Para cada afiliado, calcular métricas
      for (const affiliate of affiliatedUsers.value) {
        // Filtrar pedidos do afiliado (usando sellerId)
        const affiliateOrders = allOrders.filter(order => 
          order.sellerId === affiliate.id || 
          order.originalSellerId === affiliate.id
        );
        
        if (affiliateOrders.length === 0) {
          // Afiliado sem vendas ainda
          metrics[affiliate.id] = {
            totalSales: 0,
            totalValue: 0,
            lastSaleDate: null,
            salesThisMonth: 0,
            salesLastMonth: 0,
            growthRate: 0
          };
          continue;
        }
        
        // Ordenar pedidos por data (mais recente primeiro)
        const sortedOrders = [...affiliateOrders].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        
        // Data da última venda
        const lastSaleDate = sortedOrders[0].createdAt;
        
        // Calcular valor total
        const totalValue = affiliateOrders.reduce((sum, order) => {
          return sum + (order.generatedNumbers?.length || 0);
        }, 0);
        
        // Calcular vendas por mês
        const salesThisMonth = affiliateOrders.filter(order => {
          const orderDate = order.createdAt;
          return orderDate.getMonth() === currentMonth && 
                 orderDate.getFullYear() === currentYear;
        }).length;
        
        const salesLastMonth = affiliateOrders.filter(order => {
          const orderDate = order.createdAt;
          return orderDate.getMonth() === lastMonth && 
                 orderDate.getFullYear() === lastMonthYear;
        }).length;
        
        // Calcular taxa de crescimento
        let growthRate = 0;
        if (salesLastMonth > 0) {
          growthRate = Math.round(((salesThisMonth - salesLastMonth) / salesLastMonth) * 100);
        } else if (salesThisMonth > 0) {
          growthRate = 100; // Crescimento de 100% se não havia vendas no mês anterior
        }
        
        // Armazenar métricas
        metrics[affiliate.id] = {
          totalSales: affiliateOrders.length,
          totalValue,
          lastSaleDate,
          salesThisMonth,
          salesLastMonth,
          growthRate
        };
      }
      
      // Atualizar o estado
      affiliateSalesMetrics.value = metrics;
      
    } catch (err) {
      console.error('[useAffiliateCode] Erro ao calcular métricas de afiliados:', err);
    }
  };

  // Inicializar verificação de código
  checkCurrentCode();
  
  return {
    currentUser,
    loading,
    error,
    success,
    affiliatedUsers,
    affiliateSalesMetrics, // Exportar métricas
    generateTemporaryAffiliateCode,
    affiliateToUser,
    fetchAffiliatedUsers,
    timeRemaining,
    isCodeValid,
    isGeneratingCode,
    checkCurrentCode,
    removeAffiliate,
    updateAffiliateRole,
    setTemporaryError,
    setTemporarySuccess,
    clearAllTimeouts
  };
}
