/**
 * Matchers personalizados para testes
 * 
 * Este arquivo contém matchers adicionais para o Jest/Vitest
 * que podem ser usados nos testes do projeto
 */
/// <reference lib="dom" />
import { expect } from 'vitest';

// Matcher personalizado para verificar se um elemento está visível
expect.extend({
  toBeVisible(received) {
    const isVisible = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0';
    };

    const pass = isVisible(received);
    
    return {
      pass,
      message: () => pass
        ? `Expected element not to be visible`
        : `Expected element to be visible`
    };
  },
  
  // Matcher personalizado para verificar formatos de moeda
  toHaveFormattedCurrency(received, expectedAmount) {
    // Normalizando o texto recebido - remove espaços extras e converte vírgula para ponto (formato BR para EN)
    const normalizedText = received.text().trim().replace(/\s+/g, ' ');
    
    // Padrão para R$ XX,XX ou R$XX,XX
    const currencyPattern = /R\$\s*(\d+,\d+)/;
    const matches = normalizedText.match(currencyPattern);
    
    if (!matches) {
      return {
        pass: false,
        message: () => `Expected "${normalizedText}" to contain a formatted currency value, but no matching pattern found`
      };
    }
    
    // Converter o valor encontrado para número
    const valueText = matches[1].replace(',', '.');
    const actualValue = parseFloat(valueText);
    
    // Verificar se o valor encontrado é igual ao esperado
    const pass = Math.abs(actualValue - expectedAmount) < 0.001; // pequena tolerância para problemas de arredondamento
    
    return {
      pass,
      message: () => pass
        ? `Expected "${normalizedText}" not to contain the currency value ${expectedAmount}`
        : `Expected "${normalizedText}" to contain the currency value ${expectedAmount}, but found ${actualValue}`
    };
  }
});

// Tipos para os matchers personalizados
declare global {
  namespace Vi {
    interface Assertion {
      toBeVisible(): Assertion;
      toHaveFormattedCurrency(amount: number): Assertion;
    }
  }
}
