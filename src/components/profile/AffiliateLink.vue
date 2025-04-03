<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useAffiliateCode } from '../../composables/useAffiliateCode';
import Card from '../ui/Card.vue';
import Alert from '../ui/Alert.vue';
import Button from '../ui/Button.vue';
import { UserRole } from '../../types/user';

// Hooks - usar o composable que já tem toda a lógica necessária
const { 
  currentUser, 
  loading, 
  error,
  success,
  affiliatedUsers,
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
  clearAllTimeouts,
  affiliateSalesMetrics
} = useAffiliateCode();

// Estados
const copied = ref(false);
const codeCopied = ref(false);
const affiliateTarget = ref('');
const isEmail = ref(false);
const affiliating = ref(false);
const checkingInterval = ref<number | null>(null);
const confirmDialogVisible = ref(false);
const pendingAffiliationData = ref<{ target: string; isEmail: boolean } | null>(null);
const affiliateCodeInputRef = ref<HTMLInputElement | null>(null);
const animateSuccess = ref(false);

// Novos estados para o menu de afiliados e reload
const reloadingAffiliates = ref(false);
const activeDropdownId = ref<string | null>(null);
const showRoleMenu = ref<string | null>(null);
const roleUpdateLoading = ref<string | null>(null);

// Novos estados para confirmação
const showConfirmDialog = ref(false);
const confirmAction = ref<{type: 'remove' | 'role'; id: string; role?: UserRole}>({
  type: 'remove',
  id: ''
});

// Adicionar uma propriedade reativa para armazenar as posições calculadas
const menuPositions = ref<Record<string, any>>({});

// Novo estado para controlar quais métricas estão expandidas
const expandedMetrics = ref<Set<string>>(new Set());

// Termos mais intuitivos para os papéis (hierarquias)
const roleLabels = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.SECRETARIA]: 'Secretário',
  [UserRole.TESOUREIRO]: 'Tesoureiro',
  [UserRole.USER]: 'Usuário Padrão'
};

// Computados
const affiliateCode = computed(() => currentUser.value?.affiliateCode || null);
const affiliateLink = computed(() => {
  if (!affiliateCode.value) return '';
  return `${window.location.origin}/register?ref=${affiliateCode.value}`;
});

// Adicionar um ref para rastrear se já mostramos notificação para este código expirado
const alreadyNotifiedCodes = ref<Set<string>>(new Set());

// Verificar se já notificamos sobre este código específico
const shouldShowExpiryAlert = computed(() => {
  if (!currentUser.value?.affiliateCode || isCodeValid.value || error.value) return false;
  
  const currentCode = currentUser.value.affiliateCode;
  // Se já notificamos sobre este código, não mostrar novamente
  if (alreadyNotifiedCodes.value.has(currentCode)) return false;
  
  // Se chegamos aqui, devemos mostrar o alerta e marcar como notificado
  alreadyNotifiedCodes.value.add(currentCode);
  return true;
});

// Verificar regularmente se o código ainda é válido usando o sistema simplificado
const startExpiryCheck = () => {
  if (checkingInterval.value) {
    clearInterval(checkingInterval.value);
  }
  
  // Verificar a cada 30 segundos se o código expirou
  checkingInterval.value = window.setInterval(() => {
    checkCurrentCode();
  }, 30000);
};

// Verificar se o usuário pode se afiliar (não tem afiliados E não está afiliado a ninguém)
const canAffiliate = computed(() => {
  if (!currentUser.value) return false;
  
  // REGRA 1: Se o usuário já está afiliado a alguém, não pode se afiliar novamente
  if (currentUser.value.affiliatedTo) return false;
  
  // REGRA 2: Se tem afiliados, não pode se afiliar a outra pessoa
  return !(currentUser.value.affiliates && currentUser.value.affiliates.length > 0);
});

// Verificar se o usuário já está afiliado a alguém
const isAlreadyAffiliated = computed(() => {
  return !!currentUser.value?.affiliatedTo;
});

// Verificar se o usuário tem afiliados (usada para mensagens informativas)
const hasAffiliates = computed(() => {
  return !!(currentUser.value?.affiliates && currentUser.value.affiliates.length > 0);
});

// Validar o formato do código/email antes de enviar
const isValidTarget = computed(() => {
  if (!affiliateTarget.value) return false;
  
  if (isEmail.value) {
    // Validação básica de email
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(affiliateTarget.value);
  } else {
    // Códigos de afiliado têm 6 caracteres alfanuméricos (aceita minúsculas ou maiúsculas)
    return /^[A-Za-z0-9]{6}$/.test(affiliateTarget.value);
  }
});

// Normaliza o código de afiliação para caixa alta
const normalizeAffiliateCode = (code: string): string => {
  return code.toUpperCase();
};

// Contagem de afiliados
const affiliatesCount = computed(() => {
  return affiliatedUsers.value.length;
});

// Exibir resumo da rede de afiliação
const affiliationSummary = computed(() => {
  if (isAlreadyAffiliated.value) {
    return `Você está afiliado a ${currentUser.value?.affiliatedTo}`;
  }
  
  if (affiliatesCount.value > 0) {
    return `Você tem ${affiliatesCount.value} ${affiliatesCount.value === 1 ? 'afiliado' : 'afiliados'}`;
  }
  
  return 'Você ainda não tem afiliações';
});

// Gerar código temporário de afiliado
const generateCode = async () => {
  try {
    console.log('[AffiliateLink] Gerando código temporário');
    await generateTemporaryAffiliateCode();
    console.log('[AffiliateLink] Código temporário gerado');
    
    // Iniciar verificação periódica após gerar código
    startExpiryCheck();
  } catch (err) {
    console.error('[AffiliateLink] Erro ao gerar código:', err);
  }
};

// Copiar link para clipboard
const copyToClipboard = async (text: string, type: 'code' | 'link' = 'link') => {
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    
    if (type === 'code') {
      codeCopied.value = true;
      setTimeout(() => {
        codeCopied.value = false;
      }, 2000);
    } else {
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    }
  } catch (err) {
    console.error(`Falha ao copiar ${type}:`, err);
  }
};

