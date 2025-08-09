# 🎲 Sistema de Sorteios/Rifas - UMADRIMC

## 📋 Índice
- [Visão Geral](#-visão-geral)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Setup do Ambiente](#-setup-do-ambiente)
- [Padrões de Desenvolvimento](#-padrões-de-desenvolvimento)
- [Sistema de Permissões](#-sistema-de-permissões)
- [Gerenciamento de Estado](#-gerenciamento-de-estado)
- [Testes](#-testes)
- [Deploy e CI/CD](#-deploy-e-cicd)
- [Manutenção](#-manutenção)
- [Recursos Adicionais](#-recursos-adicionais)

---

## 🎯 Visão Geral

### O que é?
Sistema completo de gerenciamento de sorteios e rifas desenvolvido para a UMADRIMC, permitindo criação, gestão e execução de sorteios com funcionalidades avançadas de administração e monetização.

### Objetivos Principais
- **Gestão Completa**: Criar, editar e gerenciar sorteios de forma intuitiva
- **Sistema Hierárquico**: Diferentes níveis de usuários (Admin, Afiliado, Cliente)
- **Monetização**: Sistema de comissões e vendas de bilhetes
- **Analytics**: Dashboard com métricas e relatórios detalhados
- **Experiência Mobile**: Interface responsiva e PWA

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **Vue 3** - Framework JavaScript reativo
- **TypeScript** - Tipagem estática
- **Vite** - Build tool moderno e rápido
- **Tailwind CSS** - Framework CSS utilitário
- **Pinia** - Gerenciamento de estado oficial do Vue

### Backend & Infraestrutura
- **Firebase** - BaaS completo
  - **Authentication** - Sistema de autenticação
  - **Firestore** - Banco de dados NoSQL
  - **Storage** - Armazenamento de arquivos
  - **Hosting** - Deploy automático
  - **Functions** - Serverless functions

### Bibliotecas Principais
- **VeeValidate** - Validação de formulários
- **Chart.js** - Gráficos e dashboards
- **Luxon** - Manipulação de datas
- **Anime.js** - Animações
- **VueUse** - Utilitários composables

### Ferramentas de Desenvolvimento
- **Vitest** - Framework de testes
- **Storybook** - Documentação de componentes
- **ESLint + Prettier** - Qualidade e formatação de código
- **Husky** - Git hooks
- **GitHub Actions** - CI/CD

---

## 📁 Estrutura do Projeto

```
sorteio_UMADRIMC/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── common/         # Componentes genéricos
│   │   ├── forms/          # Componentes de formulário
│   │   └── ui/             # Componentes de interface
│   ├── views/              # Páginas/Views da aplicação
│   ├── stores/             # Pinia stores (estado global)
│   ├── composables/        # Lógica reutilizável (Composition API)
│   ├── services/           # Serviços e integrações (Firebase, APIs)
│   ├── types/              # Definições TypeScript
│   ├── utils/              # Funções utilitárias
│   └── assets/             # Recursos estáticos
├── public/                 # Arquivos públicos
├── tests/                  # Testes unitários e e2e
├── .storybook/            # Configuração do Storybook
└── firebase/              # Configurações Firebase
```

---

## ⚡ Funcionalidades Principais

### 🎫 Gestão de Sorteios
- **Criação de Sorteios**: Interface intuitiva para criar novos sorteios
- **Configuração Avançada**: Definir prêmios, preços, datas e regras
- **Upload de Imagens**: Anexar fotos dos prêmios
- **Status Management**: Controle de estados (Ativo, Pausado, Finalizado)

### 👥 Sistema de Usuários
- **Autenticação Segura**: Login via email/senha e redes sociais
- **Hierarquia de Permissões**: Admin, Afiliado, Cliente
- **Perfis Personalizáveis**: Informações e preferências do usuário
- **Sistema de Afiliação**: Comissões e vendas hierárquicas

### 💰 Vendas e Bilhetes
- **Venda Online**: Compra de bilhetes via interface web
- **PIX Integration**: Pagamentos via PIX (planejado)
- **Gestão de Bilhetes**: Controle de vendas e numeração
- **Reservas**: Sistema de reserva temporária de bilhetes

### 📊 Dashboard e Analytics
- **Métricas em Tempo Real**: Vendas, usuários, performance
- **Gráficos Interativos**: Visualização de dados com Chart.js
- **Relatórios**: Exportação de dados e relatórios customizados
- **Histórico**: Acompanhamento de todas as atividades

### 📱 Experiência Mobile
- **Design Responsivo**: Otimizado para todos os dispositivos
- **PWA**: Funcionalidades de app nativo
- **Offline Support**: Funcionalidades básicas offline
- **Push Notifications**: Notificações em tempo real

---

## 🚀 Setup do Ambiente

### Pré-requisitos
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git**
- Conta **Firebase** configurada

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/sorteio_UMADRIMC.git
cd sorteio_UMADRIMC
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Copie o arquivo de exemplo
cp .env.example .env.local

# Configure suas chaves Firebase
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
# ... outras configurações
```

4. **Configure o Firebase**
```bash
# Instale o Firebase CLI
npm install -g firebase-tools

# Faça login no Firebase
firebase login

# Configure o projeto
firebase init
```

5. **Execute o projeto**
```bash
npm run dev
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build para produção |
| `npm run preview` | Preview da build de produção |
| `npm run test` | Executa testes unitários |
| `npm run test:e2e` | Executa testes end-to-end |
| `npm run lint` | Verifica qualidade do código |
| `npm run format` | Formata código com Prettier |
| `npm run storybook` | Inicia Storybook |
| `npm run deploy` | Deploy para Firebase Hosting |

---

## 📋 Padrões de Desenvolvimento

### Estrutura de Componentes
```typescript
// Exemplo de componente Vue 3 + TypeScript
<template>
  <div class="component-name">
    <h2>{{ title }}</h2>
    <!-- Conteúdo do componente -->
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string
  data?: any[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  submit: [value: string]
}>()
</script>

<style scoped>
.component-name {
  @apply bg-white rounded-lg shadow-md p-4;
}
</style>
```

### Convenções de Nomenclatura
- **Componentes**: PascalCase (`UserProfile.vue`)
- **Composables**: camelCase com prefixo `use` (`useAuth.ts`)
- **Stores**: camelCase (`userStore.ts`)
- **Arquivos**: kebab-case (`user-profile.vue`)
- **Variáveis**: camelCase (`userName`)
- **Constantes**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)

### Estrutura de Commits
```bash
# Padrão: tipo(escopo): descrição
feat(auth): adicionar login com Google
fix(sorteios): corrigir validação de data
docs(readme): atualizar instruções de setup
```

### Code Review Checklist
- [ ] Tipagem TypeScript correta
- [ ] Componentes responsivos
- [ ] Testes unitários incluídos
- [ ] Documentação atualizada
- [ ] Performance otimizada
- [ ] Acessibilidade considerada

---

## 🔐 Sistema de Permissões

### Hierarquia de Usuários

| Tipo | Permissões | Funcionalidades |
|------|------------|-----------------|
| **Super Admin** | Controle total | Gerenciar tudo, configurações globais |
| **Admin** | Gestão completa | Criar sorteios, gerenciar usuários, relatórios |
| **Afiliado** | Vendas e comissões | Vender bilhetes, ver comissões, clientes |
| **Cliente** | Compras básicas | Comprar bilhetes, ver histórico |

### Guards de Rota
```typescript
// Exemplo de proteção de rota
const requireAuth = () => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    return '/login'
  }
}

const requireAdmin = () => {
  const { user } = useAuth()
  if (user.value?.role !== 'admin') {
    return '/unauthorized'
  }
}
```

---

## 🗃️ Gerenciamento de Estado

### Stores Pinia Principais

#### Auth Store
```typescript
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAuthenticated = computed(() => !!user.value)
  
  const login = async (email: string, password: string) => {
    // Lógica de login
  }
  
  const logout = async () => {
    // Lógica de logout
  }
  
  return {
    user,
    isAuthenticated,
    login,
    logout
  }
})
```

#### Sorteios Store
```typescript
// stores/sorteios.ts
export const useSorteiosStore = defineStore('sorteios', () => {
  const sorteios = ref<Sorteio[]>([])
  const loading = ref(false)
  
  const fetchSorteios = async () => {
    loading.value = true
    try {
      // Buscar sorteios do Firebase
    } finally {
      loading.value = false
    }
  }
  
  return {
    sorteios,
    loading,
    fetchSorteios
  }
})
```

---

## 🧪 Testes

### Estrutura de Testes
```
tests/
├── unit/              # Testes unitários
│   ├── components/    # Testes de componentes
│   ├── stores/        # Testes de stores
│   └── utils/         # Testes de utilitários
├── e2e/              # Testes end-to-end
└── fixtures/         # Dados de teste
```

### Exemplo de Teste Unitário
```typescript
// tests/unit/components/UserCard.test.ts
import { mount } from '@vue/test-utils'
import UserCard from '@/components/UserCard.vue'

describe('UserCard', () => {
  it('renders user information correctly', () => {
    const wrapper = mount(UserCard, {
      props: {
        user: {
          name: 'João Silva',
          email: 'joao@email.com'
        }
      }
    })
    
    expect(wrapper.text()).toContain('João Silva')
    expect(wrapper.text()).toContain('joao@email.com')
  })
})
```

### Executar Testes
```bash
# Testes unitários
npm run test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch

# Testes e2e
npm run test:e2e
```

---

## 🚀 Deploy e CI/CD

### Deploy Manual
```bash
# Build da aplicação
npm run build

# Deploy para Firebase
firebase deploy
```

### CI/CD com GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
      - run: npm run build
      - run: firebase deploy
```

### Ambientes
- **Desenvolvimento**: `localhost:5173`
- **Staging**: `staging.sorteio-umadrimc.web.app`
- **Produção**: `sorteio-umadrimc.web.app`

---

## 🔧 Manutenção

### Monitoramento
- **Firebase Analytics**: Métricas de uso
- **Error Tracking**: Sentry ou similar
- **Performance**: Core Web Vitals
- **Logs**: Firebase Functions logs

### Backup
- **Firestore**: Backup automático configurado
- **Storage**: Backup de imagens e arquivos
- **Código**: Git + GitHub

### Updates e Segurança
```bash
# Verificar atualizações de dependências
npm outdated

# Atualizar dependências
npm update

# Auditoria de segurança
npm audit
```

### Troubleshooting Comum

| Problema | Solução |
|----------|---------|
| Build falha | Verificar versões Node/npm |
| Firebase erro | Confirmar configuração de credenciais |
| Performance lenta | Analisar bundle size e lazy loading |
| Testes falhando | Verificar mocks e fixtures |

---

## 📚 Recursos Adicionais

### Storybook
Documentação interativa dos componentes:
```bash
npm run storybook
```
Acesse: `http://localhost:6006`

### Integrações Externas
- **Mercado Pago**: Pagamentos (planejado)
- **WhatsApp API**: Notificações
- **Email Service**: Confirmações e marketing
- **Analytics**: Google Analytics

### Links Úteis
- [Vue 3 Documentation](https://vuejs.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [Pinia Store](https://pinia.vuejs.org/)
- [TypeScript Guide](https://www.typescriptlang.org/)

### Contribuindo
1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Suporte
- **Email**: dev@umadrimc.com
- **Slack**: Canal #dev-sorteios
- **Issues**: GitHub Issues

---

**Última atualização**: Agosto 2025
**Versão da documentação**: 1.0.0