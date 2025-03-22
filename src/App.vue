<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from './components/layout/Navbar.vue'
</script>

<template>
  <header>
    <Navbar />
  </header>
  <main>
    <RouterView />
  </main>
</template>

<style scoped>
main {
  padding: 1rem;
}
</style>
