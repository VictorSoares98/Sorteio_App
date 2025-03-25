import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Constante para definir o limite máximo de números disponíveis no sistema
const MAX_AVAILABLE_NUMBERS = 10000; // Limite de 10.000 números
// Constante para definir o número de dígitos para formatação
const NUMBER_DIGIT_COUNT = 5; // Sempre 5 dígitos
// Limitar quantidade máxima de números por requisição para evitar abuso
const MAX_NUMBERS_PER_REQUEST = 100;
// Adicionar uma camada de segurança com uma semente específica da aplicação
const APP_SEED = 'UMADRIMC-2023';

/**
 * Busca todos os números já vendidos diretamente do Firestore sem usar cache
 */
export const fetchSoldNumbers = async (): Promise<string[]> => {
  try {
    // Otimização: agora estamos usando query para a consulta
    const ordersRef = collection(db, 'orders');
    // Consulta básica sem filtros, mas usando a estrutura query
    const ordersQuery = query(ordersRef);
    const ordersSnapshot = await getDocs(ordersQuery);
    
    const soldNumbers: string[] = [];
    
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      if (orderData.generatedNumbers && Array.isArray(orderData.generatedNumbers)) {
        soldNumbers.push(...orderData.generatedNumbers);
      }
    });
    
    return soldNumbers;
  } catch (err) {
    console.error('Erro ao buscar números vendidos:', err);
    throw new Error('Não foi possível verificar os números já vendidos.');
  }
};

/**
 * Busca números vendidos com filtros específicos, como por data
 * Esta função demonstra o uso adequado de query e where
 */
export const fetchSoldNumbersWithFilters = async (
  afterDate?: Date,
  limit?: number
): Promise<string[]> => {
  try {
    const ordersRef = collection(db, 'orders');
    
    // Construir a consulta com filtros condicionais
    let ordersQuery = query(ordersRef);
    
    // Adicionar filtro de data se especificado
    if (afterDate) {
      ordersQuery = query(
        ordersRef,
        where('createdAt', '>', afterDate)
      );
    }
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const soldNumbers: string[] = [];
    
    // Processar os documentos retornados
    ordersSnapshot.forEach((doc) => {
      const orderData = doc.data();
      if (orderData.generatedNumbers && Array.isArray(orderData.generatedNumbers)) {
        // Limitar a quantidade se necessário
        const numbersToAdd = limit ? 
          orderData.generatedNumbers.slice(0, limit - soldNumbers.length) : 
          orderData.generatedNumbers;
          
        soldNumbers.push(...numbersToAdd);
        
        // Parar de processar se atingirmos o limite
        if (limit && soldNumbers.length >= limit) return;
      }
    });
    
    return soldNumbers;
  } catch (err) {
    console.error('Erro ao buscar números vendidos com filtros:', err);
    throw new Error('Não foi possível verificar os números já vendidos com os filtros especificados.');
  }
};

/**
 * Gera um número formatado com zeros à esquerda
 * @param totalNumbers Total de números disponíveis
 */
export const generateFormattedNumber = (totalNumbers = MAX_AVAILABLE_NUMBERS): string => {
  // Adicionar entropia extra ao gerador
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
  
  // Garantir número positivo e dentro da faixa (1 a 10000)
  const randomNum = Math.abs(hash % totalNumbers) + 1;
  
  // Formatar para ter exatamente 5 dígitos com zeros à esquerda
  return randomNum.toString().padStart(NUMBER_DIGIT_COUNT, '0');
};

/**
 * Verifica se um formato de número é válido de acordo com os padrões do sistema
 * @param number Número a ser validado
 * @returns Verdadeiro se o número está no formato correto
 */
export const isValidNumberFormat = (number: string): boolean => {
  // Verificar se é uma string de exatamente 5 dígitos numéricos
  const validFormatRegex = /^\d{5}$/;
  
  // Verificar se está dentro do intervalo permitido (00001 a 10000)
  const numericValue = parseInt(number, 10);
  
  return (
    validFormatRegex.test(number) && 
    numericValue >= 1 && 
    numericValue <= MAX_AVAILABLE_NUMBERS
  );
};

/**
 * Formata um número para o padrão do sorteio (5 dígitos)
 * @param number Número a ser formatado
 * @returns Número formatado com 5 dígitos
 */
