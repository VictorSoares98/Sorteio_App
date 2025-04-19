import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Interface para dados do sorteio
export interface RaffleData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  raffleDate: string;
  price: number;
  isCompleted: boolean;
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
    const raffleRef = doc(db, 'raffles', RAFFLE_DOC_ID);
    const raffleSnap = await getDoc(raffleRef);
    
    if (raffleSnap.exists()) {
      return raffleSnap.data() as RaffleData;
    } else {
      console.log('Nenhum sorteio encontrado');
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar dados do sorteio:', error);
    throw new Error('Não foi possível carregar os dados do sorteio.');
  }
};

/**
 * Salva um novo sorteio ou atualiza o existente
 * @param raffleData Dados do sorteio
 * @returns Promise que resolve quando a operação for concluída
 */
export const saveRaffleData = async (raffleData: RaffleData): Promise<void> => {
  try {
    const raffleRef = doc(db, 'raffles', RAFFLE_DOC_ID);
    
    // Verificar se o sorteio já existe
    const raffleSnap = await getDoc(raffleRef);
    
    if (raffleSnap.exists()) {
      // Atualizar sorteio existente
      await updateDoc(raffleRef, {
        ...raffleData,
        updatedAt: serverTimestamp()
      });
    } else {
      // Criar novo sorteio
      await setDoc(raffleRef, {
        ...raffleData,
        id: RAFFLE_DOC_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Erro ao salvar dados do sorteio:', error);
    throw new Error('Não foi possível salvar os dados do sorteio.');
  }
};
