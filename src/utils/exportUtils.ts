import * as XLSX from 'xlsx';
import { type AppSettings } from '../types/appSettings';

// Exportar configurações para Excel
export function exportSettingsToExcel(settings: AppSettings, filename = 'configuracoes'): void {
  // 1. Preparar dados para formato tabular
  const settingsArray = prepareSettingsForExport(settings);
  
  // 2. Criar planilha
  const ws = XLSX.utils.json_to_sheet(settingsArray);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Configurações");
  
  // 3. Salvar arquivo
  XLSX.writeFile(wb, `${filename}_${getFormattedDate()}.xlsx`);
}

// Exportar configurações para CSV
export function exportSettingsToCSV(settings: AppSettings, filename = 'configuracoes'): void {
  // Mesmo método, mas exportando como CSV
  const settingsArray = prepareSettingsForExport(settings);
  const ws = XLSX.utils.json_to_sheet(settingsArray);
  const csv = XLSX.utils.sheet_to_csv(ws);
  
  // Criar e baixar o arquivo
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${getFormattedDate()}.csv`;
  link.click();
}

// Preparar dados em formato plano para exportação
function prepareSettingsForExport(settings: AppSettings): Array<{chave: string, valor: string}> {
  const result: Array<{chave: string, valor: string}> = [];
  
  // Converter objeto aninhado em pares chave-valor planos
  function processObject(obj: any, prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Processar subobjetos recursivamente
        processObject(value, fullKey);
      } else {
        // Converter para string, incluindo arrays
        let stringValue: string;
        if (Array.isArray(value)) {
          stringValue = JSON.stringify(value);
        } else {
          stringValue = String(value);
        }
        
        result.push({
          chave: fullKey,
          valor: stringValue
        });
      }
    });
  }
  
  processObject(settings);
  return result;
}

// Obter data formatada para o nome do arquivo
function getFormattedDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
