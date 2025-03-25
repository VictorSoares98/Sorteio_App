/**
 * Constantes globais da aplicação
 */

// Sistema de números do sorteio
export const MAX_AVAILABLE_NUMBERS = 10000; // Limite máximo de números (10.000)
export const MIN_AVAILABLE_NUMBERS = 1;     // Número mínimo
export const NUMBER_DIGIT_COUNT = 5;        // Quantidade de dígitos para formatação (sempre 5)
export const MAX_NUMBERS_PER_REQUEST = 100; // Limitar números por requisição para evitar abuso

// Tempo de expiração para reservas
export const RESERVATION_EXPIRY_TIME_MS = 5 * 60 * 1000; // 5 minutos em milissegundos

// Seed para geração de números
export const APP_SEED = 'UMADRIMC-2023';

// Configurações para formatação de números
export const FORMAT_WITH_LEADING_ZEROS = true;
export const TICKET_NUMBER_PREFIX = ''; // Prefixo vazio por padrão
