import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

// Importando Tailwind CSS diretamente no style.css, não precisamos de main.css
// import './assets/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.mount('#app')