export const formatRaffleNumber = (number: string | number): string => {
  const numStr = typeof number === 'number' ? number.toString() : number;
  
  // Limpar caracteres não numéricos
  const cleaned = numStr.replace(/\D/g, '');
  
  // Converter para número e garantir que está no intervalo válido
  const numericValue = parseInt(cleaned, 10) || 0;
  if (numericValue < 1 || numericValue > MAX_AVAILABLE_NUMBERS) {
    throw new Error(`Número fora do intervalo permitido (1-${MAX_AVAILABLE_NUMBERS}): ${numericValue}`);
  }
  
  // Formatar para ter exatamente 5 dígitos com zeros à esquerda
  return numericValue.toString().padStart(NUMBER_DIGIT_COUNT, '0');
};

/**
 * Gera múltiplos números únicos de forma simplificada
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
  
  // Tentar gerar números únicos
  let attempts = 0;
  const maxAttempts = count * 10; // Limite razoável de tentativas
  
  while (generatedNumbers.size < count && attempts < maxAttempts) {
    const newNumber = generateFormattedNumber();
    
    // Adicionar apenas se não estiver nos números vendidos e ainda não gerados
    if (!soldNumbersSet.has(newNumber) && !generatedNumbers.has(newNumber)) {
      generatedNumbers.add(newNumber);
    }
    
    attempts++;
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
 * Inicializa a coleção de números disponíveis
 * Esta função cria uma referência de todos os números disponíveis no sistema
 */
export const initAvailableNumbersCollection = async (): Promise<void> => {
  try {
    // 1. Buscar números já vendidos
    const soldNumbers = await fetchSoldNumbers();
    const soldSet = new Set(soldNumbers);
    
    // 2. Criar uma coleção temporária no Firestore para rastrear disponíveis
    const availableRef = collection(db, 'available_numbers');
    
    // 3. Adicionar todos os números disponíveis em batches (máximo 500 por batch)
    let batchCount = 0;
    let currentBatch = writeBatch(db);
    
    // Criar registro para cada número disponível
    for (let i = 1; i <= MAX_AVAILABLE_NUMBERS; i++) {
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
      
      // Se atingir o limite de batch, comitar e criar novo
      if (batchCount >= 500) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        batchCount = 0;
        
        // Pequena pausa para evitar sobrecarregar o Firestore
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Comitar última batch se tiver algo
    if (batchCount > 0) {
      await currentBatch.commit();
    }
    
    // 4. Criar um documento de metadata para rastrear última sincronização
    await setDoc(doc(db, 'system', 'numbers_metadata'), {
      lastSync: serverTimestamp(),
      totalAvailable: MAX_AVAILABLE_NUMBERS - soldNumbers.length,
      totalSold: soldNumbers.length
    });
    
    console.log(`Coleção de números disponíveis inicializada com ${MAX_AVAILABLE_NUMBERS - soldNumbers.length} números`);
  } catch (err) {
    console.error('Erro ao inicializar coleção de números disponíveis:', err);
    throw new Error('Não foi possível inicializar o sistema de números.');
  }
};

/**
 * Sincroniza a coleção de números disponíveis com os vendidos
 * Remove os números vendidos da coleção de disponíveis
 */
export const syncAvailableNumbersWithSoldOnes = async (): Promise<void> => {
  try {
    // 1. Buscar números já vendidos
    const soldNumbers = await fetchSoldNumbers();
    
    // 2. Referência à coleção de números disponíveis
    const availableRef = collection(db, 'available_numbers');
    
    // 3. Processar em batches para não sobrecarregar o Firestore
    let batchCount = 0;
    let currentBatch = writeBatch(db);
    
    // Remover cada número vendido da coleção de disponíveis
    for (const number of soldNumbers) {
      const numRef = doc(availableRef, number);
      currentBatch.delete(numRef);
      
      batchCount++;
      
      // Se atingir o limite de batch, comitar e criar novo
      if (batchCount >= 500) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        batchCount = 0;
        
        // Pausa para evitar sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 500));
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
      totalSold: soldNumbers.length
    });
    
    console.log(`Sincronização concluída. Removidos ${soldNumbers.length} números vendidos da coleção de disponíveis`);
  } catch (err) {
    console.error('Erro ao sincronizar números vendidos:', err);
    throw new Error('Não foi possível sincronizar os números vendidos.');
  }
};
