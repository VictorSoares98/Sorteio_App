import { collection, query, where, getDocs, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { type Order, type OrderFormData } from '../types/order';
import { generateDocumentId } from '../utils/formatters';

/**
 * Busca todos os pedidos de um usuário específico
 */
export const fetchUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'), 
      where('sellerId', '==', userId)
    );
    
    const querySnapshot = await getDocs(ordersQuery);
    const fetchedOrders: Order[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
      
      fetchedOrders.push({
        ...data,
        createdAt
      } as Order);
    });
    
    // Ordena pedidos por data (mais recente primeiro)
    return fetchedOrders.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);
    throw new Error('Não foi possível carregar seus pedidos.');
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
  sellerUsername: string
): Promise<string> => {
  try {
    // Gera um ID amigável baseado no username do vendedor
    const newOrderId = generateDocumentId('order', sellerUsername);
    
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
      sellerUsername: sellerUsername, // Incluir o username do vendedor
      createdAt: new Date()
    };
    
    // Salvar pedido no Firestore com o ID padronizado
    await setDoc(doc(db, 'orders', newOrderId), {
      ...newOrder,
      createdAt: serverTimestamp() 
    });
    
    console.log(`Pedido criado com ID padronizado: ${newOrderId}`);
    return newOrderId;
    
  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    throw new Error('Erro ao criar pedido. Tente novamente.');
  }
};
