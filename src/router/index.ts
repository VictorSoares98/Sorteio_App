import { createRouter, createWebHistory } from 'vue-router';
import { auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from '../types/user';

const routes = [
  {
    path: '/',
    component: () => import('../views/HomeView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    component: () => import('../views/auth/LoginView.vue'),
  },
  {
    path: '/register',
    component: () => import('../views/auth/RegisterView.vue'),
  },
  {
    path: '/profile',
    component: () => import('../views/profile/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navegação com proteção de rotas
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin);
  const currentUser = auth.currentUser;

  if (requiresAuth && !currentUser) {
    next('/login');
  } else if (requiresAdmin && currentUser) {
    // Verificar se o usuário é admin
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      if (userData?.role === UserRole.ADMIN) {
        next();
      } else {
        // Não é admin, redirecionar para a home
        next('/');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      next('/');
    }
  } else {
    next();
  }
});

export default router;
