import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  MAX_AVAILABLE_NUMBERS, 
  MIN_AVAILABLE_NUMBERS,
  NUMBER_DIGIT_COUNT, 
  MAX_NUMBERS_PER_REQUEST, 
  APP_SEED 
} from '../utils/constants';

/**
 * Função base para buscar números vendidos com ou sem filtros
 * Este é um utilitário interno que consolida a lógica comum
 */
const fetchSoldNumbersBase = async (
  filters?: { 
    afterDate?: Date, 
    limit?: number,
    sellerId?: string
  }
): Promise<string[]> => {
  try {
    // Iniciar construção da query base
    let ordersRef = collection(db, 'orders');
    let ordersQuery = query(ordersRef);
    
    // Adicionar filtros condicionalmente
    if (filters) {
      const conditions = [];
      
      if (filters.afterDate) {
        conditions.push(where('createdAt', '>', filters.afterDate));
      }
      
      if (filters.sellerId) {
        // Verificar tanto sellerId quanto originalSellerId
        // Este é um caso especial que precisa de OR lógico
        const sellerQuery1 = query(ordersRef, where('sellerId', '==', filters.sellerId));
        const sellerQuery2 = query(ordersRef, where('originalSellerId', '==', filters.sellerId));

        // Executar ambas as consultas
        const [snapshot1, snapshot2] = await Promise.all([
          getDocs(sellerQuery1),
          getDocs(sellerQuery2)
        ]);
        
        // Combinar e processar resultados
        const docs = [...snapshot1.docs, ...snapshot2.docs];
        const soldNumbers: string[] = [];
        
        docs.forEach(doc => {
          const orderData = doc.data();
          if (orderData.generatedNumbers && Array.isArray(orderData.generatedNumbers)) {
            soldNumbers.push(...orderData.generatedNumbers);
          }
        });
        
        // Aplicar limit se especificado
        if (filters.limit && soldNumbers.length > filters.limit) {
          return soldNumbers.slice(0, filters.limit);
        }
        
        return soldNumbers;
      }
      
      // Construir query composta se temos condições adicionais
      if (conditions.length > 0) {
        ordersQuery = query(ordersRef, ...conditions);
      }
    }
    
    // Executar a consulta
    const ordersSnapshot = await getDocs(ordersQuery);
    
    const soldNumbers: string[] = [];
    
    // Processar resultados da consulta
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      if (orderData.generatedNumbers && Array.isArray(orderData.generatedNumbers)) {
        soldNumbers.push(...orderData.generatedNumbers);
      }
    });
    
    // Aplicar limit se especificado
    if (filters?.limit && soldNumbers.length > filters.limit) {
      return soldNumbers.slice(0, filters.limit);
    }
    
    return soldNumbers;
  } catch (err) {
    console.error('Erro ao buscar números vendidos:', err);
    throw new Error('Não foi possível verificar os números já vendidos.');
  }
};

/**
 * Busca todos os números já vendidos diretamente do Firestore sem usar cache
 */
export const fetchSoldNumbers = async (): Promise<string[]> => {
  return fetchSoldNumbersBase();
};

/**
 * Busca números vendidos com filtros específicos, como por data
 */
export const fetchSoldNumbersWithFilters = async (
  afterDate?: Date,
  limit?: number,
  sellerId?: string
): Promise<string[]> => {
  return fetchSoldNumbersBase({ afterDate, limit, sellerId });
};

/**
 * Gera um número formatado com zeros à esquerda
 * Implementação melhorada com mais entropia
 */
