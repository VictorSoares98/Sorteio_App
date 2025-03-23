/**
 * @deprecated Este arquivo está obsoleto. A lógica foi movida diretamente para ProfileView.vue
 */

// Redireciona para os composables específicos adequados
import { useAuthStore } from '../stores/authStore';
import { useOrderStore } from '../stores/orderStore';

// Mantido apenas para compatibilidade com código existente
// Você deve usar useAuthStore e useOrderStore diretamente
export function useProfileView() {
  console.warn('useProfileView está obsoleto. Use useAuthStore e useOrderStore diretamente.');
  
  const authStore = useAuthStore();
  const orderStore = useOrderStore();
  
  return { authStore, orderStore };
}