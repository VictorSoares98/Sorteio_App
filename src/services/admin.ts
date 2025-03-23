import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserRole, SalesData } from '../types/user';
import type { Order } from '../types/order';
import { updateOrderPayment } from './orders';

export const fetchSalesReport = async () => {
  try {
    // Buscar pedidos
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    // Dados agregados
    const allOrders: Order[] = [];
    const soldNumbers: string[] = [];
    const sellerMap: Map<string, number> = new Map();
    const buyers: Set<string> = new Set();
    
    // Processar cada pedido
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      const order = {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      } as Order;
      
      allOrders.push(order);
      
      // Adicionar números vendidos
      if (Array.isArray(order.generatedNumbers)) {
        soldNumbers.push(...order.generatedNumbers);
      }
      
      // Contar vendas por vendedor
      const sellerId = order.sellerId;
      sellerMap.set(sellerId, (sellerMap.get(sellerId) || 0) + 1);
      
      // Adicionar comprador à lista
      buyers.add(order.buyerName);
    });
    
    // Preparar dados de relatório
    return {
      totalOrders: allOrders.length,
      totalSoldNumbers: soldNumbers.length,
      uniqueBuyers: buyers.size,
      soldNumbers,
      recentOrders: allOrders.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      ).slice(0, 10),
      topSellers: Array.from(sellerMap.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
    
  } catch (error) {
    console.error('Erro ao buscar relatórios de vendas:', error);
    throw new Error('Não foi possível carregar os relatórios de vendas.');
  }
};

export const fetchUserSalesData = async (): Promise<Map<string, SalesData>> => {
  try {
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    const userSalesMap = new Map<string, SalesData>();
    
    // Processar cada pedido
    ordersSnapshot.forEach(doc => {
      const data = doc.data() as Order;
      const sellerId = data.sellerId;
      
      if (!userSalesMap.has(sellerId)) {
        userSalesMap.set(sellerId, {
          totalSales: 0,
          soldNumbers: [],
          buyers: []
        });
      }
      
      const userSalesData = userSalesMap.get(sellerId)!;
      userSalesData.totalSales++;
      
      if (Array.isArray(data.generatedNumbers)) {
        userSalesData.soldNumbers.push(...data.generatedNumbers);
      }
      
      userSalesData.buyers.push(data.buyerName);
    });
    
    return userSalesMap;
    
  } catch (error) {
    console.error('Erro ao buscar dados de vendas dos usuários:', error);
    throw new Error('Não foi possível carregar os dados de vendas dos usuários.');
  }
};

export const updateOrderPaymentStatus = async (orderId: string, isPaid: boolean): Promise<boolean> => {
  try {
    return await updateOrderPayment(orderId, isPaid);
  } catch (error) {
    console.error('Erro ao atualizar status de pagamento:', error);
    return false;
  }
};

export const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { role: newRole });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar papel do usuário:', error);
    return false;
  }
};
