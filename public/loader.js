// Função auxiliar para carregar módulos com fallback
window.loadModuleWithFallback = function(moduleUrl, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    function attemptImport() {
      retries++;
      console.log(`[Loader] Tentativa ${retries} de carregar: ${moduleUrl}`);
      
      // Try MJS first, then JS as fallback
      import(moduleUrl)
        .then(resolve)
        .catch(error => {
          console.warn(`[Loader] Erro: ${error.message}`);
          
          // Se o erro for relacionado ao MIME type ou não puder buscar o módulo
          if (error.message.includes('MIME type') || 
              error.message.includes('Failed to fetch') ||
              error.message.includes('Import', 'import')) {
            
            // Se ainda temos tentativas, tente adicionar um timestamp ou mudar a extensão
            if (retries < maxRetries) {
              const hasQuery = moduleUrl.includes('?');
              const timestamp = Date.now();
              
              // Tente com um parâmetro de consulta para evitar cache
              if (retries === 1) {
                const newUrl = hasQuery 
                  ? `${moduleUrl}&t=${timestamp}` 
                  : `${moduleUrl}?t=${timestamp}`;
                setTimeout(() => attemptImport(newUrl), 500);
              } 
              // Tente converter MJS para JS ou vice-versa como última tentativa
              else if (retries === 2) {
                let newUrl = moduleUrl;
                if (moduleUrl.endsWith('.mjs')) {
                  newUrl = moduleUrl.replace('.mjs', '.js');
                } else if (moduleUrl.endsWith('.js')) {
                  newUrl = moduleUrl.replace('.js', '.mjs');
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

// Detectar e avisar sobre bloqueadores de anúncios
(function() {
  // Lista de URLs comumente bloqueadas por extensões
  const testUrls = [
    'https://www.google-analytics.com/analytics.js',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
  ];
  
  let isAdBlockerDetected = false;
  
  // Tenta carregar um recurso que seria bloqueado
  Promise.all(testUrls.map(url => {
    return fetch(url, { method: 'HEAD', mode: 'no-cors' })
      .catch(() => {
        isAdBlockerDetected = true;
      });
  })).finally(() => {
    if (isAdBlockerDetected) {
      console.warn('[Loader] Bloqueador de anúncios detectado. Isso pode interferir no funcionamento da aplicação.');
      
      // Mostrar notificação sutil que não bloqueie a experiência
      const wrapper = document.createElement('div');
      wrapper.style.position = 'fixed';
      wrapper.style.bottom = '0';
      wrapper.style.left = '0';
      wrapper.style.right = '0';
      wrapper.style.padding = '8px';
      wrapper.style.backgroundColor = 'rgba(255, 140, 0, 0.9)';
      wrapper.style.color = 'white';
      wrapper.style.textAlign = 'center';
      wrapper.style.fontSize = '14px';
      wrapper.style.zIndex = '9999';
      wrapper.innerHTML = `
        <p>Um bloqueador de anúncios foi detectado. Caso tenha problemas ao carregar a aplicação, desative-o temporariamente.</p>
        <button id="dismiss-adblocker-warning" style="background: white; color: #FF8C00; border: none; padding: 4px 8px; margin-left: 8px; border-radius: 4px; cursor: pointer;">
          Entendi
        </button>
      `;
      
      document.body.appendChild(wrapper);
      
      document.getElementById('dismiss-adblocker-warning').addEventListener('click', function() {
        wrapper.style.display = 'none';
      });
    }
  });
})();
