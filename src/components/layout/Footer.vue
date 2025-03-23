<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="bg-gray-900 text-white py-5 w-full border-t-4 border-primary">
    <div class="container max-w-7xl mx-auto px-4">
      <!-- Layout principal - vertical no mobile, horizontal no desktop -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
        <!-- Logo e informações à esquerda -->
        <div class="text-center md:text-left w-full md:w-auto mb-4 md:mb-0">
          <h2 class="text-lg md:text-xl font-bold text-primary">Sorteio UMADRIMC</h2>
          <p class="text-gray-400 text-xs md:text-sm mt-1">União de Mocidade da Assembleia de Deus RIMC</p>
        </div>
        
        <!-- Links agrupados à direita -->
        <div class="flex flex-row justify-center md:justify-end gap-6 md:gap-8 w-full md:w-auto">
          <!-- Contato -->
          <div class="text-center md:text-left">
            <h3 class="text-primary text-sm font-semibold mb-2">Contato</h3>
            <ul>
              <li>
                <a href="mailto:contato@umadrimc.org.br" class="text-gray-400 hover:text-primary text-xs md:text-sm transition-colors">
                  contato@umadrimc.org.br
                </a>
              </li>
            </ul>
          </div>
          
          <!-- Links -->
          <div class="text-center md:text-left">
            <h3 class="text-primary text-sm font-semibold mb-2">Links</h3>
            <ul class="space-y-1">
              <li>
                <router-link to="/" class="text-gray-400 hover:text-primary text-xs md:text-sm transition-colors">
                  Início
                </router-link>
              </li>
              <li>
                <router-link to="/login" class="text-gray-400 hover:text-primary text-xs md:text-sm transition-colors">
                  Entrar
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      <!-- Copyright - sempre na parte inferior -->
      <div class="border-t border-gray-800 mt-4 pt-4 text-center">
        <p class="text-gray-500 text-xs">
          © {{ currentYear }} UMADRIMC. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </footer>
</template>