// Função para copiar apenas o código
const copyCodeToClipboard = () => {
  if (affiliateCode.value) {
    copyToClipboard(affiliateCode.value, 'code');
  }
};

// Observar mudanças no código e expiração
watch(() => currentUser.value?.affiliateCode, (newCode, oldCode) => {
  if (newCode && newCode !== oldCode) {
    // Se um novo código foi gerado, podemos mostrar alertas para ele no futuro
    if (alreadyNotifiedCodes.value.has(newCode)) {
      alreadyNotifiedCodes.value.delete(newCode);
    }
    
    if (newCode) {
      startExpiryCheck();
    } else if (checkingInterval.value) {
      clearInterval(checkingInterval.value);
      checkingInterval.value = null;
    }
  }
});

// Carregar afiliados e iniciar verificação quando o componente é montado
onMounted(async () => {
  console.log('[AffiliateLink] Componente montado, buscando afiliados');
  try {
    await fetchAffiliatedUsers();
    console.log('[AffiliateLink] Afiliados carregados:', affiliatedUsers.value.length);
    
    // Iniciar verificação do código se existir
    if (currentUser.value?.affiliateCode) {
      checkCurrentCode();
      startExpiryCheck();
    }
  } catch (err) {
    console.error('[AffiliateLink] Erro ao carregar afiliados:', err);
  }

  // Adicionar evento de clique global para fechar menus
  document.addEventListener('click', closeAllMenus);
  
  // Enviar evento para armazenar status de novas afiliações
  if (sessionStorage.getItem('newAffiliation') === 'true') {
    sessionStorage.removeItem('newAffiliation');
  }
});

// Limpar intervalo quando o componente é desmontado
onUnmounted(() => {
  clearResources();
  // Remover evento de clique global
  document.removeEventListener('click', closeAllMenus);
});

// Processar afiliação com confirmação
const requestAffiliation = async () => {
  if (!affiliateTarget.value || !isValidTarget.value) {
    error.value = isEmail.value 
      ? 'Por favor, insira um email válido' 
      : 'O código de afiliado deve ter 6 caracteres';
    return;
  }
  
  // Armazenar os dados para a confirmação
  pendingAffiliationData.value = {
    target: affiliateTarget.value,
    isEmail: isEmail.value
  };
  
  // Mostrar diálogo de confirmação
  confirmDialogVisible.value = true;
};

// Método simplificado que delega para o composable
const showMessage = (type: 'error' | 'success', message: string) => {
  if (type === 'error') {
    setTemporaryError(message);
  } else {
    setTemporarySuccess(message);
  }
};

// Efetuar afiliação após confirmação
const confirmAffiliation = async () => {
  if (!pendingAffiliationData.value) return;
  
  const { target, isEmail: isEmailTarget } = pendingAffiliationData.value;
  confirmDialogVisible.value = false;
  
  affiliating.value = true;
  try {
    console.log('[AffiliateLink] Iniciando processo de afiliação confirmado');
    // Normalizar o código para maiúsculas antes de enviar
    const normalizedTarget = isEmailTarget 
      ? target 
      : normalizeAffiliateCode(target);
    
    const response = await affiliateToUser(normalizedTarget, isEmailTarget);
    
    if (response && response.success) {
      console.log('[AffiliateLink] Afiliação bem-sucedida');
      // Limpar campo após sucesso
      affiliateTarget.value = '';
      
      // Animação de sucesso
      animateSuccess.value = true;
      setTimeout(() => {
        animateSuccess.value = false;
      }, 2000);
    } else {
      console.warn('[AffiliateLink] Afiliação falhou:', 'message' in response ? response.message : 'Erro desconhecido');
    }
  } catch (err) {
    console.error('[AffiliateLink] Erro ao processar afiliação:', err);
  } finally {
    affiliating.value = false;
    pendingAffiliationData.value = null;
  }
};

// Cancelar processo de afiliação
const cancelAffiliation = () => {
  confirmDialogVisible.value = false;
  pendingAffiliationData.value = null;
};

// Toggling entre código e email com melhor UX
const toggleAffiliationMethod = (newValue: boolean) => {
  isEmail.value = newValue;
  affiliateTarget.value = ''; // Limpar o campo ao mudar o método
  
  // Focar automaticamente no campo após a mudança
  setTimeout(() => {
    if (affiliateCodeInputRef.value) {
      affiliateCodeInputRef.value.focus();
    }
  }, 100);
};

// Auto-focar quando mudar entre código e email
watch(isEmail, () => {
  setTimeout(() => {
    if (affiliateCodeInputRef.value) {
      affiliateCodeInputRef.value.focus();
    }
  }, 100);
});

// Função para validar caracteres no campo de código
const validateCodeInput = (event: KeyboardEvent) => {
  // Permitir apenas letras e números (alfanuméricos)
  if (!/[a-zA-Z0-9]/.test(event.key)) {
    event.preventDefault();
  }
};

// Função para controle rigoroso da entrada com debounce embutido
const handleCodeInput = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = input.value.toUpperCase();
  
  // Garantir que nunca exceda 6 caracteres, mesmo em conexões lentas
  if (value.length > 6) {
    affiliateTarget.value = value.slice(0, 6);
    return;
  }
  
  // Normalização e conversão para maiúsculas
  affiliateTarget.value = value;
};

// Indicador visual de validade do código
const codeStatus = computed(() => {
  if (!affiliateTarget.value) return 'empty';
  if (affiliateTarget.value.length < 6) return 'incomplete';
  return isValidTarget.value ? 'valid' : 'invalid';
});

// Adicionar função para identificar tipos de erro
const getErrorCategory = computed(() => {
  if (!error.value) return null;
  
  // Verificar o tipo de erro por seu conteúdo
  if (error.value.includes('Código de afiliado inválido') || 
      error.value.includes('código de afiliado deve ter')) {
    return 'code';
  } else if (error.value.includes('Email não encontrado') || 
             error.value.includes('email válido')) {
    return 'email';
  } else if (error.value.includes('si mesmo')) {
    return 'self';
  } else if (error.value.includes('já está afiliado')) {
    return 'already_affiliated';
  } else {
    return 'general';
  }
});