export const generateFormattedNumber = (): string => {
  // Usando crypto se disponível para melhor aleatoriedade
  let randomValue: number;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    randomValue = array[0];
  } else {
    // Adicionar entropia extra ao gerador se crypto não está disponível
    const timestamp = Date.now();
    const randomSeed = timestamp ^ (Math.random() * 10000000);
    
    // Combinar com a semente da aplicação para melhor distribuição
    const combinedSeed = APP_SEED + randomSeed.toString();
    
    // Algoritmo Fisher-Yates para gerar número com melhor entropia
    let hash = 0;
    for (let i = 0; i < combinedSeed.length; i++) {
      hash = ((hash << 5) - hash) + combinedSeed.charCodeAt(i);
      hash = hash & hash; // Converter para inteiro 32 bits
    }
    
    randomValue = Math.abs(hash);
  }
  
  // Garantir número positivo e dentro da faixa (MIN a MAX)
  const randomNum = (randomValue % (MAX_AVAILABLE_NUMBERS - MIN_AVAILABLE_NUMBERS + 1)) + MIN_AVAILABLE_NUMBERS;
  
  // Formatar para ter exatamente o número correto de dígitos com zeros à esquerda
  return randomNum.toString().padStart(NUMBER_DIGIT_COUNT, '0');
};

/**
 * Verifica se um formato de número é válido de acordo com os padrões do sistema
 * @param number Número a ser validado
 * @returns Verdadeiro se o número está no formato correto
 */
export const isValidNumberFormat = (number: string): boolean => {
  // Verificar se é uma string de exatamente o número correto de dígitos numéricos
  const validFormatRegex = new RegExp(`^\\d{${NUMBER_DIGIT_COUNT}}$`);
  
  // Verificar se está dentro do intervalo permitido
  const numericValue = parseInt(number, 10);
  
  return (
    validFormatRegex.test(number) && 
    numericValue >= MIN_AVAILABLE_NUMBERS && 
    numericValue <= MAX_AVAILABLE_NUMBERS
  );
};

/**
 * Formata um número para o padrão do sorteio
 * @param number Número a ser formatado
 * @returns Número formatado com zeros à esquerda
 */
export const formatRaffleNumber = (number: string | number): string => {
  const numStr = typeof number === 'number' ? number.toString() : number;
  
  // Limpar caracteres não numéricos
  const cleaned = numStr.replace(/\D/g, '');
  
  // Converter para número e garantir que está no intervalo válido
  const numericValue = parseInt(cleaned, 10) || 0;
  if (numericValue < MIN_AVAILABLE_NUMBERS || numericValue > MAX_AVAILABLE_NUMBERS) {
    throw new Error(`Número fora do intervalo permitido (${MIN_AVAILABLE_NUMBERS}-${MAX_AVAILABLE_NUMBERS}): ${numericValue}`);
  }
  
  // Formatar para ter exatamente o número correto de dígitos com zeros à esquerda
  return numericValue.toString().padStart(NUMBER_DIGIT_COUNT, '0');
};

/**
 * Gera múltiplos números únicos de forma segura e eficiente
 * @param count Quantidade de números a gerar
 */
