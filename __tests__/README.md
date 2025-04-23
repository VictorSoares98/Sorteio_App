# Estrutura de Testes

Este diretório contém as configurações globais e helpers para testes do projeto.

## Organização

### Tipos de Teste

Os testes são organizados em várias categorias:

- **Unitários**: Testes que verificam unidades isoladas de código
- **Integração**: Testes que verificam a interação entre componentes
- **Visuais**: Testes que verificam a aparência visual dos componentes
- **E2E**: Testes que simulam o uso da aplicação por um usuário real

### Estrutura de Diretórios

```
src/
├── components/
│   ├── ComponentA.vue
│   ├── ComponentA.test.ts         # Testes unitários junto ao componente
│   └── __tests__/                 # Testes adicionais específicos do componente
│       ├── ComponentA.spec.ts     # Testes de integração
│       └── ComponentA.visual.ts   # Testes visuais
├── stores/
│   ├── storeA.ts
│   └── storeA.test.ts             # Testes unitários junto ao store
└── views/
    ├── ViewA.vue
    └── __tests__/                 # Testes específicos para as views
        └── ViewA.e2e.ts           # Testes e2e
```

## Convenções de Nomenclatura

- `.test.ts`: Testes unitários simples (co-localizados com os arquivos de origem)
- `.spec.ts`: Testes de integração (geralmente na pasta `__tests__`)
- `.visual.ts`: Testes visuais (screenshots, snapshots)
- `.e2e.ts`: Testes end-to-end

## Execução dos Testes

```bash
# Executa todos os testes
npm run test

# Executa testes unitários
npm run test:unit

# Executa testes de integração
npm run test:integration

# Executa testes visuais
npm run test:visual

# Executa testes e2e
npm run test:e2e
```
