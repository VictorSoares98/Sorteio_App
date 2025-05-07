import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole } from '../types/user';
import { isAdmin } from '../utils/permissions';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import ForgotPasswordView from '../views/auth/ForgotPasswordView.vue';
import { useAuthStore } from '../stores/authStore';

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
    component: () => import('../views/profile/ProfileView.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'perfil',
        redirect: '/perfil/vendas'
      },
      {
        path: 'vendas',
        name: 'perfil-vendas',
        component: () => import('../views/profile/ProfileView.vue'),
        meta: { title: 'Minhas Vendas' }
      },
      {
        path: 'painel',
        name: 'perfil-painel',
        component: () => import('../views/profile/ProfileView.vue'),
        meta: { title: 'Painel de Controle' }
      },
      {
        path: 'afiliados',
        name: 'perfil-afiliados',
        component: () => import('../views/profile/ProfileView.vue'),
        meta: { title: 'Programa de Afiliados' }
      },
      {
        path: 'ranking',
        name: 'perfil-ranking',
        component: () => import('../views/profile/ProfileView.vue'),
        meta: { title: 'Ranking de Vendas' }
      },
      {
        path: 'informacoes',
        name: 'perfil-informacoes',
        component: () => import('../views/profile/ProfileView.vue'),
        meta: { title: 'Informações do Perfil' }
      }
    ]
  },

  // Nova rota para a página de sorteio
  {
    path: '/sorteio',
    name: 'sorteio',
    component: () => import(/* webpackChunkName: "raffle" */ '../views/raffle/RaffleView.vue'),
    meta: { requiresAuth: false, title: 'Sorteio' }
  },

  // Nova rota para sorteio específico por ID
  {
    path: '/sorteio/:id',
    name: 'raffle-details',
    component: () => import('../views/raffle/RaffleView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Sorteio Específico'
    }
  },
  
  // Rotas de Administração
  {
    path: '/painel',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'painel',
        component: () => import('../views/admin/AdminView.vue'),
        meta: { title: 'Administração - Menu Principal' }
      },
      {
        path: 'usuarios',
        name: 'painel-usuarios',
        component: () => import('../views/admin/AdminView.vue'),
        meta: { title: 'Administração - Gerenciamento de Usuários' }
      },
      {
        path: 'relatorios',
        name: 'painel-relatorios',
        component: () => import('../views/admin/AdminView.vue'),
        meta: { title: 'Administração - Relatórios de Vendas' }
      },
      {
        path: 'sorteios',
        name: 'painel-sorteios',
        component: () => import('../views/admin/AdminView.vue'),
        meta: { title: 'Administração - Gerenciar Sorteios' }
      },
      {
        path: 'configuracoes',
        name: 'painel-configuracoes',
        component: () => import('../views/admin/AdminView.vue'),
        meta: { title: 'Administração - Configurações' }
      }
    ]
  },

  // Rota do Dashboard com proteção
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
    beforeEnter: (to, from, next) => {
      const authStore = useAuthStore();
      
      // Registrar de onde o usuário está vindo e para onde está indo
      console.log(`Navegação para dashboard: de ${from.path} para ${to.path}`);
      
      // Verificar se está logado
      if (!authStore.currentUser) {
        // Salvar a rota original para redirecionamento após login
        return next({ path: '/login', query: { redirect: to.fullPath } });
      }
      
      // Verificar se é admin ou não tem afiliação
      const isAdmin = [UserRole.ADMIN, UserRole.SECRETARIA, UserRole.TESOUREIRO].includes(authStore.currentUser.role);
      const isAffiliated = !!authStore.currentUser.affiliatedTo;
      
      if (isAdmin || !isAffiliated) {
        // Se vindo da página de login, mostrar mensagem de boas-vindas
        if (from.path === '/login') {
          console.log(`Bem-vindo ao Dashboard! Acessando: ${String(to.name)}`);
        }
        return next(); // Pode acessar
      } else {
        console.log(`Usuário ${authStore.currentUser.email} não tem permissão. Redirecionando de ${to.path} para /sorteio`);
        return next('/sorteio'); // Redirecionar para sorteio
      }
    }
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
      
      // Verificar se o usuário não tem afiliação (pode acessar mesmo sem ser admin)
      const isAffiliated = !!userData?.affiliatedTo;
      
      // Permitir acesso se for admin OU não estiver afiliado a ninguém
      if (!isAdmin(userData?.role as UserRole) && isAffiliated) {
        console.log('[Router] Usuário afiliado sem papel administrativo, redirecionando para home');
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