export const generateUniqueNumbers = async (count: number): Promise<string[]> => {
  // Validação adicional de entrada para prevenir abuso
  if (count <= 0 || count > MAX_NUMBERS_PER_REQUEST) {
    throw new Error(`Quantidade inválida. Deve estar entre 1 e ${MAX_NUMBERS_PER_REQUEST}.`);
  }
  
  // Verificar se temos números suficientes disponíveis no sistema
  const soldNumbers = await fetchSoldNumbers();
  if (soldNumbers.length >= MAX_AVAILABLE_NUMBERS) {
    throw new Error(`Todos os ${MAX_AVAILABLE_NUMBERS} números já foram vendidos!`);
  }
  
  if (soldNumbers.length + count > MAX_AVAILABLE_NUMBERS) {
    throw new Error(`Não há números suficientes disponíveis. Restam apenas ${MAX_AVAILABLE_NUMBERS - soldNumbers.length} números.`);
  }
  
  // Log para auditoria
  console.log(`[AUDIT] Iniciando geração de ${count} números. Timestamp: ${new Date().toISOString()}`);
  
  // Criar um Set para verificação eficiente (O(1) ao invés de O(n))
  const soldNumbersSet = new Set(soldNumbers);
  const generatedNumbers = new Set<string>();
  
  // Tentar gerar números únicos com limite de tentativas adaptativo
  let attempts = 0;
  const maxAttempts = Math.min(count * 10, MAX_AVAILABLE_NUMBERS); // Limite razoável e adaptativo
  
  while (generatedNumbers.size < count && attempts < maxAttempts) {
    const newNumber = generateFormattedNumber();
    
    // Adicionar apenas se não estiver nos números vendidos e ainda não gerados
    if (!soldNumbersSet.has(newNumber) && !generatedNumbers.has(newNumber)) {
      generatedNumbers.add(newNumber);
    }
    
    attempts++;
    
    // Se estivermos com muitas tentativas sem sucesso, estratégia alternativa
    if (attempts > count * 5 && generatedNumbers.size < count / 2) {
      // Abordagem diferente: gerar sequencialmente a partir de um número aleatório
      const startingPoint = Math.floor(Math.random() * MAX_AVAILABLE_NUMBERS) + 1;
      let currentNumber = startingPoint;
      
      // Buscar sequencialmente até o final
      while (generatedNumbers.size < count && currentNumber <= MAX_AVAILABLE_NUMBERS) {
        const formattedNum = currentNumber.toString().padStart(NUMBER_DIGIT_COUNT, '0');
        if (!soldNumbersSet.has(formattedNum) && !generatedNumbers.has(formattedNum)) {
          generatedNumbers.add(formattedNum);
        }
        currentNumber++;
      }
      
      // Se ainda precisamos de mais números, começar do 1
      currentNumber = 1;
      while (generatedNumbers.size < count && currentNumber < startingPoint) {
        const formattedNum = currentNumber.toString().padStart(NUMBER_DIGIT_COUNT, '0');
        if (!soldNumbersSet.has(formattedNum) && !generatedNumbers.has(formattedNum)) {
          generatedNumbers.add(formattedNum);
        }
        currentNumber++;
      }
      
      break; // Sair do loop principal
    }
  }
  
  // Verificar se conseguimos gerar todos os números necessários
  if (generatedNumbers.size < count) {
    throw new Error(`Não foi possível gerar ${count} números únicos após ${attempts} tentativas.`);
  }
  
  // Converter Set para Array e retornar
  const result = Array.from(generatedNumbers);
  console.log(`[AUDIT] Geração concluída. ${result.length} números gerados após ${attempts} tentativas.`);
  
  return result;
};

/**
 * Verifica se um número está disponível
 */
export const isNumberAvailable = async (number: string): Promise<boolean> => {
  // Validar formato do número primeiro
  if (!isValidNumberFormat(number)) {
    throw new Error(`Formato de número inválido: ${number}`);
  }
  
  // Verificar se o número já foi vendido
  const soldNumbers = await fetchSoldNumbers();
  return !soldNumbers.includes(number);
};

/**
 * Retorna a contagem de números disponíveis
 * Calcula a diferença entre o máximo e o número de vendidos
 */
export const getAvailableNumbersCount = async (): Promise<number> => {
  try {
    // Obter números vendidos
    const soldNumbers = await fetchSoldNumbers();
    
    // Calcular disponíveis (máximo menos vendidos)
    const availableCount = MAX_AVAILABLE_NUMBERS - soldNumbers.length;
    
    return Math.max(0, availableCount); // Garante que não retornamos número negativo
  } catch (err) {
    console.error('Erro ao obter contagem de números disponíveis:', err);
    throw new Error('Não foi possível verificar quantos números estão disponíveis.');
  }
};

/**
 * Implementação otimizada para inicializar a coleção de números disponíveis
 * Esta função cria uma referência de todos os números disponíveis no sistema
 */
