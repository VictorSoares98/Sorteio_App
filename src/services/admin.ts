import { collection, getDocs, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from '../types/user';
import type { SalesData } from '../types/user';
import type { Order } from '../types/order';
import { updateOrderPayment } from './orders';
import { syncAvailableNumbersWithSoldOnes } from './raffleNumbers';

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
      
      // Extrair o ID do vendedor para contagem, preferindo originalSellerId se disponível
      const sellerId = order.originalSellerId || order.sellerId;
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
      // Usar originalSellerId se disponível, caso contrário usa sellerId
      const sellerId = data.originalSellerId || data.sellerId;
      
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
    // Verificar se o usuário tem afiliados antes de permitir papel administrativo
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('Usuário não encontrado ao atualizar papel');
      return false;
    }
    
    const userData = userDoc.data();
    const hasAffiliates = userData.affiliates && userData.affiliates.length > 0;
    
    // Se estiver tentando atribuir papel administrativo a usuário sem afiliados
    if (!hasAffiliates && 
        (newRole === UserRole.ADMIN || 
         newRole === UserRole.SECRETARIA || 
         newRole === UserRole.TESOUREIRO)) {
      console.warn('Tentativa de atribuir papel administrativo a usuário sem afiliados');
      return false;
    }
    
    await updateDoc(userRef, { role: newRole });
    return true;
  } catch (error) {
    console.error('Erro ao atualizar papel do usuário:', error);
    return false;
  }
};

/**
 * Reseta todas as vendas do sistema
 * Esta é uma operação destrutiva que remove todos os pedidos
 */
export const resetAllSales = async (): Promise<boolean> => {
  try {
    console.log('Iniciando processo de reset de vendas');
    
    // 1. Obter referência à coleção de pedidos
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    if (ordersSnapshot.empty) {
      console.log('Nenhum pedido encontrado para excluir');
      return true;
    }
    
    // 2. Excluir todos os documentos em lotes
    const batchSize = 450; // Firestore tem limite de 500 operações por lote
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;
    
    console.log(`Encontrados ${ordersSnapshot.size} pedidos para excluir`);
    
    for (const doc of ordersSnapshot.docs) {
      batch.delete(doc.ref);
      count++;
      totalDeleted++;
      
      // Se atingir o tamanho do lote, comitar e criar novo lote
      if (count >= batchSize) {
        await batch.commit();
        console.log(`Lote de ${count} documentos excluídos`);
        batch = writeBatch(db);
        count = 0;
        
        // Pequena pausa para evitar sobrecarregar o Firestore
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Comitar o último lote se tiver operações pendentes
    if (count > 0) {
      await batch.commit();
      console.log(`Último lote com ${count} documentos excluídos`);
    }
    
    console.log(`Reset completado: ${totalDeleted} vendas excluídas`);
    
    // 3. Atualizar a coleção de números disponíveis para refletir que todos estão disponíveis novamente
    await syncAvailableNumbersWithSoldOnes();
    
    return true;
  } catch (error) {
    console.error('Erro ao resetar vendas:', error);
    throw new Error('Não foi possível resetar as vendas. Tente novamente mais tarde.');
  }
}

