/**
 * Utilitários para detecção de dispositivos e ambientes de navegação
 * para melhorar a experiência de autenticação
 */

/**
 * Detecta se o usuário está em um dispositivo móvel
 * @returns true se for um dispositivo móvel
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Detecta se o navegador está embutido em uma aplicação
 * (como WebViews em apps nativos)
 * @returns true se for um navegador embutido
 */
export function isEmbeddedBrowser(): boolean {
  // Detectar WebViews e browsers embutidos em aplicações
  return /wv|WebView|SamsungBrowser/.test(navigator.userAgent) || 
         (/iPhone|iPad|iPod/.test(navigator.userAgent) && !(/Safari/.test(navigator.userAgent)));
}

/**
 * Tenta detectar se o usuário está usando navegação privada
 * Nota: Essa detecção não é 100% confiável em todos os navegadores
 * @returns true se provavelmente estiver em navegação privada
 */
export function isPrivateBrowsing(): boolean {
  // Verificações básicas para modos de navegação privada
  if ('memory' in navigator && (navigator as any).memory) {
    // Em alguns browsers, a quantidade de memória é limitada em modo privado
    const memory = (navigator as any).memory;
    if (memory.jsHeapSizeLimit < 2000000000) { // menos de 2GB é suspeito
      return true;
    }
  }
  
  // Para Safari (detectar modo privado pela restrição de localStorage)
  try {
    const key = '__private_test__';
    localStorage.setItem(key, key);
    localStorage.removeItem(key);
    return false; // Se chegou aqui, não está em navegação privada
  } catch (e) {
    return true; // Se deu erro no localStorage, pode ser navegação privada
  }
  
  return false;
}

/**
 * Detecta se o navegador tem suporte a popups
 * @returns true se popups são suportados
 */
export function supportsPopups(): boolean {
  // Alguns navegadores mobile sempre bloqueiam popups
  if (isMobileDevice()) return false;
  
  // Navegadores embutidos normalmente não suportam popups
  if (isEmbeddedBrowser()) return false;
  
  // Verificação específica para Firefox no Android (que tem problemas com popups)
  if (/Android.*Firefox/.test(navigator.userAgent)) return false;
  
  return true;
}

/**
 * Verifica se o navegador tem possíveis restrições com Cookies/COOP
 * @returns true se há possíveis restrições
 */
export function hasCookieOrCOOPRestrictions(): boolean {
  // Verificar navegação privada (que pode ter restrições de cookies)
  if (isPrivateBrowsing()) return true;
  
  // Verificar se cookies estão habilitados
  if (!navigator.cookieEnabled) return true;
  
  // iOS 14+ pode ter restrições específicas com COOP
  if (/iPhone|iPad|iPod/.test(navigator.userAgent) && 
      /Version\/1[4-9]/.test(navigator.userAgent)) {
    return true;
  }
  
  return false;
}

/**
 * Obtém o melhor método de autenticação para o ambiente atual
 * @returns 'popup' ou 'redirect' com base nas capacidades detectadas
 */
export function getBestAuthMethod(): 'popup' | 'redirect' {
  // Se for dispositivo móvel, navegador embutido ou modo privado, use redirect
  if (isMobileDevice() || isEmbeddedBrowser() || isPrivateBrowsing()) {
    return 'redirect';
  }
  
  // Se detectar possíveis restrições de COOP, use redirect
  if (hasCookieOrCOOPRestrictions()) {
    return 'redirect';
  }
  
  // Por padrão, prefira popup por ser mais fluido na experiência
  return 'popup';
}
