import { collection, getDocs, doc, getDoc, updateDoc, writeBatch, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from '../types/user';
import type { SalesData } from '../types/user';
import type { Order } from '../types/order';
import { updateOrderPayment } from './orders';
import { syncAvailableNumbersWithSoldOnes } from './raffleNumbers';
import { saveToCache, getFromCache } from './reportCache';

/**
 * Interface para relatórios comparativos entre períodos
 */
export interface ComparativeSalesReport {
  current: {
    totalSales: number;
    salesByDay: Record<string, number>;
    uniqueBuyers: number;
    uniqueSellers: number;
    totalOrders: number;
  };
  previous: {
    totalSales: number;
    salesByDay: Record<string, number>;
    uniqueBuyers: number;
    uniqueSellers: number;
    totalOrders: number;
  };
  growth: {
    salesGrowth: number;
    buyersGrowth: number;
    sellersGrowth: number;
    ordersGrowth: number;
  };
  topSellers: Array<{
    id: string;
    name: string;
    count: number;
    growth: number;
  }>;
  paymentMethodDistribution: Record<string, number>;
}

export const fetchSalesReport = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    const allOrders: Order[] = [];
    const soldNumbers: string[] = [];
    const sellerMap: Map<string, number> = new Map();
    const buyers: Set<string> = new Set();
    
    ordersSnapshot.forEach(doc => {
      const data = doc.data();
      const order = {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
      } as Order;
      
      allOrders.push(order);
      
      if (Array.isArray(order.generatedNumbers)) {
        soldNumbers.push(...order.generatedNumbers);
      }
      
      const sellerId = order.originalSellerId || order.sellerId;
      sellerMap.set(sellerId, (sellerMap.get(sellerId) || 0) + 1);
      
      buyers.add(order.buyerName);
    });
    
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
    
    ordersSnapshot.forEach(doc => {
      const data = doc.data() as Order;
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
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('Usuário não encontrado ao atualizar papel');
      return false;
    }
    
    const userData = userDoc.data();
    const hasAffiliates = userData.affiliates && userData.affiliates.length > 0;
    
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
    
    const ordersRef = collection(db, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    
    if (ordersSnapshot.empty) {
      console.log('Nenhum pedido encontrado para excluir');
      return true;
    }
    
    const batchSize = 450;
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;
    
    console.log(`Encontrados ${ordersSnapshot.size} pedidos para excluir`);
    
    for (const doc of ordersSnapshot.docs) {
      batch.delete(doc.ref);
      count++;
      totalDeleted++;
      
      if (count >= batchSize) {
        await batch.commit();
        console.log(`Lote de ${count} documentos excluídos`);
        batch = writeBatch(db);
        count = 0;
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (count > 0) {
      await batch.commit();
      console.log(`Último lote com ${count} documentos excluídos`);
    }
    
    console.log(`Reset completado: ${totalDeleted} vendas excluídas`);
    
    await syncAvailableNumbersWithSoldOnes();
    
    return true;
  } catch (error) {
    console.error('Erro ao resetar vendas:', error);
    throw new Error('Não foi possível resetar as vendas. Tente novamente mais tarde.');
  }
};

/**
 * Recupera dados de relatórios com suporte a cache
 * @param dateRange Intervalo de datas para o relatório
 * @param forceRefresh Força atualização mesmo se existir cache
 * @returns Dados do relatório
 */
export const fetchSalesReportWithDateRange = async (
  dateRange: { startDate: Date; endDate: Date; cacheKey: string },
  forceRefresh = false
): Promise<ComparativeSalesReport> => {
  const { cacheKey } = dateRange;
  
  if (!forceRefresh) {
    const cachedData = getFromCache<ComparativeSalesReport>(cacheKey);
    if (cachedData) {
      console.log('[Admin] Usando dados em cache para relatório:', cacheKey);
      return cachedData;
    }
  }
  
  console.log('[Admin] Buscando dados de relatório do Firestore para:', cacheKey);
  
  const { startDate, endDate } = dateRange;
  const duration = endDate.getTime() - startDate.getTime();
  const previousStartDate = new Date(startDate.getTime() - duration);
  const previousEndDate = new Date(endDate.getTime() - duration);
  
  try {
    const currentPeriodData = await fetchRawOrdersForPeriod(startDate, endDate);
    const previousPeriodData = await fetchRawOrdersForPeriod(previousStartDate, previousEndDate);
    const report = processOrderDataForComparison(currentPeriodData, previousPeriodData);
    saveToCache(cacheKey, report);
    return report;
  } catch (error) {
    console.error('[Admin] Erro ao buscar relatório de vendas:', error);
    throw new Error('Não foi possível obter os dados de relatório. Tente novamente mais tarde.');
  }
};

/**
 * Busca pedidos brutos para um período específico
 */
const fetchRawOrdersForPeriod = async (startDate: Date, endDate: Date): Promise<any[]> => {
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setHours(23, 59, 59, 999);
  
  const ordersRef = collection(db, 'orders');
  const q = query(
    ordersRef,
    where('createdAt', '>=', startDate),
    where('createdAt', '<=', adjustedEndDate),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Admin] Erro ao buscar pedidos para período:', error);
    throw error;
  }
};

/**
 * Processa dados brutos de pedidos para gerar relatório comparativo
 */
const processOrderDataForComparison = (
  currentPeriodOrders: any[],
  previousPeriodOrders: any[]
): ComparativeSalesReport => {
  const current = processOrdersForPeriod(currentPeriodOrders);
  const previous = processOrdersForPeriod(previousPeriodOrders);
  
  const salesGrowth = calculateGrowthRate(current.totalSales, previous.totalSales);
  const buyersGrowth = calculateGrowthRate(current.uniqueBuyers, previous.uniqueBuyers);
  const sellersGrowth = calculateGrowthRate(current.uniqueSellers, previous.uniqueSellers);
  const ordersGrowth = calculateGrowthRate(current.totalOrders, previous.totalOrders);
  
  const topSellers = processTopSellers(currentPeriodOrders, previousPeriodOrders);
  const paymentMethodDistribution = processPaymentMethods(currentPeriodOrders);
  
  return {
    current,
    previous,
    growth: {
      salesGrowth,
      buyersGrowth,
      sellersGrowth,
      ordersGrowth
    },
    topSellers,
    paymentMethodDistribution
  };
};

/**
 * Processa pedidos para um período específico
 */
const processOrdersForPeriod = (orders: any[]) => {
  let totalSales = 0;
  const uniqueBuyerIds = new Set<string>();
  const uniqueSellerIds = new Set<string>();
  const salesByDay: Record<string, number> = {};
  
  orders.forEach(order => {
    const numbersSold = order.generatedNumbers?.length || 0;
    totalSales += numbersSold;
    
    if (order.buyerId) uniqueBuyerIds.add(order.buyerId);
    if (order.sellerId) uniqueSellerIds.add(order.sellerId);
    
    const date = order.createdAt instanceof Date ? 
      order.createdAt : 
      (order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt));
    
    const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    
    if (!salesByDay[dayKey]) {
      salesByDay[dayKey] = 0;
    }
    salesByDay[dayKey] += numbersSold;
  });
  
  return {
    totalSales,
    uniqueBuyers: uniqueBuyerIds.size,
    uniqueSellers: uniqueSellerIds.size,
    totalOrders: orders.length,
    salesByDay
  };
};

/**
 * Calcula taxa de crescimento entre dois valores
 */
const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

/**
 * Processa top vendedores com métricas de crescimento
 */
const processTopSellers = (currentOrders: any[], previousOrders: any[]) => {
  const currentSellerSales: Record<string, { count: number; name: string }> = {};
  
  currentOrders.forEach(order => {
    if (!order.sellerId) return;
    
    const sellerId = order.sellerId;
    const sellerName = order.sellerName || 'Desconhecido';
    const numbersSold = order.generatedNumbers?.length || 0;
    
    if (!currentSellerSales[sellerId]) {
      currentSellerSales[sellerId] = { count: 0, name: sellerName };
    }
    
    currentSellerSales[sellerId].count += numbersSold;
  });
  
  const previousSellerSales: Record<string, number> = {};
  
  previousOrders.forEach(order => {
    if (!order.sellerId) return;
    
    const sellerId = order.sellerId;
    const numbersSold = order.generatedNumbers?.length || 0;
    
    if (!previousSellerSales[sellerId]) {
      previousSellerSales[sellerId] = 0;
    }
    
    previousSellerSales[sellerId] += numbersSold;
  });
  
  const sellersWithGrowth = Object.keys(currentSellerSales).map(id => {
    const current = currentSellerSales[id].count;
    const previous = previousSellerSales[id] || 0;
    const growth = calculateGrowthRate(current, previous);
    
    return {
      id,
      name: currentSellerSales[id].name,
      count: current,
      growth
    };
  });
  
  return sellersWithGrowth
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

/**
 * Processa distribuição de métodos de pagamento
 */
const processPaymentMethods = (orders: any[]): Record<string, number> => {
  const methods: Record<string, number> = {
    pix: 0,
    cash: 0,
    other: 0
  };
  
  orders.forEach(order => {
    const method = order.paymentMethod || 'other';
    
    if (method === 'pix') {
      methods.pix += 1;
    } else if (method === 'cash' || method === 'dinheiro') {
      methods.cash += 1;
    } else {
      methods.other += 1;
    }
  });
  
  return methods;
};