export const initAvailableNumbersCollection = async (): Promise<void> => {
  try {
    // 1. Buscar números já vendidos (utilizando função base já existente)
    const soldNumbers = await fetchSoldNumbers();
    const soldSet = new Set(soldNumbers);
    
    console.log(`Iniciando geração de ${MAX_AVAILABLE_NUMBERS - soldSet.size} números disponíveis`);
    
    // 2. Criar referência à coleção de disponíveis
    const availableRef = collection(db, 'available_numbers');
    
    // 3. Processar em batches com tamanho ótimo para Firestore
    const BATCH_SIZE = 500; // Máximo recomendado pelo Firestore
    let batchCount = 0;
    let currentBatch = writeBatch(db);
    let processedCount = 0;
    
    // Função auxiliar para commitar batch atual e criar nova
    const commitAndCreateNewBatch = async () => {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      batchCount = 0;
      
      // Pequena pausa para evitar sobrecarregar o Firestore
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`Processados ${processedCount} números`);
    };
    
    // 4. Usar abordagem de incremento para processar apenas números disponíveis
    for (let i = MIN_AVAILABLE_NUMBERS; i <= MAX_AVAILABLE_NUMBERS; i++) {
      const formattedNumber = i.toString().padStart(NUMBER_DIGIT_COUNT, '0');
      
      // Pular números já vendidos
      if (soldSet.has(formattedNumber)) {
        continue;
      }
      
      // Adicionar ao batch atual
      const numRef = doc(availableRef, formattedNumber);
      currentBatch.set(numRef, {
        number: formattedNumber,
        available: true,
        createdAt: serverTimestamp()
      });
      
      batchCount++;
      processedCount++;
      
      // Se atingir o limite de batch, comitar e criar novo
      if (batchCount >= BATCH_SIZE) {
        await commitAndCreateNewBatch();
      }
    }
    
    // Comitar última batch se tiver algo
    if (batchCount > 0) {
      await currentBatch.commit();
    }
    
    // 5. Criar um documento de metadata para rastrear última sincronização
    await setDoc(doc(db, 'system', 'numbers_metadata'), {
      lastSync: serverTimestamp(),
      totalAvailable: MAX_AVAILABLE_NUMBERS - soldNumbers.length,
      totalSold: soldNumbers.length,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Coleção de números disponíveis inicializada com ${MAX_AVAILABLE_NUMBERS - soldNumbers.length} números`);
  } catch (err) {
    console.error('Erro ao inicializar coleção de números disponíveis:', err);
    throw new Error('Não foi possível inicializar o sistema de números.');
  }
};

/**
 * Versão otimizada da sincronização de números disponíveis com vendidos
 * Remove os números vendidos da coleção de disponíveis
 */
export const syncAvailableNumbersWithSoldOnes = async (): Promise<void> => {
  try {
    console.log('Iniciando sincronização de números...');
    
    // 1. Buscar números já vendidos usando a função base otimizada
    const soldNumbers = await fetchSoldNumbers();
    
    if (soldNumbers.length === 0) {
      console.log('Nenhum número vendido para sincronizar');
      
      // Atualizar metadata mesmo sem mudanças
      await updateDoc(doc(db, 'system', 'numbers_metadata'), {
        lastSync: serverTimestamp(),
        totalAvailable: MAX_AVAILABLE_NUMBERS,
        totalSold: 0,
        updatedAt: serverTimestamp()
      });
      
      return;
    }
    
    console.log(`Encontrados ${soldNumbers.length} números vendidos para sincronizar`);
    
    // 2. Referência à coleção de números disponíveis
    const availableRef = collection(db, 'available_numbers');
    
    // 3. Processar em batches com tamanho ideal
    const BATCH_SIZE = 500;
    let batchCount = 0;
    let currentBatch = writeBatch(db);
    let processedCount = 0;
    
    // Processar cada número vendido para remover da lista de disponíveis
    for (const number of soldNumbers) {
      const numRef = doc(availableRef, number);
      currentBatch.delete(numRef);
      
      batchCount++;
      processedCount++;
      
      // Se atingir o limite de batch, comitar e criar novo
      if (batchCount >= BATCH_SIZE) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        batchCount = 0;
        
        // Pausa para evitar sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`Processados ${processedCount} números`);
      }
    }
    
    // Comitar última batch se tiver algo
    if (batchCount > 0) {
      await currentBatch.commit();
    }
    
    // 4. Atualizar metadata
    await updateDoc(doc(db, 'system', 'numbers_metadata'), {
      lastSync: serverTimestamp(),
      totalAvailable: MAX_AVAILABLE_NUMBERS - soldNumbers.length,
      totalSold: soldNumbers.length,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Sincronização concluída. Removidos ${soldNumbers.length} números vendidos da coleção de disponíveis`);
  } catch (err) {
    console.error('Erro ao sincronizar números vendidos:', err);
    throw new Error('Não foi possível sincronizar os números vendidos.');
  }
};
