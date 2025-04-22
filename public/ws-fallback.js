/**
 * Script para detectar e evitar problemas de WebSocket
 * em ambientes de produção
 */
(function() {
  // Executar apenas em ambiente web
  if (typeof window === 'undefined') return;
  
  // Verificar se estamos em produção
  const isProduction = window.location.hostname !== 'localhost' && 
                      window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    console.log('[WS-Fallback] Ambiente de produção detectado, desativando WebSockets');
    
    // Interceptar e desativar WebSockets em produção
    const OriginalWebSocket = window.WebSocket;
    
    window.WebSocket = function(url, protocols) {
      // Se a URL for para o sistema de HMR do Vite, log e retorno de mock
      if (url.includes('/ws')) {
        console.warn('[WS-Fallback] Tentativa de WebSocket bloqueada em produção:', url);
        
        // Retornar um objeto mock que não faz nada
        return {
          addEventListener: () => {},
          removeEventListener: () => {},
          send: () => {},
          close: () => {},
        };
      }
      
      // Para outros WebSockets (como Firestore), permitir normalmente
      return new OriginalWebSocket(url, protocols);
    };
    
    // Definir flag global para informar que HMR está desativado
    window.__HMR_DISABLED__ = true;
  }
})();
