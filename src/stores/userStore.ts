import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserRole } from '../types/user';
import { useAuthStore } from './authStore';

export const useUserStore = defineStore('users', () => {
  const users = ref<User[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const authStore = useAuthStore();
  
  // Filtros
  const searchQuery = ref('');
  const roleFilter = ref<UserRole | ''>('');
  
  // Usuários filtrados
  const filteredUsers = computed(() => {
    let result = [...users.value];
    
    // Filtrar por texto de busca
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(user => 
        user.displayName.toLowerCase().includes(query) || 
        user.email.toLowerCase().includes(query)
      );
    }
    
    // Filtrar por cargo
    if (roleFilter.value) {
      result = result.filter(user => user.role === roleFilter.value);
    }
    
    return result;
  });
  
  // Buscar todos usuários (apenas para admin)
  const fetchAllUsers = async () => {
    if (!authStore.isAdmin) {
      error.value = 'Permissão negada. Apenas administradores podem listar usuários.';
      return;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      users.value = [];
      
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        // Converter timestamp para Date
        const createdAt = userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date();
        users.value.push({
          ...userData,
          createdAt
        } as User);
      });
      
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      error.value = 'Não foi possível carregar a lista de usuários.';
    } finally {
      loading.value = false;
    }
  };
  
  // Buscar usuário individual por ID
  const fetchUserById = async (userId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          ...userData,
          createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date()
        } as User;
      } else {
        error.value = 'Usuário não encontrado.';
        return null;
      }
    } catch (err: any) {
      console.error('Erro ao buscar usuário:', err);
      error.value = 'Erro ao carregar dados do usuário.';
      return null;
    } finally {
      loading.value = false;
    }
  };
  
  // Atualizar papel do usuário (permissões)
  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!authStore.isAdmin) {
      error.value = 'Permissão negada. Apenas administradores podem alterar funções.';
      return false;
    }
    
    loading.value = true;
    error.value = null;
    
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { role: newRole });
      
      // Atualizar o usuário na lista local
      const index = users.value.findIndex(user => user.id === userId);
      if (index !== -1) {
        users.value[index].role = newRole;
      }
      
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar papel do usuário:', err);
      error.value = 'Não foi possível atualizar a função deste usuário.';
      return false;
    } finally {
      loading.value = false;
    }
  };
  
  // Filtrar usuários por vendas
  const getUsersByActivity = async () => {
    if (!authStore.isAdmin) {
      error.value = 'Permissão negada. Apenas administradores podem acessar esta informação.';
      return [];
    }
    
    // Implementação futura: buscar usuários com número de vendas
    return [];
  };
  
  return {
    users,
    filteredUsers,
    loading,
    error,
    searchQuery,
    roleFilter,
    fetchAllUsers,
    fetchUserById,
    updateUserRole,
    getUsersByActivity
  };
});
