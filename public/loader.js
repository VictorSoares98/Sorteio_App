// Função auxiliar para carregar módulos com fallback
window.loadModuleWithFallback = function(moduleUrl, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    function attemptImport(url = moduleUrl) {
      retries++;
      console.log(`[Loader] Tentativa ${retries} de carregar: ${url}`);
      
      // Try MJS first, then JS as fallback
      import(url)
        .then(resolve)
        .catch(error => {
          console.warn(`[Loader] Erro: ${error.message}`);
          
          // Se o erro for relacionado ao MIME type ou não puder buscar o módulo
          if (error.message.includes('MIME type') || 
              error.message.includes('Failed to fetch') ||
              error.message.includes('Import') ||
              error.message.includes('import')) {
            
            // Se ainda temos tentativas, tente adicionar um timestamp ou mudar a extensão
            if (retries < maxRetries) {
              const hasQuery = url.includes('?');
              const timestamp = Date.now();
              
              // Tente com um parâmetro de consulta para evitar cache
              if (retries === 1) {
                const newUrl = hasQuery 
                  ? `${url}&t=${timestamp}` 
                  : `${url}?t=${timestamp}`;
                setTimeout(() => attemptImport(newUrl), 500);
              } 
              // Tente converter MJS para JS ou vice-versa como última tentativa
              else if (retries === 2) {
                let newUrl = url;
                if (url.endsWith('.mjs')) {
                  newUrl = url.replace('.mjs', '.js');
                } else if (url.endsWith('.js')) {
                  newUrl = url.replace('.js', '.mjs');
                }
                newUrl = hasQuery 
                  ? `${newUrl}&t=${timestamp}` 
                  : `${newUrl}?t=${timestamp}`;
                setTimeout(() => attemptImport(newUrl), 500);
              }
            } else {
              // Sem mais tentativas, rejeite com erro detalhado
              reject(new Error(`Falha ao carregar módulo após ${maxRetries} tentativas: ${error.message}`));
            }
          } else {
            // Para outros tipos de erro, rejeitar imediatamente
            reject(error);
          }
        });
    }
    
    // Iniciar a primeira tentativa
    attemptImport();
  });
};

// Método mais sutil para verificar problemas de carregamento
(function() {
  // Função para verificar se o módulo pode ser carregado
  const checkModuleLoading = async () => {
    try {
      // Verificar se a aplicação está tendo problemas para carregar módulos
      if (typeof window.__vite_dynamic_import !== 'function') {
        console.warn('[Loader] __vite_dynamic_import não encontrado. Isso pode indicar problemas com o carregamento de módulos.');
      }
    } catch (err) {
      console.warn('[Loader] Erro na verificação inicial:', err);
    }
    
    // Verificar problemas comuns de comportamento de bloqueio
    setTimeout(() => {
      const appLoading = document.getElementById('app-loading');
      if (appLoading && document.body.contains(appLoading)) {
        // A aplicação ainda não carregou completamente após 10 segundos
        console.warn('[Loader] A aplicação está demorando mais do que o esperado para carregar.');
        
        // Mostrar uma dica sutil na interface de carregamento
        const helpMessage = document.createElement('div');
        helpMessage.style.fontSize = '14px';
        helpMessage.style.color = '#FF8C00';
        helpMessage.style.marginTop = '10px';
        helpMessage.style.maxWidth = '400px';
        helpMessage.style.textAlign = 'center';
        helpMessage.style.padding = '10px';
        helpMessage.innerHTML = 'Se a aplicação não carregar, tente desativar extensões do navegador ou usar o modo anônimo.';
        
        appLoading.appendChild(helpMessage);
      }
    }, 10000); // Verificar após 10 segundos
  };
  
  // Executar a verificação
  checkModuleLoading();
})();
