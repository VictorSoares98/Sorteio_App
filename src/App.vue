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
    
    <main class="w-full p-4 min-h-[calc(100vh-200px)]">
      <RouterView />
    </main>
  </div>
  
  <footer>
    <Footer />
  </footer>
</template>
