import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Order, OrderFormData, PaymentMethod } from '../types/order';

/**
 * Busca todos os pedidos feitos por um vendedor específico
 */
export const fetchUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('sellerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(ordersQuery);
    const orders: Order[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Converter timestamp para Date
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      
      orders.push({
        ...data,
        createdAt
      } as Order);
    });
    
    return orders;
  } catch (error) {
    console.error('Erro ao buscar pedidos do usuário:', error);
    throw new Error('Não foi possível buscar os pedidos.');
  }
};

/**
 * Busca um pedido específico pelo ID
 */
export const fetchOrderById = async (orderId: string): Promise<Order | null> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      return null;
    }
    
    const data = orderDoc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    
    return {
      ...data,
      createdAt
    } as Order;
    
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    throw new Error('Não foi possível buscar os detalhes do pedido.');
  }
};

/**
 * Cria um novo pedido
 */
export const createOrder = async (
  orderData: OrderFormData,
  generatedNumbers: string[],
  sellerId: string,
  sellerName: string
): Promise<string> => {
  try {
    // Gerar ID único para o pedido
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Criar objeto do pedido
    const newOrder: Order = {
      id: orderId,
      buyerName: orderData.buyerName,
      paymentMethod: orderData.paymentMethod,
      contactNumber: orderData.contactNumber,
      addressOrCongregation: orderData.addressOrCongregation,
      observations: orderData.observations,
      generatedNumbers: generatedNumbers,
      sellerId: sellerId,
      sellerName: sellerName,
      createdAt: new Date()
    };
    
    // Salvar no Firestore
    await setDoc(doc(db, 'orders', orderId), {
      ...newOrder,
      createdAt: serverTimestamp()
    });
    
    return orderId;
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw new Error('Não foi possível criar o pedido.');
  }
};

/**
 * Busca todos os números vendidos
 */
export const fetchAllSoldNumbers = async (): Promise<string[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    const soldNumbers: string[] = [];
    
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      if (orderData.generatedNumbers && Array.isArray(orderData.generatedNumbers)) {
        soldNumbers.push(...orderData.generatedNumbers);
      }
    });
    
    return soldNumbers;
  } catch (error) {
    console.error('Erro ao buscar números vendidos:', error);
    throw new Error('Não foi possível verificar os números já vendidos.');
  }
};

/**
 * Verifica se um número está disponível
 */
export const isNumberAvailable = async (number: string): Promise<boolean> => {
  try {
    const soldNumbers = await fetchAllSoldNumbers();
    return !soldNumbers.includes(number);
  } catch (error) {
    console.error('Erro ao verificar disponibilidade do número:', error);
    throw new Error('Não foi possível verificar se o número está disponível.');
  }
};

/**
 * Busca estatísticas de vendas gerais
 */
export const fetchOrdersStatistics = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    let totalOrders = 0;
    let totalNumbers = 0;
    const uniqueBuyers = new Set();
    const uniqueSellers = new Set();
    
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      totalOrders++;
      
      if (data.generatedNumbers && Array.isArray(data.generatedNumbers)) {
        totalNumbers += data.generatedNumbers.length;
      }
      
      uniqueBuyers.add(data.buyerName);
      uniqueSellers.add(data.sellerId);
    });
    
    return {
      totalOrders,
      totalNumbers,
      uniqueBuyers: uniqueBuyers.size,
      uniqueSellers: uniqueSellers.size
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas de pedidos:', error);
    throw new Error('Não foi possível obter estatísticas de vendas.');
  }
};
