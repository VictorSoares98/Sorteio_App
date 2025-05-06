import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, addDoc, deleteDoc, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../firebase';

// Interface para dados do sorteio
export interface RaffleData {
  createdBy: any;
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  raffleDate: string;
  raffleTime?: string | null; // Horário específico do sorteio
  price: number;
  isCompleted: boolean;
  isActive: boolean; // Novo campo para definir o sorteio ativo
  winningNumber?: string | null;
  winner?: {
    name: string;
    phone: string;
    congregation: string;
  } | null;
  seller?: {
    id: string;
    name: string;
    photoURL: string;
  } | null;
  updatedAt?: any;
  createdAt?: any;
  visibility?: 'universal' | 'private' | 'affiliates' | 'admin';
  isCancelled?: boolean;
  isPaused?: boolean;
  cancelReason?: string;
  pauseReason?: string;
}

// ID do documento do sorteio no Firestore
const RAFFLE_DOC_ID = 'current_raffle';

/**
 * Converte uma imagem para base64
 * @param file Arquivo de imagem
 * @returns Promise com a string base64
 */
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Falha ao converter imagem para base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Busca os dados do sorteio atual
 * @returns Promise com os dados do sorteio ou null se não existir
 */
export const fetchRaffleData = async (): Promise<RaffleData | null> => {
  try {
    // Buscar o sorteio marcado como ativo
    const rafflesRef = collection(db, 'raffles');
    const q = query(rafflesRef, orderBy('updatedAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const raffleDoc = querySnapshot.docs[0];
      return { id: raffleDoc.id, ...raffleDoc.data() } as RaffleData;
    }
    
    // Retornar o legado se não encontrar na coleção
    const legacyRaffleRef = doc(db, 'raffles', RAFFLE_DOC_ID);
    const legacyRaffleSnap = await getDoc(legacyRaffleRef);
    
    if (legacyRaffleSnap.exists()) {
      return legacyRaffleSnap.data() as RaffleData;
    }
    
    console.log('Nenhum sorteio encontrado');
    return null;
  } catch (error) {
    console.error('Erro ao buscar dados do sorteio:', error);
    throw new Error('Não foi possível carregar os dados do sorteio.');
  }
};

/**
 * Busca um sorteio específico pelo ID
 * @param raffleId ID do sorteio
 * @returns Promise com os dados do sorteio ou null se não existir
 */
export const fetchRaffleById = async (raffleId: string): Promise<RaffleData | null> => {
  try {
    const raffleRef = doc(db, 'raffles', raffleId);
    const raffleSnap = await getDoc(raffleRef);
    
    if (raffleSnap.exists()) {
      return { id: raffleSnap.id, ...raffleSnap.data() } as RaffleData;
    }
    
    return null;
  } catch (error) {
    console.error(`Erro ao buscar sorteio ${raffleId}:`, error);
    throw new Error('Não foi possível carregar os dados do sorteio.');
  }
};

/**
 * Busca todos os sorteios com filtros de visibilidade
 * @param activeOnly Se true, retorna apenas sorteios ativos
 * @param userId ID do usuário atual
 * @param userAffiliationId ID da afiliação do usuário (se houver)
 * @param isAdmin Se o usuário é administrador
 * @returns Promise com array de sorteios filtrados por visibilidade
 */
export const fetchAllRaffles = async (
  activeOnly: boolean = false,
  userId: string | null = null,
  userAffiliationId: string | null = null,
  isAdmin: boolean = false
): Promise<RaffleData[]> => {
  try {
    const rafflesRef = collection(db, 'raffles');
    const q = query(rafflesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const raffles: RaffleData[] = [];
    
    console.log(`[raffle] Encontrados ${querySnapshot.size} sorteios no banco de dados`);
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const raffle = { id: doc.id, ...data } as RaffleData;
      
      // Log para debug
      console.log(`[raffle] Processando sorteio: ${raffle.id}, título: ${raffle.title}, visibilidade: ${raffle.visibility || 'não definida'}, criador: ${raffle.createdBy || 'não definido'}`);
      
      // Filtro por 'active only'
      if (activeOnly && !raffle.isActive) return;
      
      // Se não tiver visibilidade definida, considerar como universal (retrocompatibilidade)
      if (!raffle.visibility) {
        raffle.visibility = 'universal';
      }
      
      // Regras de visibilidade:
      // 1. Sorteios universais são visíveis para todos
      if (raffle.visibility === 'universal') {
        raffles.push(raffle);
        return;
      }
      
      // 2. Admins veem seus próprios sorteios e sorteios de sua rede de afiliação
      if (isAdmin && userId) {
        if (raffle.createdBy === userId) {
          raffles.push(raffle);
          return;
        }
      }
      
      // 3. Verificação de afiliação
      if (userAffiliationId && raffle.createdBy === userAffiliationId) {
        raffles.push(raffle); // Sorteio criado pelo afiliador do usuário
        return;
      }

      // 4. Sempre mostrar sorteios próprios para o criador
      if (userId && raffle.createdBy === userId) {
        raffles.push(raffle);
        return;
      }
      
      // 5. Se é admin e não caiu em nenhuma regra anterior, permite ver
      if (isAdmin) {
        raffles.push(raffle);
        return;
      }
    });
    
    console.log(`[raffle] Retornando ${raffles.length} sorteios após filtragem`);
    return raffles;
  } catch (error) {
    console.error('Erro ao buscar sorteios:', error);
    throw new Error('Não foi possível carregar a lista de sorteios.');
  }
};

