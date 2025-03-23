/**
 * @deprecated Este arquivo está obsoleto. Use useProfileUpdate.ts e useAffiliateCode.ts separadamente.
 */

// Importar e reexportar os composables específicos
import { useProfileUpdate } from './useProfileUpdate';
import { useAffiliateCode } from './useAffiliateCode';

// Para compatibilidade com código existente
export function useProfile() {
  console.warn('useProfile está obsoleto. Use useProfileUpdate e useAffiliateCode separadamente.');
  
  const profileUpdate = useProfileUpdate();
  const affiliateCode = useAffiliateCode();
  
  return {
    ...profileUpdate,
    ...affiliateCode,
  };
}

export { useProfileUpdate, useAffiliateCode };
