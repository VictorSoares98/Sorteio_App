import { type Order } from '../types/order';

/**
 * Calcula o total de números vendidos a partir de uma lista de pedidos
 * @param orders Lista de pedidos a serem processados
 * @returns Número total de bilhetes vendidos
 */
export const calculateTotalSoldNumbers = (orders: Order[]): number => {
  return orders.reduce((total, order) => {
    // Verificar se generatedNumbers existe e é um array
    if (Array.isArray(order.generatedNumbers)) {
      return total + order.generatedNumbers.length;
    }
    return total;
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
 * Verifica se um número específico está presente em algum dos pedidos
 * @param orders Lista de pedidos a serem verificados
 * @param number Número a ser procurado
 * @returns Verdadeiro se o número estiver presente em algum pedido
 */
export const isNumberInOrders = (orders: Order[], number: string): boolean => {
  return orders.some(order => 
    Array.isArray(order.generatedNumbers) && 
    order.generatedNumbers.includes(number)
  );
};
