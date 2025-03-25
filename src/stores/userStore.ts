import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, getDocs, doc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { User, UserRole } from '../types/user';
import type { Order } from '../types/order';
import { useAuthStore } from './authStore';
import { processFirestoreDocument } from '../utils/firebaseUtils';

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
      const searchText = searchQuery.value.toLowerCase();
      result = result.filter(user => 
        user.displayName.toLowerCase().includes(searchText) || 
        user.email.toLowerCase().includes(searchText)
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
        // Usar função utilitária para processar documentos
        users.value.push(processFirestoreDocument<User>(doc));
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
        // Usar função utilitária para processar o documento
        return processFirestoreDocument<User>(userDoc);
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
  
  // Nova função que utiliza query e where
  const fetchUsersByRole = async (role: UserRole) => {
    loading.value = true;
    error.value = null;
    
    try {
      const usersRef = collection(db, 'users');
      const roleQuery = query(usersRef, where('role', '==', role));
      const querySnapshot = await getDocs(roleQuery);
      
      const filteredUsers: User[] = [];
      
      querySnapshot.forEach(doc => {
        // Usar função utilitária para processar documentos
        filteredUsers.push(processFirestoreDocument<User>(doc));
      });
      
      return filteredUsers;
    } catch (err: any) {
      console.error('Erro ao buscar usuários por função:', err);
      error.value = 'Não foi possível carregar os usuários com esta função.';
      return [];
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
    
    loading.value = true;
    error.value = null;
    
    try {
      const ordersRef = collection(db, 'orders');
      const ordersSnapshot = await getDocs(ordersRef);
      
      const sellerActivityMap = new Map<string, { 
        userId: string, 
        sellerName: string, 
        orderCount: number, 
        totalNumbers: number 
      }>();
      
      ordersSnapshot.forEach(doc => {
        const orderData = doc.data() as Order;
        const sellerId = orderData.sellerId;
        const sellerName = orderData.sellerName;
        const numbersCount = orderData.generatedNumbers?.length || 0;
        
        if (!sellerActivityMap.has(sellerId)) {
          sellerActivityMap.set(sellerId, {
            userId: sellerId,
            sellerName,
            orderCount: 0,
            totalNumbers: 0
          });
        }
        
        const sellerData = sellerActivityMap.get(sellerId)!;
        sellerData.orderCount++;
        sellerData.totalNumbers += numbersCount;
      });
      
      return Array.from(sellerActivityMap.values())
        .sort((a, b) => b.orderCount - a.orderCount);
        
    } catch (err: any) {
      console.error('Erro ao buscar atividade de usuários:', err);
      error.value = 'Não foi possível buscar dados de atividade.';
      return [];
    } finally {
      loading.value = false;
    }
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
    fetchUsersByRole, // Nova função adicionada
    updateUserRole,
    getUsersByActivity
  };
});