/**
 * Verifica se um sorteio possui vendas registradas
 * @param raffleId ID do sorteio
 * @returns Promise<boolean> indicando se há vendas
 */
export const checkIfRaffleHasSales = async (raffleId: string): Promise<boolean> => {
  try {
    // Consultar coleção de pedidos (orders) que contenham o ID do sorteio
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, 
      where('raffleId', '==', raffleId),
      // Considerar apenas pedidos não cancelados
      where('status', 'not-in', ['cancelled'])
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error(`Erro ao verificar vendas do sorteio ${raffleId}:`, error);
    // Em caso de erro, assumir que há vendas (por segurança)
    return true;
  }
};

/**
 * Salva um novo sorteio ou atualiza o existente
 * @param raffleData Dados do sorteio
 * @param userId ID do usuário que está realizando a operação
 * @returns Promise que resolve quando a operação for concluída
 */
export const saveRaffleData = async (raffleData: RaffleData, userId?: string): Promise<void> => {
  try {
    if (raffleData.id) {
      // Verificar permissão para sorteios existentes com visibilidade universal
      if (raffleData.visibility === 'universal' && userId) {
        // Buscar dados originais do sorteio
        const existingRaffle = await fetchRaffleById(raffleData.id);
        
        if (existingRaffle) {
          // Converter explicitamente para string para garantir comparação adequada
          const existingCreatedBy = String(existingRaffle.createdBy || '');
          const currentUserId = String(userId || '');
          
          // Log detalhado para debug
          if (process.env.NODE_ENV === 'development') {
            console.log(`[RaffleService] Verificação de permissão para sorteio ${raffleData.id}:`, {
              existingCreatedBy,
              currentUserId,
              isMatch: existingCreatedBy === currentUserId,
              raffleVisibility: existingRaffle.visibility
            });
          }
          
          if (existingRaffle.visibility === 'universal' && existingCreatedBy !== currentUserId) {
            throw new Error('Apenas o criador pode editar sorteios com visibilidade universal');
          }
        }
        
        // Se está tentando mudar a visibilidade de universal para outra
        if (existingRaffle && 
            existingRaffle.visibility === 'universal' && 
            raffleData.visibility !== 'universal') {
          
          // Verificar se tem vendas
          const hasSales = await checkIfRaffleHasSales(raffleData.id);
          if (hasSales) {
            throw new Error('Não é possível alterar a visibilidade de um sorteio com vendas registradas');
          }
        }
      }
      
      // Atualizar sorteio existente
      const raffleRef = doc(db, 'raffles', raffleData.id);
      await updateDoc(raffleRef, {
        ...raffleData,
        updatedAt: serverTimestamp()
      });
    } else {
      // Criar novo sorteio
      // Remover o campo ID do objeto antes de enviá-lo para o Firestore
      const { id, ...raffleDataWithoutId } = raffleData;
      await addDoc(collection(db, 'raffles'), {
        ...raffleDataWithoutId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Erro ao salvar dados do sorteio:', error);
    throw error instanceof Error ? error : new Error('Não foi possível salvar os dados do sorteio.');
  }
};

/**
 * Cria um novo sorteio
 * @param raffleData Dados do sorteio (parcial)
 * @returns Promise com o ID do novo sorteio
 */
export const createNewRaffle = async (raffleData: Partial<RaffleData>): Promise<string> => {
  try {
    // Garantir que é marcado como não completo ao criar
    const newRaffleData = {
      ...raffleData,
      isCompleted: false,
      isActive: false
    };
    
    const docRef = await addDoc(collection(db, 'raffles'), {
      ...newRaffleData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Erro ao criar novo sorteio:', error);
    throw new Error('Não foi possível criar um novo sorteio.');
  }
};

/**
 * Define um sorteio específico como o ativo
 * @param raffleId ID do sorteio a ser definido como ativo
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export const setActiveRaffle = async (raffleId: string): Promise<boolean> => {
  try {
    // Primeiro, desativar todos os sorteios
    const rafflesRef = collection(db, 'raffles');
    const querySnapshot = await getDocs(rafflesRef);
    
    const batch = Promise.all(querySnapshot.docs.map(doc => {
      return updateDoc(doc.ref, { 
        isActive: doc.id === raffleId,
        updatedAt: serverTimestamp()
      });
    }));
    
    await batch;
    return true;
  } catch (error) {
    console.error('Erro ao definir sorteio ativo:', error);
    throw new Error('Não foi possível ativar o sorteio selecionado.');
  }
};

/**
 * Exclui um sorteio
 * @param raffleId ID do sorteio a ser excluído
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export const deleteRaffle = async (raffleId: string): Promise<boolean> => {
  try {
    // Verificar se o sorteio está ativo
    const raffleData = await fetchRaffleById(raffleId);
    
    if (!raffleData) {
      throw new Error('Sorteio não encontrado.');
    }
    
    if (raffleData?.isActive) {
      throw new Error('Não é possível excluir um sorteio ativo. Defina outro como ativo primeiro.');
    }
    
    // Excluir o sorteio com tratamento de erro melhorado
    try {
      await deleteDoc(doc(db, 'raffles', raffleId));
      return true;
    } catch (error) {
      // Tratamento específico para erros do BloomFilter
      if (error instanceof Error && 
          (error.message.includes('BloomFilter') || 
           error.toString().includes('BloomFilterError'))) {
        console.warn('Erro de BloomFilter detectado durante exclusão:', error);
        throw new Error('Erro de conexão ao excluir o sorteio. Tente novamente em alguns instantes.');
      }
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir sorteio:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Não foi possível excluir o sorteio.');
  }
};

/**
 * Cancela um sorteio
 * @param raffleId ID do sorteio a ser cancelado
 * @param reason Motivo do cancelamento
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export const cancelRaffle = async (raffleId: string, reason: string): Promise<boolean> => {
  try {
    // Verificar se o sorteio existe
    const raffleData = await fetchRaffleById(raffleId);
    
    if (!raffleData) {
      throw new Error('Sorteio não encontrado.');
    }
    
    // Não permitir cancelar um sorteio já concluído
    if (raffleData.isCompleted) {
      throw new Error('Não é possível cancelar um sorteio já concluído.');
    }
    
    // Atualizar o sorteio
    const raffleRef = doc(db, 'raffles', raffleId);
    await updateDoc(raffleRef, {
      isCancelled: true,
      isActive: false, // Desativa automaticamente
      isPaused: false, // Garante que não está pausado
      cancelReason: reason,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao cancelar sorteio:', error);
    throw new Error('Não foi possível cancelar o sorteio: ' + (error as Error).message);
  }
};

/**
 * Pausa um sorteio ativo
 * @param raffleId ID do sorteio a ser pausado
 * @param reason Motivo da pausa
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export const pauseRaffle = async (raffleId: string, reason: string): Promise<boolean> => {
  try {
    // Verificar se o sorteio existe
    const raffleData = await fetchRaffleById(raffleId);
    
    if (!raffleData) {
      throw new Error('Sorteio não encontrado.');
    }
    
    // Não permitir pausar um sorteio já concluído ou já pausado
    if (raffleData.isCompleted) {
      throw new Error('Não é possível pausar um sorteio já concluído.');
    }
    
    if (raffleData.isPaused) {
      throw new Error('Este sorteio já está pausado.');
    }
    
    // Atualizar o sorteio
    const raffleRef = doc(db, 'raffles', raffleId);
    await updateDoc(raffleRef, {
      isPaused: true,
      isActive: false, // Desativa o sorteio ao pausar
      pauseReason: reason,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao pausar sorteio:', error);
    throw new Error('Não foi possível pausar o sorteio: ' + (error as Error).message);
  }
};

/**
 * Retoma um sorteio pausado
 * @param raffleId ID do sorteio a ser retomado
 * @returns Promise<boolean> indicando sucesso ou falha
 */
export const resumeRaffle = async (raffleId: string): Promise<boolean> => {
  try {
    // Verificar se o sorteio existe
    const raffleData = await fetchRaffleById(raffleId);
    
    if (!raffleData) {
      throw new Error('Sorteio não encontrado.');
    }
    
    // Não permitir retomar um sorteio que não está pausado ou já concluído
    if (!raffleData.isPaused) {
      throw new Error('Este sorteio não está pausado.');
    }
    
    if (raffleData.isCompleted) {
      throw new Error('Não é possível retomar um sorteio já concluído.');
    }
    
    // Atualizar o sorteio
    const raffleRef = doc(db, 'raffles', raffleId);
    await updateDoc(raffleRef, {
      isPaused: false,
      isActive: true, // Ativa o sorteio ao retomar
      pauseReason: null,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Erro ao retomar sorteio:', error);
    throw new Error('Não foi possível retomar o sorteio: ' + (error as Error).message);
  }
};