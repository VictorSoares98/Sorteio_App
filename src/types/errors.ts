import { FirebaseError } from 'firebase/app';

/**
 * Tipo para representar detalhes de um erro de rede
 */
export interface NetworkError {
  code: string;
  message: string;
  isFirebaseError: boolean;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Verifica se um erro é um erro de rede
 * @param error Erro a ser verificado
 * @returns true se for erro de rede, false caso contrário
 */
export function isNetworkError(error: unknown): boolean {
  // Verificar se é um FirebaseError
  if (error instanceof FirebaseError) {
    // Códigos relacionados à conectividade no Firebase
    const networkCodes = [
      'unavailable',
      'network-request-failed',
      'deadline-exceeded',
      'disconnected',
      'internal',
      'cancelled',
    ];
    
    return networkCodes.includes(error.code);
  }
  
  // Verificar se é um DOMException ou um TypeError relacionado a rede
  if (error instanceof DOMException || error instanceof TypeError) {
    const networkPatterns = [
      'network',
      'offline',
      'connection',
      'internet',
      'timeout',
      'failed to fetch',
      'aborted'
    ];
    
    return networkPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }
  
  // Para outros tipos de erro, verificar a mensagem como fallback
  if (error instanceof Error) {
    const networkPatterns = [
      'network',
      'offline',
      'connection',
      'internet',
      'timeout',
      'failed to fetch',
      'aborted'
    ];
    
    return networkPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }
  
  return false;
}

/**
 * Categoriza um erro de rede para melhor tratativa
 * @param error Erro para categorizar
 * @returns Objeto NetworkError com detalhes estruturados
 */
export function categorizeNetworkError(error: unknown): NetworkError {
  // Valores padrão
  let code = 'unknown-network-error';
  let message = 'Erro de rede desconhecido';
  let isFirebaseError = false;
  let severity: 'low' | 'medium' | 'high' = 'medium';
  
  // Verificar se é um FirebaseError
  if (error instanceof FirebaseError) {
    isFirebaseError = true;
    code = error.code;
    message = error.message;
    
    // Determinar severidade com base no código
    if (['unavailable', 'network-request-failed'].includes(code)) {
      severity = 'high';
    } else if (['deadline-exceeded', 'disconnected'].includes(code)) {
      severity = 'medium';
    } else {
      severity = 'low';
    }
  } 
  // Verificar se é um outro tipo de erro
  else if (error instanceof Error) {
    message = error.message;
    
    if (error instanceof DOMException) {
      code = `dom-${error.name.toLowerCase()}`;
    } else if (error instanceof TypeError) {
      code = 'type-error';
    }
    
    // Determinar severidade e código baseado em padrões na mensagem
    if (/offline|disconnected|no.internet/i.test(message)) {
      code = 'device-offline';
      severity = 'high';
    } else if (/timeout|timed.out/i.test(message)) {
      code = 'request-timeout';
      severity = 'medium';
    } else if (/aborted|cancelled/i.test(message)) {
      code = 'request-cancelled';
      severity = 'low';
    }
  }
  
  return {
    code,
    message,
    isFirebaseError,
    severity
  };
}
