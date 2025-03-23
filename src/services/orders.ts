import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PaymentMethod, type Order, type OrderFormData } from '../types/order';
import { generateDocumentId } from '../utils/formatters';

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
  sellerName: string,
  sellerUsername?: string
): Promise<string> => {
  try {
    // Usar o username para o ID ou fallback para um formato tradicional
    const usernameToUse = sellerUsername || sellerName.toLowerCase().replace(/\s+/g, "_");
    const newOrderId = generateDocumentId('order', usernameToUse);
    
    // Verificar se paymentMethod está definido
    if (orderData.paymentMethod === undefined) {
      throw new Error('É necessário selecionar uma forma de pagamento');
    }
    
    // Preparar dados do pedido
    const newOrder: Order = {
      id: newOrderId,
      buyerName: orderData.buyerName,
      paymentMethod: orderData.paymentMethod,
      contactNumber: orderData.contactNumber,
      addressOrCongregation: orderData.addressOrCongregation,
      observations: orderData.observations,
      generatedNumbers: generatedNumbers,
      sellerName: sellerName,
      sellerId: sellerId,
      sellerUsername: sellerUsername || usernameToUse, // Usar o fornecido ou gerar um
      createdAt: new Date()
    };
    
    // Salvar no Firestore com o ID padronizado
    await setDoc(doc(db, 'orders', newOrderId), {
      ...newOrder,
      createdAt: serverTimestamp()
    });
    
    return newOrderId;
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw new Error('Não foi possível criar o pedido.');
  }
};

export const fetchAllSoldNumbers = async (): Promise<string[]> => {
  try {
    // Buscar todos os documentos de pedidos
    const soldNumbersQuery = query(
      collection(db, 'orders')
    );
    const querySnapshot = await getDocs(soldNumbersQuery);
    
    const soldNumbers: string[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.generatedNumbers && Array.isArray(data.generatedNumbers)) {
        soldNumbers.push(...data.generatedNumbers);
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

/**
 * Sincroniza os pedidos locais com o servidor
 * Útil para garantir dados atualizados sem recarregar tudo
 */
export const syncOrdersWithServer = async (localOrders: Order[], userId: string): Promise<Order[]> => {
  try {
    // Obter última data de atualização do pedido mais recente
    const lastUpdateTime = localOrders.length > 0 
      ? Math.max(...localOrders.map(o => o.createdAt.getTime()))
      : 0;
      
    // Buscar apenas pedidos mais recentes que o último conhecido
    const recentOrdersQuery = query(
      collection(db, 'orders'),
      where('sellerId', '==', userId),
      where('createdAt', '>', new Date(lastUpdateTime)),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(recentOrdersQuery);
    const newOrders: Order[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      
      newOrders.push({
        ...data,
        createdAt
      } as Order);
    });
    
    // Combinar pedidos antigos com novos e ordenar
    return [...newOrders, ...localOrders]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
  } catch (error) {
    console.error('Erro ao sincronizar pedidos:', error);
    return localOrders; // Retorna os pedidos locais em caso de erro
  }
};

/**
 * Busca pedidos que contêm um número específico
 */
export const findOrdersByNumber = async (number: string): Promise<Order[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    const orders: Order[] = [];
    
    ordersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.generatedNumbers && Array.isArray(data.generatedNumbers) && 
          data.generatedNumbers.includes(number)) {
        
        // Converter timestamp para Date
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        
        orders.push({
          ...data,
          createdAt
        } as Order);
      }
    });
    
    return orders;
  } catch (error) {
    console.error('Erro ao buscar pedidos por número:', error);
    throw new Error('Não foi possível buscar os pedidos com este número.');
  }
};

/**
 * Atualiza o status de pagamento de um pedido
 */
export const updateOrderPayment = async (
  orderId: string, 
  isPaid: boolean = true,
  paymentInfo?: { date: Date; method: PaymentMethod; reference?: string }
): Promise<boolean> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Pedido não encontrado');
    }
    
    const updateData: Record<string, any> = { 
      isPaid,
      paymentUpdatedAt: serverTimestamp()
    };
    
    if (paymentInfo) {
      updateData.paymentDate = paymentInfo.date;
      updateData.paymentMethod = paymentInfo.method;
      if (paymentInfo.reference) {
        updateData.paymentReference = paymentInfo.reference;
      }
    }
    
    await updateDoc(orderRef, updateData);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar status de pagamento:', error);
    throw new Error('Não foi possível atualizar o status de pagamento do pedido.');
  }
};
