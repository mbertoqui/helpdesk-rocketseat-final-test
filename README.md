# HelpDesk

Sistema completo de gerenciamento de chamados com autenticação, painel por perfil e estrutura pronta para seguir em um novo repositório GitHub.

## Visão geral

Este projeto foi pensado para gerenciar chamados de suporte em três perfis principais:

- Admin: gerencia usuários, serviços e tickets.
- Técnico: acompanha e resolve chamados atribuídos.
- Cliente: cria, acompanha e consulta seus chamados.

A aplicação foi construída com frontend em React e backend em Node.js com Express + Prisma, com foco em organização, escalabilidade e experiência de uso.

## Stack

### Backend
- Node.js
- Express
- Prisma ORM
- PostgreSQL
- JWT para autenticação
- bcrypt para criptografia de senhas

### Frontend
- React
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- React Hook Form
- Zod
- Axios
- Recharts

## Funcionalidades principais

- Login e registro de usuários
- Autenticação por token JWT
- Proteção de rotas por perfil
- Dashboard por tipo de usuário
- Gestão de clientes, técnicos e serviços
- Fluxo de chamados com status e acompanhamento
- Estrutura pronta para evolução e extensão

## Estrutura do projeto

- backend/: API, Prisma, autenticação e regras de negócio
- frontend/: interface web em React + Vite
- README.md: documentação do projeto

## Requisitos

- Node.js 18+
- npm ou pnpm
- PostgreSQL em execução local ou via container

## Como rodar localmente

Antes de iniciar o backend, copie o arquivo .env.example para .env e ajuste as variáveis de ambiente conforme sua máquina:

```bash
cd backend
cp .env.example .env
```

> O backend e a API do frontend usam a porta 3001 por padrão, então mantenha o valor `PORT=3001` no arquivo `.env` para evitar conflitos de conexão.

### 1) Backend

```bash
cd backend
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
```

### 2) Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev -- --host 0.0.0.0
```

### 3) Acesse

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Credenciais de teste

Após iniciar o banco PostgreSQL e rodar as migrações, o seed cria os usuários de exemplo abaixo:

- Admin: admin@helpdesk.com / admin123
- Técnico: tecnico1@helpdesk.com / tecnico123
- Cliente: cliente1@email.com / cliente123

## Observações

- O backend usa PostgreSQL por padrão, então a conexão deve estar configurada no arquivo `.env` antes da primeira execução.
- As credenciais acima são apenas para ambiente de desenvolvimento/teste.

## Verificação rápida

Para validar que a API principal está subindo corretamente, execute:

```bash
cd backend
npx jest --runInBand
```

---

Desenvolvido por @MBertoqui.
