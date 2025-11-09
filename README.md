# Trivia Dashboard - Sistema de Documentação Orientado a Agents

## 🎯 Visão Geral

Plataforma web para noites de trivia cinematográfico entre amigos, com sistema de documentação padronizado e orientado a agents especializados (Dev, PO, QA, Owner).

## 🚀 Como Começar

### Setup Rápido

```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Build para produção
npm run build
```

### Documentação

Toda a documentação está organizada na pasta `docs/`:

- [docs/README.md](./docs/README.md) - Navegação geral da documentação
- [docs/project.md](./docs/project.md) - Visão geral do projeto (PRD, Arquitetura, Contexto, Design)
- [docs/features.md](./docs/features.md) - Features implementadas e planejadas
- [docs/development.md](./docs/development.md) - Guias de desenvolvimento (Agents, Workflow, Permissões)
- [docs/tasks.md](./docs/tasks.md) - Sistema de tickets e gestão de tarefas
- [docs/infrastructure.md](./docs/infrastructure.md) - Setup Firebase e Quick Start

## 🏗️ Arquitetura

- **Framework**: React 19 + TypeScript (strict)
- **Build**: Vite para desenvolvimento e build
- **UI**: Tailwind CSS + sistema de temas dinâmico
- **Estado**: React Context + hooks customizados
- **Persistência**: Firebase (Firestore + Auth + Hosting)
- **Agents**: Sistema orientado a agents especializados

## 👥 Agents e Responsabilidades

### 🔧 Dev Agent

- Implementação e refatoração de código
- Manutenção da arquitetura técnica
- Atualização de documentação técnica

### 📋 PO Agent

- Definição e priorização de requisitos
- Validação de features implementadas
- Gestão do backlog

### 🧪 QA Agent

- Testes e validação de features
- Aprovação de qualidade
- Reporte de bugs

### 👑 Owner (Você)

- Controle total do projeto
- Releases e commits
- Gestão de permissões

## 📊 Sistema de Tickets

Estados: `Backlog → To-Do → Development → Ready to QA → QA → Pending Feature → Release → Done`

- **Prefixo**: `TRIVIA-XXXX`
- **Categorias**: Bugs e Features
- **Níveis**: 1-4 (Crítico/Alto/Médio/Baixo)
- **Workflow**: Automatizado com gates de controle

## 🔄 Workflow de Desenvolvimento

1. **PO Agent** define requisitos e prioriza backlog
2. **Dev Agent** implementa features e sugere commits
3. **QA Agent** testa e valida qualidade
4. **Owner** aprova e executa releases

## 📁 Estrutura do Projeto

```
src/
├── app/                    # Configuração da aplicação
│   ├── providers/         # Context providers
│   └── router/           # Configuração de rotas
├── modules/              # Módulos por funcionalidade
│   ├── landing/         # Página inicial
│   ├── control/         # Dashboard de controle
│   ├── display/         # Tela de exibição
│   └── trivia/          # Lógica do trivia
├── components/          # Componentes reutilizáveis
│   └── ui/             # Componentes de interface
├── hooks/              # Hooks customizados
├── lib/                # Configurações e utilitários
├── styles/             # Estilos globais
└── utils/              # Funções utilitárias
```

## 🎮 Funcionalidades

### ✅ Implementadas

- Dashboard de controle interativo
- Sistema de turnos e pontuação
- Múltiplos temas visuais
- Modo mímica integrado
- Gestão de times e participantes

### 🚧 Em Desenvolvimento

- Integração Firebase completa
- Sincronização real-time
- Sistema de logging
- Deploy em produção

## 🔐 Permissões

- **Commits**: Apenas Owner
- **Releases**: Apenas Owner
- **Instalações**: Apenas Owner
- **Código**: Dev Agent (sugere commits)
- **Testes**: QA Agent
- **Requisitos**: PO Agent

## 📚 Documentação Completa

Toda a documentação está em `docs/`:

- [docs/project.md](./docs/project.md) - PRD, Arquitetura, Contexto e Design
- [docs/features.md](./docs/features.md) - Features e funcionalidades
- [docs/development.md](./docs/development.md) - Agents, Workflow, Permissões, Automação
- [docs/tasks.md](./docs/tasks.md) - Tickets, Squads e Epics
- [docs/infrastructure.md](./docs/infrastructure.md) - Setup e configuração
- [docs/implementation/](./docs/implementation/) - Histórico de implementações

## 🚀 Deploy

```bash
# Build para produção
npm run build

# Deploy no Firebase Hosting
npm run deploy
```

## 🤝 Contribuição

Este projeto segue um sistema de documentação orientado a agents. Para contribuir:

1. Consulte [docs/development.md](./docs/development.md) para entender papéis e permissões
2. Verifique [docs/tasks.md](./docs/tasks.md) para sistema de tickets
3. Siga [.cursorrules](./.cursorrules) para diretrizes de desenvolvimento
4. Veja [docs/features.md](./docs/features.md) para features implementadas

## 📄 Licença

Projeto privado - Todos os direitos reservados

---

**Última atualização**: Dezembro 2024  
**Versão**: MVP - Desenvolvimento Ativo  
**Sistema**: Orientado a Agents
