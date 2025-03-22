import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/authStore'

// Importando Tailwind CSS diretamente no style.css
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Inicializar o authStore com o router
const authStore = useAuthStore()
authStore.init(router)

// Configurar limpeza ao desmontar a aplicação
app.config.globalProperties.$onAppUnmount = () => {
  authStore.cleanup()
}

app.mount('#app')