// Limpar o erro ao mudar entre email e código
watch(isEmail, () => {
  if (error.value && (getErrorCategory.value === 'code' || getErrorCategory.value === 'email')) {
    error.value = null;
  }
});

// Função unificada para limpar recursos
const clearResources = () => {
  if (checkingInterval.value) {
    clearInterval(checkingInterval.value);
    checkingInterval.value = null;
  }
  
  // Limpar todos os timeouts de mensagens
  clearAllTimeouts();
};

// Função para recarregar a lista de afiliados
const reloadAffiliates = async () => {
  if (reloadingAffiliates.value) return;
  
  reloadingAffiliates.value = true;
  try {
    await fetchAffiliatedUsers();
    console.log('[AffiliateLink] Lista de afiliados recarregada com sucesso');
  } catch (err) {
    console.error('[AffiliateLink] Erro ao recarregar afiliados:', err);
    showMessage('error', 'Não foi possível atualizar a lista de afiliados.');
  } finally {
    reloadingAffiliates.value = false;
  }
};

// Função para alternar o menu dropdown - simplificada para maior confiabilidade
const toggleDropdown = (userId: string, event?: MouseEvent) => {
  event?.stopPropagation(); // Prevenir propagação do evento para evitar fechamento imediato
  
  // Se estamos fechando este menu, apenas limpe o estado
  if (activeDropdownId.value === userId) {
    activeDropdownId.value = null;
    return;
  }
  
  // Fechamos todos os outros menus
  activeDropdownId.value = userId;
  showRoleMenu.value = null; // Fechar submenu de papéis
  
  // Calcular posição do menu dropdown com base no evento
  if (event && event.currentTarget) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    calculateAndStoreDropdownPosition(userId, rect);
  } else {
    // Buscar o elemento pelo ID como fallback
    const element = document.querySelector(`[data-dropdown-trigger="${userId}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      calculateAndStoreDropdownPosition(userId, rect);
    }
  }
};

// Função para alternar menu de papel/função com melhor tratamento de eventos
const toggleRoleMenu = (userId: string, event: Event) => {
  event.stopPropagation();
  event.preventDefault();
  
  // Se já estamos mostrando este menu, fechamos
  if (showRoleMenu.value === userId) {
    showRoleMenu.value = null;
    return;
  }
  
  // Mostramos o menu de papéis para este usuário
  showRoleMenu.value = userId;
  
  // Para garantir que o menu de papéis seja posicionado corretamente
  setTimeout(() => {
    const button = event.currentTarget as HTMLElement;
    if (button) {
      const rect = button.getBoundingClientRect();
      // Posicionamento mais simples e confiável
      menuPositions.value[userId] = {
        top: `${rect.bottom + window.scrollY + 5}px`,
        left: `${rect.left + window.scrollX}px`,
      };
    }
  }, 10);
};

// Nova função para calcular e armazenar a posição do dropdown
const calculateAndStoreDropdownPosition = (userId: string, rect: DOMRect) => {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Dimensões aproximadas do menu
  const menuWidth = 224; // largura em pixels
  const menuHeight = 100; // altura aproximada
  
  // Posição padrão (à direita do botão)
  let position = {
    top: `${rect.top}px`,
    left: `${rect.right + 5}px`,
    right: 'auto'
  };
  
  // Verificar se vai caber à direita ou se precisa ir para a esquerda
  if (rect.right + menuWidth > windowWidth) {
    position = {
      top: `${rect.top}px`,
      right: `${windowWidth - rect.left + 5}px`,
      left: 'auto'
    };
  }
  
  // Verificar se vai caber para baixo ou se precisa ir para cima
  if (rect.bottom + menuHeight > windowHeight) {
    position.top = `${rect.top - menuHeight + rect.height}px`;
  }
  
  // Armazenar a posição calculada
  menuPositions.value[userId] = position;
};

// Função melhorada para calcular a posição do submenu
const calculateSubmenuPosition = (userId: string) => {
  // Se não tivermos a posição do menu pai, retornamos um valor padrão
  if (!menuPositions.value[userId]) {
    return { top: '0px', left: '0px' };
  }
  
  const menuPosition = menuPositions.value[userId];
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // Converter posições de string para número
  const menuTop = parseInt(menuPosition.top) || 0;
  const menuLeft = parseInt(menuPosition.left) || 0;
  const menuRight = menuPosition.right !== 'auto' ? parseInt(menuPosition.right) || 0 : 0;
  
  // Dimensões aproximadas do submenu
  const submenuWidth = 224; // largura em pixels
  const submenuHeight = Object.keys(roleLabels).length * 40 + 16; // altura com base no número de opções
  
  // Determinar se o menu está à direita ou à esquerda
  const isMenuOnLeft = menuPosition.right !== 'auto';
  
  let position = {};
  
  if (isMenuOnLeft) {
    // Menu está à esquerda do gatilho, submenu vai para a esquerda
    position = {
      top: `${menuTop}px`,
      right: `${menuRight + 224}px`, // 224px é aproximadamente a largura do menu
      left: 'auto'
    };
  } else {
    // Menu está à direita do gatilho, submenu vai para a direita
    position = {
      top: `${menuTop}px`,
      left: `${menuLeft + 224}px`,
      right: 'auto'
    };
    
    // Se não couber à direita, coloca à esquerda do menu
    if (menuLeft + 224 + submenuWidth > windowWidth) {
      position = {
        top: `${menuTop}px`,
        right: `${windowWidth - menuLeft + 5}px`,
        left: 'auto'
      };
    }
  }
  
  // Verificar se vai caber para baixo ou se precisa ir para cima
  if (menuTop + submenuHeight > windowHeight) {
    position = {
      ...position,
      top: `${windowHeight - submenuHeight - 10}px` // 10px de margem do fundo
    };
  }
  
  return position;
};

// Fechar todos os menus quando clicar fora
const closeAllMenus = (event?: MouseEvent) => {
  // Não fechar se o clique foi dentro de um menu ou submenu
  if (event) {
    const isClickInsideDropdown = event.target && 
      (event.target as Element).closest('[data-user-id]') !== null;
    
    const isClickInsideRoleMenu = event.target && 
      (event.target as Element).closest('[data-role-menu]') !== null;
    
    if (isClickInsideDropdown || isClickInsideRoleMenu) {
      return;
    }
  }
  
  activeDropdownId.value = null;
  showRoleMenu.value = null;
};

// Abrir diálogo de confirmação para remover afiliado
const confirmRemoveAffiliate = (userId: string, event: Event) => {
  event.stopPropagation();
  confirmAction.value = {
    type: 'remove',
    id: userId
  };
  showConfirmDialog.value = true;
  activeDropdownId.value = null; // Fechar dropdown
};

// Função que verifica se um determinado papel pode ser atribuído ao usuário
const canAssignRole = (user: any, role: UserRole): boolean => {
  // Papéis administrativos só podem ser atribuídos a usuários com afiliação válida
  if (role === UserRole.ADMIN || role === UserRole.SECRETARIA || role === UserRole.TESOUREIRO) {
    return !!user.affiliatedToId && user.affiliatedToId === currentUser.value?.id;
  }
  
  // Papel de usuário comum pode ser atribuído a qualquer usuário
  return true;
};

// Verificar se um usuário pode ter sua hierarquia alterada
const canChangeUserRole = (user: any): boolean => {
  // Só pode alterar o papel se o usuário estiver afiliado ao usuário atual
  return !!user.affiliatedToId && user.affiliatedToId === currentUser.value?.id;
};

// Função para abrir diálogo de confirmação para mudar papel
const confirmChangeRole = (userId: string, role: UserRole, event: Event) => {
  event.stopPropagation();
  
  // Verifica se o papel pode ser atribuído ao usuário
  const user = affiliatedUsers.value.find(u => u.id === userId);
  if (user && !canAssignRole(user, role)) {
    showMessage('error', 'Não é possível atribuir este papel a um usuário sem afiliação válida.');
    return;
  }
  
  confirmAction.value = {
    type: 'role',
    id: userId,
    role
  };
  showConfirmDialog.value = true;
  activeDropdownId.value = null; // Fechar dropdown
  showRoleMenu.value = null; // Fechar submenu de papéis
};

// Executar a ação confirmada
const executeConfirmedAction = async () => {
  if (confirmAction.value.type === 'remove') {
    await handleRemoveAffiliate(confirmAction.value.id);
  } else if (confirmAction.value.type === 'role' && confirmAction.value.role) {
    await handleChangeRole(confirmAction.value.id, confirmAction.value.role);
  }
  
  showConfirmDialog.value = false;
};

// Função para remover afiliado
const handleRemoveAffiliate = async (userId: string) => {
  try {
    const result = await removeAffiliate(userId);
    if (result.success) {
      showMessage('success', 'Afiliado removido com sucesso!');
    } else {
      // Use 'in' operator to check if message property exists
      const errorMsg = 'message' in result ? result.message : 'Não foi possível remover o afiliado.';
      showMessage('error', errorMsg);
    }
  } catch (err: any) {
    showMessage('error', err.message || 'Erro ao processar a solicitação.');
  }
};

// Função para alterar o papel (hierarquia) do afiliado
const handleChangeRole = async (userId: string, newRole: UserRole) => {
  roleUpdateLoading.value = userId;
  try {
    const result = await updateAffiliateRole(userId, newRole);
    if (result.success) {
      showMessage('success', `Papel alterado para ${roleLabels[newRole]} com sucesso!`);
    } else {
      // Use 'in' operator to check if message property exists
      const errorMsg = 'message' in result ? result.message : 'Não foi possível alterar o papel do afiliado.';
      showMessage('error', errorMsg);
    }
  } catch (err: any) {
    showMessage('error', err.message || 'Erro ao alterar o papel do afiliado.');
  } finally {
    roleUpdateLoading.value = null;
  }
};

// Função para lidar com dispensa de alerta de expiração
const dismissExpiryAlert = () => {
  // Já está marcado como notificado em shouldShowExpiryAlert
  if (currentUser.value?.affiliateCode) {
    // Manteremos o registro na memória para não mostrar novamente
    console.log('[AffiliateLink] Alerta de expiração descartado para código:', currentUser.value.affiliateCode);
  }
};

// Calcular avatar padrão baseado no nome do usuário
const getDefaultAvatar = (name: string) => {
  // Usando Dicebear como serviço de avatar padrão
  const seed = encodeURIComponent(name || 'user');
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=FF8C00`;
};

// Função para alternar a exibição das métricas de um afiliado
const toggleMetrics = (userId: string, event: Event) => {
  // Prevenir propagação para não acionar outros handlers
  event.stopPropagation();
  
  if (expandedMetrics.value.has(userId)) {
    expandedMetrics.value.delete(userId);
  } else {
    expandedMetrics.value.add(userId);
  }
};

// Verificar se as métricas de um afiliado estão expandidas
const isMetricsExpanded = (userId: string) => {
  return expandedMetrics.value.has(userId);
};

</script>

<template>
  <Card 
    title="Programa de Afiliações" 
    :subtitle="affiliationSummary" 
    class="mb-6"
  >
    <div class="p-4">
      <!-- Sistema unificado de alertas - sem duplicação -->
      <!-- Alerta de erro geral -->
      <Alert
        v-if="error && getErrorCategory === 'general'"
        type="error"
        :message="error"
        dismissible
        class="mb-4 alert-with-timeout"
        @dismiss="error = null"
      />

      <!-- Alerta de sucesso -->
      <Alert
        v-if="success"
        type="success"
        :message="success"
        dismissible
        class="mb-4 alert-with-timeout"
        @dismiss="success = null"
      />

      <!-- Alerta para códigos expirados - modificado para aparecer apenas uma vez por código -->
      <Alert
        v-if="shouldShowExpiryAlert"
        type="warning"
        message="Seu código de afiliação expirou. Gere um novo código para continuar."
        dismissible
        class="mb-4"
        @dismiss="dismissExpiryAlert"
      />

      <!-- Painel de Informações sobre Regras de Afiliação - exibir apenas para usuários que podem se afiliar -->
      <div v-if="canAffiliate" class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-medium text-blue-800 mb-2">Regras de Afiliação</h3>
        <ul class="list-disc list-inside space-y-1 text-sm text-blue-700">
          <li>Cada usuário pode se afiliar a apenas <strong>uma</strong> pessoa</li>
          <li>Usuários já afiliados a alguém <strong>não podem</strong> se afiliar a outra pessoa</li>
          <li>Usuários já afiliados a alguém <strong>não podem</strong> receber afiliados</li>
          <li>Usuários que já possuem afiliados <strong>não podem</strong> se afiliar a outra pessoa</li>
        </ul>
      </div>

      <!-- Usuário já afiliado - Aviso aprimorado com texto melhorado -->
      <div v-if="isAlreadyAffiliated" class="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <div class="flex items-start">
          <div class="mr-3 flex-shrink-0">
            <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium text-green-700 mb-2">Conexão Ativa</h3>
            <p class="text-green-600">
              Você está atualmente conectado à conta de <strong>{{ currentUser?.affiliatedTo }}</strong>. Por questões de hierarquia e integridade do sistema, essa afiliação não pode ser alterada, a menos que seja removida pela pessoa a quem você está afiliado.
            </p>
            <p v-if="currentUser?.affiliatedToEmail" class="text-green-600 text-sm mt-1">
              {{ currentUser.affiliatedToEmail }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Aviso de restrição de afiliação - Melhorado com ícone -->
      <div v-if="hasAffiliates && !isAlreadyAffiliated" 
           class="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div class="flex items-start">
          <div class="mr-3 flex-shrink-0">
            <svg class="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-medium text-yellow-700 mb-2">Importante</h3>
            <p class="text-yellow-600">
              Como você já possui afiliados, não é possível se afiliar a outro usuário.
              Isso é necessário para preservar a estrutura hierárquica de afiliações.
            </p>
          </div>
        </div>
      </div>

      <!-- Afiliar-se a um usuário - apenas mostrar se não tem afiliados -->
      <div v-if="canAffiliate" class="mb-6 border-b pb-4">
        <h3 class="text-lg font-medium text-primary mb-2">Afiliar-se a um Usuário</h3>
        <p class="text-sm text-gray-600 mb-3">
          Insira um código de afiliado ou email para se afiliar a outro usuário.
        </p>
        
        <div class="mb-3">
          <!-- Seletor aprimorado para alternar entre código e email -->
          <div class="flex mb-3 bg-gray-100 rounded-lg p-1 w-fit">
            <button 
              @click="toggleAffiliationMethod(false)"
              class="px-3 py-1.5 rounded-md text-sm transition-colors"
              :class="!isEmail ? 'bg-white shadow-sm text-primary font-medium' : 'text-gray-600 hover:bg-gray-200'"
            >
              Código
            </button>
            <button 
              @click="toggleAffiliationMethod(true)"
              class="px-3 py-1.5 rounded-md text-sm transition-colors ml-1"
              :class="isEmail ? 'bg-white shadow-sm text-primary font-medium' : 'text-gray-600 hover:bg-gray-200'"
            >
              Email
            </button>
          </div>
        
          <!-- Campo de afiliação reformulado para seguir o mesmo padrão visual -->
          <label class="block text-sm text-gray-600 mb-1">
            {{ isEmail ? 'Email para afiliação:' : 'Código de afiliação:' }}
          </label>
          
          <!-- Mensagem de erro de auto-afiliação - Exibida independente do método -->
          <div v-if="error && getErrorCategory === 'self'" 
               class="mb-3 p-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {{ error }}
          </div>
          
          <!-- Mensagem de erro - já está afiliado a alguém -->
          <div v-if="error && getErrorCategory === 'already_affiliated'" 
               class="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-600 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ error }}
          </div>
          
          <!-- Campo para email permanece o mesmo -->
          <div v-if="isEmail" class="flex flex-col">
            <div class="flex">
              <input
                ref="affiliateCodeInputRef"
                v-model="affiliateTarget"
                placeholder="Digite o email"
                type="email"
                class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary transition-all"
                :class="{
                  'border-red-300': (affiliateTarget && !isValidTarget) || (error && getErrorCategory === 'email'),
                  'border-green-300': affiliateTarget && isValidTarget,
                  'animate-pulse': affiliating
                }"
                @keyup.enter="requestAffiliation"
              />
              <button
                @click="requestAffiliation"
                :disabled="!affiliateTarget || affiliating || !isValidTarget"
                class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md transition-colors flex items-center"
                :class="{ 'opacity-50 cursor-not-allowed': !affiliateTarget || affiliating || !isValidTarget }"
              >
                <span v-if="affiliating" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando
                </span>
                <span v-else>Afiliar</span>
              </button>
            </div>
            
            <!-- Mensagem de erro específica para email -->
            <div v-if="error && getErrorCategory === 'email'" 
                 class="mt-2 text-sm text-red-600 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {{ error }}
            </div>
            
            <!-- Mensagem de validação para email -->
            <p v-else-if="isEmail && affiliateTarget && !isValidTarget" class="mt-2 text-sm text-danger">
              Email inválido
            </p>
          </div>
          
          <!-- Campo especial para código de afiliação com validação em tempo real -->
          <div v-else>
            <!-- Campo de entrada com validação durante digitação -->
            <div class="flex mb-3 relative">
              <input
                ref="affiliateCodeInputRef"
                v-model="affiliateTarget"
                placeholder="Digite o código"
                type="text"
                maxlength="6"
                class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary transition-all uppercase tracking-wider font-mono"
                :class="{
                  'border-red-300': (affiliateTarget && !isValidTarget) || (error && getErrorCategory === 'code'),
                  'border-green-300': codeStatus === 'valid',
                  'animate-pulse': affiliating
                }"
                @input="handleCodeInput"
                @keypress="validateCodeInput"
                @keyup.enter="requestAffiliation"
              />
              <button
                @click="requestAffiliation"
                :disabled="!affiliateTarget || affiliating || !isValidTarget"
                class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md transition-colors flex items-center"
                :class="{ 'opacity-50 cursor-not-allowed': !affiliateTarget || affiliating || !isValidTarget }"
              >
                <span v-if="affiliating" class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando
                </span>
                <span v-else>Afiliar</span>
              </button>
            </div>
            
            <!-- Visualização em caixas para cada caractere do código com melhor sincronização -->
            <div class="flex justify-between mb-2 code-boxes">
              <div 
                v-for="index in 6" 
                :key="index"
                class="w-12 h-12 flex items-center justify-center border-2 rounded-md text-xl font-bold transition-all overflow-hidden"
                :class="{
                  'border-gray-300 bg-gray-50': !affiliateTarget || index > affiliateTarget.length,
                  'border-primary text-primary': affiliateTarget && index <= affiliateTarget.length,
                  'border-green-500 bg-green-50 text-green-600': codeStatus === 'valid' && index <= affiliateTarget.length,
                  'shake-animation': error && getErrorCategory === 'code' && index <= affiliateTarget.length
                }"
              >
                {{ affiliateTarget && index <= affiliateTarget.length && index <= 6 ? affiliateTarget[index-1] : '' }}
              </div>
            </div>
            
            <!-- Status do código e contador com tratamento de erro -->
            <div class="flex justify-between items-center text-xs mt-1">
              <div>
                <span 
                  v-if="error && getErrorCategory === 'code'"
                  class="text-red-600 font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {{ error }}
                </span>
                <span 
                  v-else-if="codeStatus === 'incomplete'" 
                  class="text-primary"
                >
                  {{ affiliateTarget.length }}/6 caracteres
                </span>
                <span 
                  v-else-if="codeStatus === 'valid'" 
                  class="text-green-600 font-medium"
                >
                  Código válido
                </span>
              </div>
              
              <div v-if="codeStatus === 'valid'" class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                Pronto para enviar
              </div>
            </div>
          </div>
          
          <!-- Mensagem de ajuda contextual -->
          <p class="mt-4 text-xs text-gray-500 italic">
            {{ isEmail 
              ? 'Insira o email do usuário ao qual você deseja se afiliar.' 
              : 'Digite o código de 6 caracteres usando apenas letras e números.' 
            }}
          </p>
        </div>
      </div>

      <!-- Meu Código de Afiliado - ocultar para usuários já afiliados -->
      <div v-if="!isAlreadyAffiliated" class="mb-4 pt-2">
        <h3 class="text-lg font-medium text-primary mb-2">Meu Código de Afiliado</h3>
        
        <div v-if="affiliateCode && isCodeValid" class="mb-4">
          <!-- Código Temporário com botão de cópia - modificado -->
          <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 transition-all" :class="{'bg-green-50 border-green-200': codeCopied}">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm text-gray-600">Seu código temporário:</p>
              <div class="text-xs text-gray-500">
                {{ timeRemaining }}
              </div>
            </div>
            <div class="flex items-center justify-between">
              <p class="font-mono text-lg font-bold text-primary">{{ affiliateCode }}</p>
              <button
                @click="copyCodeToClipboard"
                class="ml-2 text-gray-500 hover:text-primary transition-colors p-2 rounded-md hover:bg-gray-100 flex items-center"
                title="Copiar código"
              >
                <span v-if="codeCopied" class="text-green-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado!
                </span>
                <span v-else class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </span>
              </button>
            </div>
          </div>
          
          <!-- Link para compartilhar - modificado -->
          <div class="mb-4">
            <label class="block text-sm text-gray-600 mb-1">Link para compartilhar:</label>
            <div class="flex">
              <input
                type="text"
                readonly
                :value="affiliateLink"
                class="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary bg-gray-50"
              />
              <button
                @click="copyToClipboard(affiliateLink, 'link')"
                class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-r-md transition-colors flex items-center"
                :class="{ 'bg-green-600': copied }"
              >
                <span v-if="copied" class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado!
                </span>
                <span v-else class="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </span>
              </button>
            </div>
          </div>
          
          <p class="text-sm text-gray-600">
            Compartilhe este link ou código com seus amigos para vinculá-los à sua conta.
          </p>
        </div>
        
        <div v-else class="mb-4">
          <div class="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
            <div class="flex items-start">
              <div class="mr-3 flex-shrink-0">
                <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-gray-600">
                  Você ainda não possui um código de afiliado ativo. Gere um código temporário válido por 30 minutos.
                </p>
                <p class="text-sm text-gray-500 mt-2">
                  Códigos temporários permitem que outros usuários se vinculem à sua conta.
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            @click="generateCode" 
            variant="primary"
            :disabled="isGeneratingCode || loading"
            class="w-full"
          >
            <span v-if="isGeneratingCode" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando...
            </span>
            <span v-else>Gerar Código Temporário</span>
          </Button>
        </div>
      </div>
      
      <!-- Usuários Afiliados - agora só visível para usuários NÃO afiliados a outros -->
      <div v-if="!isAlreadyAffiliated" class="mt-6 pt-2 border-t relative"
           :class="{ 'animate-pulse bg-green-50 rounded-lg': animateSuccess }">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-lg font-medium text-primary">
            Meus Afiliados <span class="text-sm font-normal">({{ affiliatedUsers.length }})</span>
          </h3>
          
          <!-- Botão de Recarregar -->
          <button 
            @click.stop="reloadAffiliates" 
            class="text-gray-500 hover:text-primary p-2 rounded-full hover:bg-gray-100 transition-colors"
            :class="{ 'animate-spin': reloadingAffiliates }"
            title="Atualizar lista de afiliados"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <p class="text-sm text-gray-600 mb-2">Usuários vinculados à sua conta:</p>
        
        <!-- Lista de afiliados - exibida apenas se houver afiliados -->
        <ul v-if="affiliatedUsers.length > 0" class="divide-y divide-gray-200">
          <li v-for="user in affiliatedUsers" :key="user.id" class="py-3 relative">
            <!-- Cartão de afiliado redesenhado com foto de perfil e métricas -->
            <div class="flex items-start space-x-3">
              <!-- Avatar do afiliado -->
              <div class="flex-shrink-0">
                <img 
                  :src="user.photoURL || getDefaultAvatar(user.displayName)" 
                  :alt="user.displayName"
                  class="w-12 h-12 rounded-full object-cover border border-gray-200"
                />
              </div>
              
              <div class="flex-grow min-w-0">
                <p class="font-medium truncate">{{ user.displayName }}</p>
                <p class="text-xs text-gray-500 truncate">{{ user.email }}</p>
                <div class="mt-1 flex flex-wrap gap-1">
                  <span class="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                    {{ roleLabels[user.role || UserRole.USER] }}
                  </span>
                  
                  <!-- Indicador de métricas se disponível -->
                  <span v-if="affiliateSalesMetrics[user.id]" class="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                    {{ affiliateSalesMetrics[user.id].totalSales }} vendas
                  </span>
                </div>
              </div>
              
              <!-- Botão para exibir/esconder métricas -->
              <button 
                v-if="affiliateSalesMetrics[user.id]"
                @click="toggleMetrics(user.id, $event)" 
                class="text-gray-500 hover:text-primary p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0 mr-2"
                :class="{'bg-primary bg-opacity-10 text-primary': isMetricsExpanded(user.id)}"
                :title="isMetricsExpanded(user.id) ? 'Esconder métricas' : 'Ver métricas'"
              >
                <svg v-if="!isMetricsExpanded(user.id)" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <!-- Menu de ações -->
              <button 
                @click="toggleDropdown(user.id, $event)" 
                :data-dropdown-trigger="user.id"
                class="text-gray-500 hover:text-primary p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
            
            <!-- Métricas de desempenho expansíveis -->
            <transition
              name="metrics-expand"
              @enter="(el) => (el as HTMLElement).style.height = (el as HTMLElement).scrollHeight + 'px'"
              @leave="(el) => (el as HTMLElement).style.height = '0px'"
            >
              <div 
                v-if="affiliateSalesMetrics[user.id] && isMetricsExpanded(user.id)" 
                class="mt-3 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden metrics-container"
              >
                <!-- Cabeçalho de métricas com resumo -->
                <div class="flex items-center justify-between px-3 py-2 bg-primary bg-opacity-5 border-b border-gray-200">
                  <h4 class="text-sm font-medium text-primary">Métricas de Desempenho</h4>
                  <div class="flex items-center">
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                          :class="affiliateSalesMetrics[user.id].growthRate >= 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'">
                      {{ affiliateSalesMetrics[user.id].growthRate >= 0 ? '+' : '' }}{{ affiliateSalesMetrics[user.id].growthRate }}%
                    </span>
                  </div>
                </div>
                
                <!-- Cards de métricas -->
                <div class="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <!-- Card: Total de Vendas -->
                  <div class="bg-white rounded-lg p-2 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p class="text-xs text-gray-500">Total de Vendas</p>
                    <div class="flex items-end justify-between mt-1">
                      <p class="text-lg font-bold text-primary">{{ affiliateSalesMetrics[user.id].totalSales }}</p>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Card: Valor Total -->
                  <div class="bg-white rounded-lg p-2 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p class="text-xs text-gray-500">Valor Total</p>
                    <div class="flex items-end justify-between mt-1">
                      <p class="text-lg font-bold text-primary">R$ {{ affiliateSalesMetrics[user.id].totalValue }}</p>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Card: Vendas do Mês -->
                  <div class="bg-white rounded-lg p-2 shadow-sm border border-gray-100 flex flex-col justify-between">
                    <p class="text-xs text-gray-500">Este Mês</p>
                    <div class="flex items-end justify-between mt-1">
                      <p class="text-lg font-bold text-primary">{{ affiliateSalesMetrics[user.id].salesThisMonth }}</p>
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <!-- Detalhes adicionais -->
                <div class="px-3 py-2 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
                  <div v-if="affiliateSalesMetrics[user.id].lastSaleDate" class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Última venda: {{ new Date(affiliateSalesMetrics[user.id].lastSaleDate as string | number | Date).toLocaleDateString('pt-BR') }}
                  </div>
                  <div class="flex items-center">
                    <span v-if="affiliateSalesMetrics[user.id].salesLastMonth > 0" class="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Mês anterior: {{ affiliateSalesMetrics[user.id].salesLastMonth }}
                    </span>
                    <span v-else>Sem vendas no mês anterior</span>
                  </div>
                </div>
              </div>
            </transition>
            
            <!-- Dropdown do menu de ações (simplificado) -->
            <div 
              v-if="activeDropdownId === user.id" 
              class="absolute right-0 top-0 mt-8 w-56 bg-white rounded-md shadow-lg z-30 border border-gray-200"
              :data-user-id="user.id"
              @click.stop
            >
              <div class="py-1">
                <!-- Opção: Alterar Hierarquia - só mostrar se o usuário puder ter a hierarquia alterada -->
                <div class="relative" v-if="canChangeUserRole(user)">
                  <button 
                    @click="toggleRoleMenu(user.id, $event)"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary flex justify-between items-center"
                  >
                    <span>Alterar Hierarquia</span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                
                <!-- Separador - só mostrar se tiver a opção de alterar hierarquia -->
                <hr v-if="canChangeUserRole(user)" class="my-1 border-gray-200">
                
                <!-- Opção: Remover afiliado -->
                <button 
                  @click="confirmRemoveAffiliate(user.id, $event)"
                  class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Remover Afiliado
                </button>
              </div>
            </div>
          </li>
        </ul>
        
        <!-- Mensagem para quando não há afiliados -->
        <div v-else class="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-4">
          <div class="flex items-start">
            <div class="mr-3 flex-shrink-0">
              <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-gray-600">
                Você ainda não possui usuários afiliados.
              </p>
              <p class="text-sm text-gray-500 mt-2">
                Compartilhe seu código de afiliação para começar a formar sua rede.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Afiliado a -->
      <div v-if="currentUser?.affiliatedTo" class="mt-6 pt-2 border-t">
        <h3 class="text-lg font-medium text-primary mb-2">Você está afiliado a:</h3>
        <div class="bg-gray-50 p-3 rounded-lg">
          <p class="font-medium">{{ currentUser.affiliatedTo }}</p>
          <p v-if="currentUser.affiliatedToEmail" class="text-xs text-gray-500">
            {{ currentUser.affiliatedToEmail }}
          </p>
          <p v-if="currentUser.affiliatedToInfo?.congregation" class="text-xs text-gray-400">
            {{ currentUser.affiliatedToInfo.congregation }}
          </p>
        </div>
      </div>
    </div>
  </Card>
  
  <!-- Modal de Confirmação de Afiliação -->
  <div v-if="confirmDialogVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
      <h3 class="text-lg font-medium text-gray-900 mb-2">Confirmar Afiliação</h3>
      
      <p class="text-gray-600 mb-4">
        Você está prestes a se afiliar a 
        <span class="font-medium">{{ pendingAffiliationData?.target }}</span>
        {{ pendingAffiliationData?.isEmail ? '(email)' : '(código)' }}.
      </p>
      
      <div class="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
        <p class="text-yellow-700 text-sm">
          <span class="font-medium">Importante:</span> Após se afiliar, você não poderá mudar sua afiliação.
        </p>
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          @click="cancelAffiliation"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          @click="confirmAffiliation"
          class="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md"
        >
          Confirmar Afiliação
        </button>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação de Ação -->
  <div v-if="showConfirmDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        {{ confirmAction.type === 'remove' ? 'Confirmar Remoção' : 'Confirmar Alteração de Papel' }}
      </h3>
      
      <p class="text-gray-600 mb-4">
        <template v-if="confirmAction.type === 'remove'">
          Você tem certeza que deseja remover este afiliado? Esta ação não pode ser desfeita.
        </template>
        <template v-else-if="confirmAction.type === 'role' && confirmAction.role">
          Você está prestes a alterar o papel deste afiliado para <strong>{{ roleLabels[confirmAction.role] }}</strong>. Deseja continuar?
        </template>
      </p>
      
      <div v-if="confirmAction.type === 'role'" class="bg-blue-50 p-3 rounded-md border border-blue-200 mb-4">
        <p class="text-blue-700 text-sm">
          <span class="font-medium">Nota:</span> Alterar a hierarquia pode conceder diferentes permissões ao usuário na plataforma.
        </p>
      </div>
      
      <div v-if="confirmAction.type === 'remove'" class="bg-red-50 p-3 rounded-md border border-red-200 mb-4">
        <p class="text-red-700 text-sm">
          <span class="font-medium">Atenção:</span> Remover um afiliado irá desvincular o usuário da sua conta permanentemente.
        </p>
      </div>
      
      <div class="flex justify-end space-x-3">
        <button 
          @click="showConfirmDialog = false"
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          @click="executeConfirmedAction"
          :class="[
            confirmAction.type === 'remove' 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-primary hover:bg-primary-dark text-white'
          ]"
          class="px-4 py-2 rounded-md"
        >
          {{ confirmAction.type === 'remove' ? 'Remover' : 'Confirmar' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Submenu de papéis, renderizado com teleport -->
  <teleport to="body">
    <div 
      v-if="showRoleMenu" 
      class="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 w-56"
      :style="calculateSubmenuPosition(showRoleMenu)"
      data-role-menu="true"
    >
      <div class="py-1">
        <button 
          v-for="(label, role) in roleLabels" 
          :key="role"
          @click="confirmChangeRole(showRoleMenu, role as UserRole, $event)"
          class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
          :class="[
            affiliatedUsers.find(u => u.id === showRoleMenu)?.role === role 
              ? 'text-primary font-medium' 
              : 'text-gray-700 hover:text-primary',
            !canAssignRole(affiliatedUsers.find(u => u.id === showRoleMenu), role as UserRole) 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          ]"
          :disabled="!canAssignRole(affiliatedUsers.find(u => u.id === showRoleMenu), role as UserRole)"
        >
          <span v-if="affiliatedUsers.find(u => u.id === showRoleMenu)?.role === role">✓ </span>
          {{ label }}
        </button>
      </div>
    </div>
  </teleport>

</template>
<style scoped>
/* Animações para feedback visual */
.animate-success {
  animation: successPulse 2s ease-in-out;
}

@keyframes successPulse {
  0% { background-color: rgba(0, 255, 0, 0.1); }
  50% { background-color: rgba(0, 255, 0, 0.2); }
  100% { background-color: transparent; }
}

/* Animação para as caixas de código */
.code-boxes > div {
  transform: translateY(0);
  transition: all 0.2s ease;
}

.code-boxes > div:not(:empty) {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Efeito de destaque para caracteres digitados */
@keyframes characterHighlight {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.code-boxes > div:last-of-type:not(:empty) {
  animation: characterHighlight 0.3s ease-in-out;
}

/* Responsividade para dispositivos móveis */
@media (max-width: 640px) {
  .code-boxes > div {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }
}

/* Adiciona estilo para o menu dropdown */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Animação de erro para caixas de código */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}

.shake-animation {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

/* Transição para métricas expansíveis */
.metrics-expand-enter-active,
.metrics-expand-leave-active {
  transition: height 0.3s ease;
}

.metrics-expand-enter-from,
.metrics-expand-leave-to {
  height: 0;
}

.metrics-container {
  overflow: hidden;
  transition: height 0.3s ease-in-out, opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
}

.metrics-expand-enter-from,
.metrics-expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.metrics-expand-enter-active,
.metrics-expand-leave-active {
  transition: all 0.3s ease-out;
  overflow: hidden;
}

.metrics-expand-enter-to,
.metrics-expand-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
