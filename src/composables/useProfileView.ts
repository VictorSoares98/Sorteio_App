import { ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useOrderStore } from '../stores/orderStore';

export function useProfileView() {
  const authStore = useAuthStore();
  const orderStore = useOrderStore();
  const isLoading = ref(true);
  const activeTab = ref('profile'); // 'profile', 'sales', 'affiliate'
  
  const loadProfileData = async () => {
    try {
      if (!authStore.currentUser) {
        await authStore.fetchUserData();
      }
      
      await orderStore.fetchUserOrders();
    } finally {
      isLoading.value = false;
    }
  };
  
  const setActiveTab = (tab: string) => {
    activeTab.value = tab;
  };
  
  onMounted(() => {
    loadProfileData();
  });
  
  return {
    isLoading,
    activeTab,
    authStore,
    orderStore,
    setActiveTab
  };
}