/**
 * Este arquivo fornece wrappers seguros para operações de rede
 * sem modificar objetos globais
 */

/**
 * Wrapper seguro para fetch que monitora erros sem modificar o objeto global
 */
export async function safeFetch(
  input: RequestInfo | URL, 
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, init);
    
    // Monitoramento sem afetar o objeto global
    if (!response.ok) {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
      if (isFirebaseUrl(url)) {
        console.warn(`[Network] Resposta com erro (${response.status}) para serviço externo`);
        // Notificar sistema de monitoramento
        notifyServiceBlocked();
      }
    }
    
    return response;
  } catch (error) {
    // Tratamento de erro similar ao original
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    if (isFirebaseUrl(url)) {
      console.warn('[Network] Erro em requisição para serviços externos');
      notifyServiceBlocked();
    }
    throw error;
  }
}

/**
 * Wrapper para conexões WebSocket
 */
export function createSafeWebSocket(
  url: string | URL,
  protocols?: string | string[]
): WebSocket {
  const socket = new WebSocket(url, protocols);
  
  if (typeof url === 'string' && isFirebaseUrl(url)) {
    socket.addEventListener('error', () => {
      console.warn('[Network] Erro em WebSocket para serviços externos');
      notifyServiceBlocked();
    });
  }
  
  return socket;
}

/**
 * Verifica o status de um serviço externo
 * considerando possíveis problemas de CORS
 */
export async function checkServiceStatus(url: string, options?: RequestInit): Promise<boolean> {
  // Para URLs Firebase/Google que podem ter restrições CORS, tentar abordagem alternativa
  if (isFirebaseUrl(url)) {
    return checkServiceWithImage(url);
  }
  
  try {
    await safeFetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // Usar no-cors para evitar erros CORS em verificações simples
      cache: 'no-cache',
      credentials: 'omit',
      ...options
    });
    
    // Com modo no-cors, a resposta será sempre tipo "opaque"
    // Então não podemos verificar response.ok
    // Assumimos sucesso se não gerou exceção
    return true;
  } catch (error) {
    console.error('[Network] Erro ao verificar status do serviço:', error);
    return false;
  }
}

/**
 * Verifica serviço usando carregamento de imagem (alternativa para contornar CORS)
 */
async function checkServiceWithImage(baseUrl: string): Promise<boolean> {
  // Extrair o domínio base da URL para carregar um recurso estático do mesmo serviço
  const urlObj = new URL(baseUrl);
  const domain = urlObj.hostname;
  
  // Escolher um recurso de verificação adequado
  let checkUrl = '';
  if (domain.includes('googleapis') || domain.includes('google')) {
    checkUrl = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';
  } else if (domain.includes('firebase')) {
    checkUrl = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg';
  } else {
    // Fallback para a URL original com no-cors
    return new Promise(resolve => {
      fetch(baseUrl, { mode: 'no-cors' })
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }
  
  // Retornar uma Promise que resolve quando a imagem carregar ou falhar
  return new Promise(resolve => {
    const img = new Image();
    
    img.onload = () => {
      resolve(true);
    };
    
    img.onerror = () => {
      resolve(false);
    };
    
    // Adicionar timestamp para evitar cache
    img.src = `${checkUrl}?_t=${Date.now()}`;
    
    // Timeout para garantir que não ficamos esperando indefinidamente
    setTimeout(() => {
      if (!img.complete) {
        resolve(false);
      }
    }, 5000);
  });
}

// Função auxiliar para verificar se é uma URL de serviço Firebase/Google
function isFirebaseUrl(url: string): boolean {
  return url.includes('googleapis.com') || 
         url.includes('firestore.googleapis.com') || 
         url.includes('identitytoolkit') ||
         url.includes('firebase');
}

// Sistema de notificação centralizado usando eventos customizados
function notifyServiceBlocked(): void {
  const event = new CustomEvent('serviceBlocked', { 
    detail: { 
      timestamp: Date.now(),
      source: 'network-wrapper'
    } 
  });
  document.dispatchEvent(event);
}