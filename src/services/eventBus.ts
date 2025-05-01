/**
 * Sistema de eventos centralizado para facilitar comunicação entre componentes
 * sem modificar objetos globais
 */

type EventHandler = (payload?: any) => void;

class EventBus {
  private events: Map<string, EventHandler[]> = new Map();
  
  /**
   * Registra um handler para um evento
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event)!.push(handler);
    
    // Retorna uma função para remover o handler
    return () => {
      const handlers = this.events.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }
  
  /**
   * Dispara um evento com payload opcional
   */
  emit(event: string, payload?: any): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Erro no handler do evento ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Remove todos os handlers de um evento
   */
  off(event: string): void {
    this.events.delete(event);
  }
}

export const eventBus = new EventBus();