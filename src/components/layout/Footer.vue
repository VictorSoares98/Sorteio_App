<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="bg-gray-800 text-white py-6 mt-12">
    <div class="container mx-auto px-4">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-4 md:mb-0">
          <h2 class="text-xl font-bold">Sorteio UMADRIMC</h2>
          <p class="text-gray-300 text-sm mt-1">União de Mocidade da Assembleia de Deus RIMC</p>
        </div>
        
        <div class="flex flex-col md:flex-row gap-4 md:gap-8">
          <div>
            <h3 class="text-gray-300 font-semibold">Contato</h3>
            <ul class="mt-2">
              <li>
                <a href="mailto:contato@umadrimc.org.br" class="text-gray-400 hover:text-white">
                  contato@umadrimc.org.br
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-gray-300 font-semibold">Links</h3>
            <ul class="mt-2">
              <li>
                <router-link to="/" class="text-gray-400 hover:text-white">
                  Início
                </router-link>
              </li>
              <li>
                <router-link to="/login" class="text-gray-400 hover:text-white">
                  Entrar
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="border-t border-gray-700 mt-6 pt-4 text-center">
        <p class="text-gray-400 text-sm">
          © {{ currentYear }} UMADRIMC. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </footer>
</template>
