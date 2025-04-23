/**
 * Configuração global para os testes
 * Este arquivo é carregado antes de todos os testes
 */
import { beforeAll, vi } from 'vitest';

// Adiciona a declaração de tipo para IntersectionObserver no objeto global
declare global {
  interface Window {
    IntersectionObserver: typeof IntersectionObserver;
  }
}

// Configuração global antes de todos os testes
beforeAll(() => {
  // Suprimir logs durante testes para manter a saída limpa
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

// Mock global para o IntersectionObserver (necessário para componentes que usam v-lazy ou detecção de visibilidade)
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [0];
  
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
    // Constructor implementation not needed for mock
  }
  
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
  takeRecords(): IntersectionObserverEntry[] { return []; }
};
