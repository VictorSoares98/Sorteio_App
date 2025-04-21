import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole } from '../types/user';
import { isAdmin } from '../utils/permissions';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { useAuthStore } from '../stores/authStore'; // Importação necessária para o novo guard
import ForgotPasswordView from '../views/auth/ForgotPasswordView.vue';

// Interface para metadados de rota personalizados
interface RouteMeta {
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  title?: string;
  requiresGuest?: boolean;
}

// Estender RouteRecordRaw para incluir nossos metadados personalizados
type AppRouteRecordRaw = RouteRecordRaw & {
  meta?: RouteMeta;
};

// Define as rotas da aplicação com importações dinâmicas para melhor code splitting
const routes: AppRouteRecordRaw[] = [
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
    name: 'cadastro',  // Já estava traduzido
    component: () => import(/* webpackChunkName: "auth" */ '../views/auth/RegisterView.vue'),
    meta: { title: 'Cadastro', requiresGuest: true }
  },
  {
    path: '/esqueci-senha',
    name: 'esqueci-senha',  // Já estava traduzido
    component: ForgotPasswordView,
    meta: { requiresGuest: true, title: 'Esqueci Minha Senha' }
  },
  
  // Rotas de Perfil
  {
    path: '/perfil',
    name: 'perfil',  // Já estava traduzido
    component: () => import(/* webpackChunkName: "profile" */ '../views/profile/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Perfil' }
  },

  // Nova rota para a página de sorteio
  {
    path: '/sorteio',
    name: 'sorteio',  // Já estava traduzido
    component: () => import(/* webpackChunkName: "raffle" */ '../views/raffle/RaffleView.vue'),
    meta: { requiresAuth: false, title: 'Sorteio' }
  },
  
  // Rotas de Administração
  {
    path: '/painel',
    name: 'painel',  // Já estava traduzido
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Administração' }
  },
  
  // Rota para tratar URLs inválidas
  {
    path: '/:pathMatch(.*)*',
    name: 'nao-encontrado',  // Já estava traduzido
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

// Verificar parâmetro de afiliação na URL
router.beforeEach((to, _from, next) => {
  // Verificar se há código de afiliado na query
  const refCode = to.query.ref as string;
  
  if (refCode) {
    // Salvar código no localStorage para usar após registro/login
    localStorage.setItem('pendingAffiliateCode', refCode);
    console.log(`[Router] Código de afiliação detectado: ${refCode}`);
    
    // Se estiver indo para página inicial ou login, redirecionar para registro
    if (to.path === '/' || to.path === '/login') {
      console.log('[Router] Redirecionando para página de registro com código de afiliado');
      return next({ 
        path: '/cadastro',
        query: { ref: refCode }
      });
    }
  }
  
  next();
});

// Navegação com proteção de rotas
router.beforeEach(async (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  // Atualizar o título da página dinamicamente
  document.title = `${to.meta.title || 'Tá nas Mãos de Deus'}`;
  
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
  
  // Verificar se está indo para página de autenticação e já está logado
  const currentUser = await getCurrentUser() as User | null;
  
  if ((to.path === '/login' || to.path === '/cadastro') && currentUser) {
    console.log('[Router] Usuário já autenticado, redirecionando para home');
    return next({ name: 'inicio' });
  }
  
  // Resto da lógica de proteção de rotas
  if (requiresAuth && !currentUser) {
    // Salvar a URL para redirecionamento após login
    console.log(`[Router] Redirecionando para login, URL original: ${to.fullPath}`);
    next({ 
      name: 'login', 
      query: { redirect: to.fullPath } 
    });
  } else if (requiresAdmin && currentUser) {
    // Verificar se o usuário é admin
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (isAdmin(userData?.role as UserRole)) {
        next();
      } else {
        // Não é admin, redirecionar para home
        console.log('[Router] Usuário não é admin, redirecionando para home');
        next({ name: 'inicio' });
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      next({ name: 'inicio' });
    }
  } else {
    next();
  }
});

// Configurar guards de navegação
router.beforeEach(async (to, from, next) => {
  // Se está navegando para a página inicial e tem afiliação pendente,
  // garantir que os dados de usuário estejam atualizados
  if (to.path === '/' && (sessionStorage.getItem('newAffiliation') === 'true' || from.path === '/cadastro' || from.path === '/login')) {
    console.log('[Router] Detectada possível nova afiliação, atualizando dados do usuário');
    console.log('[Router] Estado newAffiliation:', sessionStorage.getItem('newAffiliation'));
    console.log('[Router] Origem da navegação:', from.path);
    
    const authStore = useAuthStore();
    if (authStore.isAuthenticated) {
      try {
        // Forçar atualização dos dados do usuário
        await authStore.fetchUserData(true);
        console.log('[Router] Dados do usuário atualizados com sucesso');
      } catch (err) {
        console.error('[Router] Erro ao atualizar dados de usuário:', err);
      }
    }
  }
  
  next();
});

// Add global navigation guard for debugging
router.beforeEach((to, from, next) => {
  console.log(`Navigation from ${from.path} to ${to.path}`);
  next();
});

export default router;
