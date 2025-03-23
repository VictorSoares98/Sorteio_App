<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from './components/layout/Navbar.vue'
import Footer from './components/layout/Footer.vue'
import Sidebar from './components/layout/Sidebar.vue'
</script>

<template>
  <header>
    <Navbar />
  </header>
  
  <div class="flex">
    <aside class="hidden md:block md:w-64">
      <Sidebar />
    </aside>
    
    <main class="w-full">
      <RouterView />
    </main>
  </div>
  
  <footer>
    <Footer />
  </footer>
</template>

<style scoped>
main {
  padding: 1rem;
  min-height: calc(100vh - 200px); /* Ajuste para acomodar o footer */
}
</style>
