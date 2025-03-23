import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserRole } from '../types/user';
import { isAdmin } from '../utils/permissions';

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

// Define as rotas da aplicação
const routes: AppRouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true, title: 'Página Inicial' }
  },
  
  // Rotas de Autenticação
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { title: 'Login' }
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/auth/RegisterView.vue'),
    meta: { title: 'Cadastro' }
  },
  
  // Rotas de Perfil
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/profile/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Perfil' }
  },
  
  // Rotas de Administração
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/admin/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Administração' }
  },
  
  // Rota para tratar URLs inválidas
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
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
  const currentUser = auth.currentUser;

  if (requiresAuth && !currentUser) {
    // Salvar a URL para redirecionamento após login
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
