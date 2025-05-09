/**
 * Interface que define as configurações da aplicação
 */
export interface AppSettings {
  // Configurações básicas da aplicação
  appName: string;
  version: string;
  
  // Configurações de exportação
  export?: {
    maxItemsPerPage?: number;
    defaultFormat?: 'csv' | 'pdf' | 'excel';
    includeHeaders?: boolean;
    dateFormat?: string;
  };
  
  // Configurações de sorteio
  raffle?: {
    numbersPerPage?: number;
    defaultPrice?: number;
    maxActiveRaffles?: number;
  };
  
  // Outras configurações que podem ser necessárias
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  
  // Flag para modo de depuração
  debug?: boolean;
}

/**
 * Configurações padrão da aplicação
 */
export const defaultSettings: AppSettings = {
  appName: 'Sorteio UMADRIMC',
  version: '1.0.0',
  export: {
    maxItemsPerPage: 50,
    defaultFormat: 'csv',
    includeHeaders: true,
    dateFormat: 'DD/MM/YYYY'
  },
  raffle: {
    numbersPerPage: 10,
    defaultPrice: 10,
    maxActiveRaffles: 1
  },
  theme: 'light',
  language: 'pt-BR',
  debug: false
};
