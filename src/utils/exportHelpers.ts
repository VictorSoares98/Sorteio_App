import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Interface para configurações de exportação
 */
export interface ExportConfig {
  format: 'csv' | 'pdf' | 'excel';
  dateFormat: string;
  includeDetails: boolean;
  fields: string[];
  fileName?: string;
}

/**
 * Processa uma data de acordo com o formato escolhido
 */
export function formatDateForExport(date: Date | string | number, dateFormat: string): string {
  if (!date) return '';
  
  // Garantir que a conversão para Date seja feita corretamente
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (date === null || date === undefined) {
    dateObj = new Date(); // Valor padrão se date for nulo ou indefinido
  } else {
    try {
      dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        dateObj = new Date(); // Usar atual se date for inválido
      }
    } catch {
      dateObj = new Date(); // Em caso de erro, usar data atual
    }
  }
  
  try {
    // Mapear formatos para o date-fns
    const formatMap: Record<string, string> = {
      'dd/MM/yyyy': 'dd/MM/yyyy',
      'MM/dd/yyyy': 'MM/dd/yyyy',
      'yyyy-MM-dd': 'yyyy-MM-dd'
    };
    
    const formatStr = formatMap[dateFormat] || 'dd/MM/yyyy';
    return format(dateObj, formatStr, { locale: ptBR });
  } catch (err) {
    console.error('Erro ao formatar data:', err);
    return date.toString();
  }
}

/**
 * Exportar dados para Excel de acordo com configurações
 */
export function exportDataToExcel(data: any[], config: ExportConfig): void {
  // Filtrar campos de acordo com a configuração
  const filteredData = data.map(item => {
    const result: Record<string, any> = {};
    
    config.fields.forEach(field => {
      if (item.hasOwnProperty(field)) {
        // Formatar campos de data se necessário
        if (field.toLowerCase().includes('date') && item[field] instanceof Date) {
          result[field] = formatDateForExport(item[field], config.dateFormat);
        } else {
          result[field] = item[field];
        }
      }
    });
    
    return result;
  });
  
  // Criar planilha
  const ws = XLSX.utils.json_to_sheet(filteredData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados Exportados");
  
  // Gerar nome de arquivo com data atual
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  const fileName = config.fileName || `exportacao_${timestamp}.xlsx`;
  
  // Exportar
  XLSX.writeFile(wb, fileName);
}

/**
 * Exportar dados para CSV de acordo com configurações
 */
export function exportDataToCSV(data: any[], config: ExportConfig): void {
  // Filtrar e formatar os dados como no Excel
  const filteredData = data.map(item => {
    const result: Record<string, any> = {};
    
    config.fields.forEach(field => {
      if (item.hasOwnProperty(field)) {
        if (field.toLowerCase().includes('date') && item[field] instanceof Date) {
          result[field] = formatDateForExport(item[field], config.dateFormat);
        } else {
          result[field] = item[field];
        }
      }
    });
    
    return result;
  });
  
  // Cabeçalhos
  const headers = config.fields;
  
  // Criar conteúdo CSV
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Adicionar cabeçalhos
  csvContent += headers.join(",") + "\n";
  
  // Adicionar dados
  filteredData.forEach(item => {
    const row = headers.map(header => {
      const cell = item[header] || "";
      // Escapar aspas e adicionar aspas ao redor de strings com vírgulas
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    csvContent += row.join(",") + "\n";
  });
  
  // Gerar nome de arquivo
  const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
  const fileName = config.fileName || `exportacao_${timestamp}.csv`;
  
  // Criar link de download e acionar
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
