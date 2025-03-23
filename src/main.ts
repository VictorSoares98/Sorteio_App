import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { useAuthStore } from './stores/authStore'

// Inicializar aplicação
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Inicializar o authStore com o router antes de montar a aplicação
const authStore = useAuthStore()
authStore.init(router)

app.mount('#app')