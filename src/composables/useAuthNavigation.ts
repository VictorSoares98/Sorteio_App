import { watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

export function useAuthNavigation() {
  const router = useRouter();
  const route = useRoute();
  const authStore = useAuthStore();
  
  // Verificar afiliação quando navegar para home
  watch(
    () => route.path,
    (newPath) => {
      if (newPath === '/' && 
          (sessionStorage.getItem('newAffiliation') === 'true' || 
           route.query.checkAffiliation === 'true')) {
        
        if (authStore.isAuthenticated) {
          console.log('[AuthNavigation] Detectada possível afiliação, atualizando dados');
          authStore.fetchUserData(true)
            .catch(err => console.error('[AuthNavigation] Erro:', err));
        }
      }
    },
    { immediate: true }
  );
  
  // Função utilitária para navegar após login/registro
  const navigateAfterAuth = (redirectPath: string = '/'): void => {
    // Se houver afiliação pendente, adicionar query param para forçar verificação
    if (localStorage.getItem('pendingAffiliateCode')) {
      router.push({ path: redirectPath, query: { checkAffiliation: 'true' } });
    } else {
      router.push(redirectPath);
    }
  };
  
  return {
    navigateAfterAuth
  };
}
