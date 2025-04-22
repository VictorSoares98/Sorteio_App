import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole } from '../types/user';
import { isAdmin } from '../utils/permissions';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import ForgotPasswordView from '../views/auth/ForgotPasswordView.vue';

// Melhor abordagem: Estender a interface RouteMeta no módulo do vue-router
// Isso fará com que o TypeScript reconheça automaticamente seus meta personalizados
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
    title?: string;
    requiresGuest?: boolean;
  }
}

// Agora podemos usar RouteRecordRaw diretamente, sem necessidade de tipagem personalizada
// Define as rotas da aplicação com importações dinâmicas para melhor code splitting
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'inicio',
    component: () => import(/* webpackChunkName: "home" */ '../views/HomeView.vue'),
    meta: { requiresAuth: true, title: 'Página Inicial' }
  },
  
  // Rotas de Autenticação - agrupadas em um chunk
  {
    path: '/login',
    name: 'login',
    component: () => import(/* webpackChunkName: "auth" */ '../views/auth/LoginView.vue'),
    meta: { title: 'Login', requiresGuest: true }
  },
  {
    path: '/cadastro',
    name: 'cadastro',
    component: () => import(/* webpackChunkName: "auth" */ '../views/auth/RegisterView.vue'),
    meta: { title: 'Cadastro', requiresGuest: true }
  },
  {
    path: '/esqueci-senha',
    name: 'esqueci-senha',
    component: ForgotPasswordView,
    meta: { requiresGuest: true, title: 'Esqueci Minha Senha' }
  },
  
  // Rotas de Perfil
  {
    path: '/perfil',
    name: 'perfil',
    component: () => import(/* webpackChunkName: "profile" */ '../views/profile/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Perfil' }
  },

  // Nova rota para a página de sorteio
  {
    path: '/sorteio',
    name: 'sorteio',
    component: () => import(/* webpackChunkName: "raffle" */ '../views/raffle/RaffleView.vue'),
    meta: { requiresAuth: false, title: 'Sorteio' }
  },
  
  // Rotas de Administração
  {
    path: '/painel',
    name: 'painel',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Administração' }
  },
  
  // Redirecionamentos
  {
    path: '/register',
    redirect: '/cadastro'
  },
  
  {
    path: '/forgot-password',
    redirect: '/esqueci-senha'
  },
  
  // Rota para tratar URLs inválidas
  {
    path: '/:pathMatch(.*)*',
    name: 'nao-encontrado',
    component: () => import(/* webpackChunkName: "error" */ '../views/NotFoundView.vue'),
    meta: { title: 'Página não encontrada' }
  }
];

// Cria o roteador
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Adicionar comportamento de scroll suave
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0, behavior: 'smooth' };
    }
  }
});

// Função para verificar se o estado de autenticação já foi resolvido
const getCurrentUser = () => {
  return new Promise<User | null>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
};

// Contador para debug de chamadas múltiplas de beforeEach
let guardCallCount = 0;

// Consolidando todos os beforeEach em um único guard mais organizado
router.beforeEach(async (to, from, next) => {
  // Debug para identificar chamadas múltiplas
  guardCallCount++;
  console.log(`[Router] Navegação #${guardCallCount}: ${from.path} → ${to.path}`);
  
  // 1. Atualizar título da página
  document.title = to.meta.title?.toString() || 'Tá nas Mãos de Deus';
  
  // 2. Verificar código de afiliado (primeira prioridade)
  const refCode = to.query.ref as string;
  if (refCode) {
    // Salvar código no localStorage para usar após registro/login
    if (!localStorage.getItem('pendingAffiliateCode') || 
        localStorage.getItem('pendingAffiliateCode') !== refCode) {
      localStorage.setItem('pendingAffiliateCode', refCode);
      console.log(`[Router] Código de afiliação detectado e salvo: ${refCode}`);
    }
    
    // Se estiver indo para página inicial ou login, redirecionar para registro com o código
    if (to.path === '/' || to.path === '/login') {
      console.log('[Router] Redirecionando para página de registro com código de afiliado');
      return next({ 
        path: '/cadastro',
        query: { ref: refCode }
      });
    }
  }
  
  // 3. Verificar estado de autenticação
  const currentUser = await getCurrentUser();
  
  // 4. Verificar rotas que requerem usuário não autenticado (requiresGuest)
  if (to.matched.some(record => record.meta.requiresGuest) && currentUser) {
    console.log('[Router] Usuário já autenticado tentando acessar página para visitantes');
    return next({ name: 'inicio' });
  }
  
  // 5. Verificar rotas que requerem autenticação
  if (to.matched.some(record => record.meta.requiresAuth) && !currentUser) {
    console.log(`[Router] Redirecionando para login, URL original: ${to.fullPath}`);
    return next({ 
      name: 'login', 
      query: { redirect: to.fullPath } 
    });
  }
  
  // 6. Verificar rotas que requerem admin (somente se o usuário estiver autenticado)
  if (to.matched.some(record => record.meta.requiresAdmin) && currentUser) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (!isAdmin(userData?.role as UserRole)) {
        console.log('[Router] Usuário não é admin, redirecionando para home');
        return next({ name: 'inicio' });
      }
    } catch (error) {
      console.error('[Router] Erro ao verificar permissões:', error);
      return next({ name: 'inicio' });
    }
  }
  
  // 7. Se passou por todas as verificações, permitir acesso
  return next();
});

export default router;
