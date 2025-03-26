import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole } from '../types/user';
import { isAdmin } from '../utils/permissions';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';

// Interface para metadados de rota personalizados
interface RouteMeta {
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  title?: string;
}

// Estender RouteRecordRaw para incluir nossos metadados personalizados
type AppRouteRecordRaw = RouteRecordRaw & {
  meta?: RouteMeta;
};

// Define as rotas da aplicação com importações dinâmicas para melhor code splitting
const routes: AppRouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import(/* webpackChunkName: "home" */ '../views/HomeView.vue'),
    meta: { requiresAuth: true, title: 'Página Inicial' }
  },
  
  // Rotas de Autenticação - agrupadas em um chunk
  {
    path: '/login',
    name: 'login',
    component: () => import(/* webpackChunkName: "auth" */ '../views/auth/LoginView.vue'),
    meta: { title: 'Login' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import(/* webpackChunkName: "auth" */ '../views/auth/RegisterView.vue'),
    meta: { title: 'Cadastro' }
  },
  
  // Rotas de Perfil
  {
    path: '/profile',
    name: 'profile',
    component: () => import(/* webpackChunkName: "profile" */ '../views/profile/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Perfil' }
  },
  
  // Rotas de Administração
  {
    path: '/admin',
    name: 'admin',
    component: () => import(/* webpackChunkName: "admin" */ '../views/admin/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Administração' }
  },
  
  // Rota para tratar URLs inválidas
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import(/* webpackChunkName: "error" */ '../views/NotFoundView.vue'),
    meta: { title: 'Página não encontrada' }
  }
];

// Cria o roteador
const router = createRouter({
  history: createWebHistory(),
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
  
  // Aguardar a resolução do estado de autenticação antes de decidir
    const currentUser = await getCurrentUser() as User | null;
    console.log(`[Router] Navegando para ${to.path}, autenticado: ${!!currentUser}, requer auth: ${requiresAuth}`);

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
        next({ name: 'home' });
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      next({ name: 'home' });
    }
  } else {
    next();
  }
});

export default router;
