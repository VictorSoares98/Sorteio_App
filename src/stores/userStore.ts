import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { collection, getDocs, doc, updateDoc, getDoc, query, where, Timestamp, setDoc } from 'firebase/firestore';
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
  const userNotes = ref<Record<string, string>>({});
  
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
        (user.displayName?.toLowerCase() || '').includes(searchText) || 
        user.email.toLowerCase().includes(searchText) ||
        (user.congregation?.toLowerCase().includes(searchText))
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
        if (userData.createdAt && userData.createdAt instanceof Timestamp) {
          userData.createdAt = userData.createdAt.toDate();
        }
        
        users.value.push({
          id: doc.id,
          ...userData
        } as User);
      });
      
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      error.value = 'Não foi possível carregar a lista de usuários.';
    } finally {
      loading.value = false;
    }
  };
  
  // Criar um utilitário genérico para buscar documentos por ID (que poderia ser movido para um arquivo de utilitários)
  const fetchDocumentById = async <T extends Record<string, any>>(
    collectionName: string,
    docId: string
  ): Promise<T | null> => {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return processFirestoreDocument<T>(docSnap);
      }
      return null;
    } catch (err) {
      console.error(`Erro ao buscar documento ${collectionName}/${docId}:`, err);
      return null;
    }
  };

  // Buscar usuário individual por ID
  const fetchUserById = async (userId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const user = await fetchDocumentById<User>('users', userId);
      
      if (!user) {
        error.value = 'Usuário não encontrado.';
        return null;
      }
      
      return user;
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

  // Salvar nota administrativa para um usuário
  async function saveUserNote(userId: string, note: string) {
    try {
      const noteRef = doc(db, 'userNotes', userId);
      await setDoc(noteRef, { 
        note,
        updatedAt: new Date()
      });
      
      userNotes.value[userId] = note;
      
      return true;
    } catch (err) {
      console.error('Erro ao salvar nota do usuário:', err);
      throw err;
    }
  }
  
  // Buscar notas de um usuário específico
  async function fetchUserNotes(userId: string) {
    try {
      const noteRef = doc(db, 'userNotes', userId);
      const noteSnap = await getDoc(noteRef);
      
      if (noteSnap.exists()) {
        const noteData = noteSnap.data();
        userNotes.value[userId] = noteData.note || '';
      } else {
        userNotes.value[userId] = '';
      }
      
      return userNotes.value[userId];
    } catch (err) {
      console.error('Erro ao buscar notas do usuário:', err);
      throw err;
    }
  }
  
  // Bloquear/desbloquear usuário
  async function toggleUserBlock(userId: string, isBlocked: boolean, blockReason?: string, blockDuration?: number) {
    try {
      const userRef = doc(db, 'users', userId);
      
      const blockData: any = { isBlocked };
      
      if (isBlocked) {
        blockData.blockReason = blockReason || '';
        blockData.blockStartDate = new Date();
        
        if (blockDuration && blockDuration > 0) {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + blockDuration);
          blockData.blockExpiration = expirationDate;
        } else {
          blockData.blockExpiration = null;
        }
      } else {
        blockData.blockReason = null;
        blockData.blockStartDate = null;
        blockData.blockExpiration = null;
      }
      
      await updateDoc(userRef, blockData);
      
      const userIndex = users.value.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        users.value[userIndex].isBlocked = isBlocked;
        users.value[userIndex].blockReason = blockData.blockReason;
        users.value[userIndex].blockStartDate = blockData.blockStartDate;
        users.value[userIndex].blockExpiration = blockData.blockExpiration;
      }
      
      return true;
    } catch (err) {
      console.error('Erro ao atualizar status de bloqueio do usuário:', err);
      throw err;
    }
  }
  
  // Exportar usuários para CSV
  async function exportUsersToCSV(data: any[], fields: { label: string, key: string }[]) {
    try {
      let csv = fields.map(field => `"${field.label}"`).join(',') + '\n';
      
      data.forEach(item => {
        const row = fields.map(field => {
          const value = item[field.key] !== undefined && item[field.key] !== null
            ? String(item[field.key]).replace(/"/g, '""')
            : '';
          return `"${value}"`;
        }).join(',');
        
        csv += row + '\n';
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `usuarios_${new Date().toISOString().slice(0,10)}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (err) {
      console.error('Erro ao exportar para CSV:', err);
      throw err;
    }
  }
  
  // Exportar usuários para Excel (formato simplificado via CSV)
  async function exportUsersToExcel(data: any[], fields: { label: string, key: string }[]) {
    try {
      let csv = fields.map(field => `"${field.label}"`).join('\t') + '\n';
      
      data.forEach(item => {
        const row = fields.map(field => {
          const value = item[field.key] !== undefined && item[field.key] !== null
            ? String(item[field.key]).replace(/"/g, '""')
            : '';
          return `"${value}"`;
        }).join('\t');
        
        csv += row + '\n';
      });
      
      const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `usuarios_${new Date().toISOString().slice(0,10)}.xls`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (err) {
      console.error('Erro ao exportar para Excel:', err);
      throw err;
    }
  }
  
  // Adicionar um novo usuário à lista (para atualização em tempo real)
  const addUser = (userData: any) => {
    // Verificar se o usuário já existe na lista
    const existingUserIndex = users.value.findIndex(user => user.id === userData.id);
    if (existingUserIndex === -1) {
      // Converter timestamp para Date se necessário
      if (userData.createdAt && userData.createdAt instanceof Timestamp) {
        userData.createdAt = userData.createdAt.toDate();
      }
      // Adicionar o novo usuário à lista
      users.value.push(userData as User);
    }
  };
  
  // Atualizar um usuário existente na lista (para atualização em tempo real)
  const updateUser = (userData: any) => {
    const index = users.value.findIndex(user => user.id === userData.id);
    if (index !== -1) {
      // Converter timestamp para Date se necessário
      if (userData.createdAt && userData.createdAt instanceof Timestamp) {
        userData.createdAt = userData.createdAt.toDate();
      }
      // Mesclar os dados atualizados
      users.value[index] = { ...users.value[index], ...userData };
    }
  };
  
  // Remover um usuário da lista por ID (para atualização em tempo real)
  const removeUser = (userId: string) => {
    const index = users.value.findIndex(user => user.id === userId);
    if (index !== -1) {
      users.value.splice(index, 1);
    }
  };
  
  return {
    users,
    filteredUsers,
    loading,
    error,
    searchQuery,
    roleFilter,
    userNotes,
    fetchAllUsers,
    fetchUserById,
    fetchUsersByRole,
    updateUserRole,
    getUsersByActivity,
    saveUserNote,
    fetchUserNotes,
    toggleUserBlock,
    exportUsersToCSV,
    exportUsersToExcel,
    addUser,       // Nova função adicionada
    updateUser,    // Nova função adicionada
    removeUser     // Nova função adicionada
  };
});
