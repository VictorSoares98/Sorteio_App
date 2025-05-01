/**
 * Utilitário para agregação de dados no cliente
 * Otimizado para processamento local e minimização de operações do Firestore
 */

/**
 * Interface para série temporal agregada
 */
export interface TimeSeriesData {
  labels: string[];
  values: number[];
}

/**
 * Interface para ponto de dados com carimbo de tempo
 */
export interface DataPoint {
  timestamp: Date;
  value: number;
}

/**
 * Função para agregação de dados por período de tempo
 * @param data Array de pontos de dados com timestamp e valor
 * @param period Período de agregação ('day', 'week', 'month')
 * @returns Dados agregados formatados para gráficos
 */
export function aggregateByTimePeriod(data: DataPoint[], period: 'day' | 'week' | 'month'): TimeSeriesData {
  // Se não houver dados, retornar estrutura vazia
  if (!data || data.length === 0) {
    return { labels: [], values: [] };
  }
  
  // Ordenar dados cronologicamente
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Map para armazenar agregações por chave de período
  const aggregation: Record<string, number> = {};
  
  // Formatadores para cada período
  sortedData.forEach(item => {
    const date = item.timestamp;
    let key: string;
    
    switch (period) {
      case 'day':
        // Formato: "DD/MM"
        key = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'week':
        // Obter o primeiro dia da semana (domingo)
        const startOfWeek = new Date(date);
        const dayOfWeek = date.getDay();
        startOfWeek.setDate(date.getDate() - dayOfWeek);
        
        // Formatar como "DD/MM - DD/MM"
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        key = `${startOfWeek.getDate().toString().padStart(2, '0')}/${(startOfWeek.getMonth() + 1).toString().padStart(2, '0')} - ${endOfWeek.getDate().toString().padStart(2, '0')}/${(endOfWeek.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'month':
        // Usar nome do mês + ano
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        key = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    // Somar ao período apropriado
    if (!aggregation[key]) {
      aggregation[key] = 0;
    }
    aggregation[key] += item.value;
  });
  
  // Converter para formato de série temporal
  const entries = Object.entries(aggregation);
  
  // Verificar se há necessidade de ordenar os períodos (necessário para meses)
  let sortedEntries = entries;
  
  if (period === 'month') {
    // Ordenar meses cronologicamente
    const monthOrder: Record<string, number> = {
      'Jan': 0, 'Fev': 1, 'Mar': 2, 'Abr': 3, 'Mai': 4, 'Jun': 5, 
      'Jul': 6, 'Ago': 7, 'Set': 8, 'Out': 9, 'Nov': 10, 'Dez': 11
    };
    
    sortedEntries = entries.sort((a, b) => {
      const [monthA, yearA] = a[0].split('/');
      const [monthB, yearB] = b[0].split('/');
      
      if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
      }
      
      return monthOrder[monthA] - monthOrder[monthB];
    });
  }
  
  // Extrair labels e valores
  return {
    labels: sortedEntries.map(([label]) => label),
    values: sortedEntries.map(([_, value]) => value)
  };
}

/**
 * Calcula a previsão de vendas para os próximos dias com base em média móvel
 * @param data Pontos de dados históricos
 * @param daysToPredict Número de dias a prever
 * @returns Dados de previsão no mesmo formato dos dados históricos
 */
export function predictSales(data: DataPoint[], daysToPredict: number): DataPoint[] {
  if (data.length < 7) {
    // Precisamos de pelo menos 7 dias para uma previsão razoável
    return [];
  }
  
  // Ordenar dados cronologicamente
  const sortedData = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  // Calcular média dos últimos 7 dias
  const last7Days = sortedData.slice(-7);
  const sum = last7Days.reduce((total, point) => total + point.value, 0);
  const average = sum / last7Days.length;
  
  // Calcular tendência (positiva ou negativa)
  let trend = 0;
  if (last7Days.length >= 2) {
    // Média dos últimos 3 dias
    const last3 = last7Days.slice(-3);
    const last3Avg = last3.reduce((total, point) => total + point.value, 0) / last3.length;
    
    // Média dos 4 dias anteriores a esses
    const prev4 = last7Days.slice(0, 4);
    const prev4Avg = prev4.reduce((total, point) => total + point.value, 0) / prev4.length;
    
    // Calcular tendência como percentual
    trend = last3Avg > prev4Avg ? 0.05 : (last3Avg < prev4Avg ? -0.03 : 0);
  }
  
  // Gerar os pontos de previsão
  const predictions: DataPoint[] = [];
  
  const lastDate = new Date(sortedData[sortedData.length - 1].timestamp);
  
  for (let i = 1; i <= daysToPredict; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(lastDate.getDate() + i);
    
    // Aplicar média com tendência
    let predictedValue = average * (1 + (trend * i));
    
    // Guaranteed minimum value
    predictedValue = Math.max(0, predictedValue);
    
    predictions.push({
      timestamp: predictionDate,
      value: Math.round(predictedValue)
    });
  }
  
  return predictions;
}
