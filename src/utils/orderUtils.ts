import type { Order } from '../types/order';

/**
 * Calcula o total de números vendidos a partir de uma lista de pedidos
 * com validação robusta para evitar erros
 * 
 * @param orders Lista de pedidos para processar
 * @returns Total de números vendidos
 */
export const calculateTotalSoldNumbers = (orders: Order[]): number => {
  if (!Array.isArray(orders)) {
    console.warn('calculateTotalSoldNumbers: orders não é um array');
    return 0;
  }
  
  return orders.reduce((total, order) => {
    // Verificar se generatedNumbers existe e é um array
    if (!order.generatedNumbers || !Array.isArray(order.generatedNumbers)) {
      console.warn(`calculateTotalSoldNumbers: pedido ${order.id} não tem números válidos`);
      return total;
    }
    
    return total + order.generatedNumbers.length;
  }, 0);
};

/**
 * Obtém lista de todos os números vendidos a partir de uma lista de pedidos
 * @param orders Lista de pedidos a serem processados
 * @returns Array com todos os números vendidos
 */
export const getAllSoldNumbers = (orders: Order[]): string[] => {
  const allNumbers: string[] = [];
  
  orders.forEach(order => {
    if (Array.isArray(order.generatedNumbers)) {
      allNumbers.push(...order.generatedNumbers);
    }
  });
  
  return allNumbers;
};

/**
 * Verifica se um número específico já foi vendido em algum pedido
 * 
 * @param orders Lista de pedidos para verificar
 * @param number Número a ser verificado
 * @returns true se o número já foi vendido, false caso contrário
 */
export const isNumberSold = (orders: Order[], number: string): boolean => {
  if (!Array.isArray(orders) || !number) {
    return false;
  }
  
  return orders.some(order => 
    Array.isArray(order.generatedNumbers) && 
    order.generatedNumbers.includes(number)
  );
};

/**
 * Formata o valor total em reais com base nos números vendidos
 * 
 * @param numberCount Quantidade de números vendidos
 * @param pricePerTicket Preço por número (padrão: R$ 10,00)
 * @returns Valor formatado em reais
 */
export const calculateTotalValue = (numberCount: number, pricePerTicket: number = 10): string => {
  const total = numberCount * pricePerTicket;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(total);
};
