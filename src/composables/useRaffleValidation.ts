import { ref } from 'vue';
import { DateTime } from 'luxon';
import type { RaffleData } from '../services/raffle';

export function useRaffleValidation() {
  const dateError = ref<string | null>(null);
  const modalMessage = ref<string>('');
  const showModal = ref(false);
  const isValid = ref(false);
  
  // Constante para o limite máximo de preço
  const MAX_PRICE_LIMIT = 1000000; // 1 milhão em reais

  // Verificar se a data é válida
  const isDateValid = (date: Date | null): boolean => {
    if (!date) return false;
    
    const jsDate = date instanceof Date ? date : new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Data não pode ser no passado
    if (jsDate < today) {
      dateError.value = 'A data do sorteio não pode ser no passado';
      return false;
    }
    
    // Data não pode ser mais de um ano no futuro
    const maxAllowedDate = new Date();
    maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + 1);
    
    if (jsDate > maxAllowedDate) {
      dateError.value = 'A data do sorteio não pode ser mais de 1 ano no futuro';
      return false;
    }
    
    // Se passou todas as validações, limpar erro e retornar válido
    dateError.value = null;
    return true;
  };

  // Validar dados antes de salvar
  const validateForm = (formData: RaffleData): {isValid: boolean, message?: string} => {
    // Validação básica
    if (!formData.title.trim()) {
      return { isValid: false, message: 'O título do sorteio é obrigatório' };
    }
    
    if (!formData.description.trim()) {
      return { isValid: false, message: 'A descrição do sorteio é obrigatória' };
    }
    
    // Validação do tamanho mínimo da descrição
    if (formData.description.trim().length < 10) {
      return { isValid: false, message: 'A descrição do prêmio deve ter pelo menos 10 caracteres' };
    }
    
    if (!formData.raffleDate.trim()) {
      return { isValid: false, message: 'A data do sorteio é obrigatória' };
    }
    
    // Validação avançada de data adicionada aqui
    try {
      const raffleDate = new Date(formData.raffleDate);
      if (!isDateValid(raffleDate)) {
        return { isValid: false, message: dateError.value || 'Data de sorteio inválida' };
      }
    } catch (error) {
      return { isValid: false, message: 'Formato de data inválido' };
    }
    
    // Validar preço mínimo
    if (formData.price <= 0) {
      return { isValid: false, message: 'O preço do bilhete de Sorteio não pode ser zero (0,00)' };
    }
    
    // Validar limite máximo de preço
    if (formData.price > MAX_PRICE_LIMIT) {
      return { 
        isValid: false, 
        message: `O preço máximo do bilhete não pode exceder R$ ${MAX_PRICE_LIMIT.toLocaleString('pt-BR')}`
      };
    }
    
    return { isValid: true };
  };
  
  // Função para obter datas limites para o datepicker
  const getDateLimits = () => {
    return {
      minDate: DateTime.now().toJSDate(),
      maxDate: DateTime.now().plus({ years: 1 }).toJSDate()
    };
  };
  
  // Retornar constante MAX_PRICE_LIMIT
  const getPriceLimit = () => MAX_PRICE_LIMIT;

  return { 
    dateError,
    modalMessage,
    showModal,
    isValid,
    isDateValid,
    validateForm,
    getDateLimits,
    getPriceLimit
  };
}
