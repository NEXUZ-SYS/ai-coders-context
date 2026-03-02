---
status: draft
generated: 2026-03-02
agents:
  - type: "refactoring-specialist"
    role: "Migrar código .mjs para TypeScript seguindo padrões do projeto"
  - type: "feature-developer"
    role: "Implementar HandoffService, gateway MCP e comandos CLI"
  - type: "test-writer"
    role: "Escrever testes unitários e de integração"
phases:
  - id: "phase-1"
    name: "Migração: Hooks → TypeScript Service"
    prevc: "E"
    agent: "refactoring-specialist"
  - id: "phase-2"
    name: "Integração: MCP Gateway + CLI Commands"
    prevc: "E"
    agent: "feature-developer"
  - id: "phase-3"
    name: "Hook Installer + Wrapper Script"
    prevc: "E"
    agent: "feature-developer"
  - id: "phase-4"
    name: "Testes + Validação"
    prevc: "V"
    agent: "test-writer"
---

# Refatoração: Auto-Handoff como Extensão Nativa do ai-coders-context

> Integrar o sistema de auto-handoff ao projeto ai-coders-context como um módulo
> nativo, seguindo os mesmos padrões arquiteturais (Service Layer, Gateway Pattern,
> Dependency Injection), mantendo isolamento para atualizações do core.

## Problema

A implementação atual em `.claude/extensions/auto-handoff/` é standalone (.mjs).
Isso funciona, mas:
- Não segue os padrões TypeScript do projeto
- Não é exposta via MCP (não acessível por IA como ferramenta)
- Não tem CLI commands integrados
- Não se beneficia do build/test pipeline do projeto
- Dificulta distribuição via npm

## Estratégia de Isolamento

### O que NÃO modificar no core

A refatoração adiciona um **novo módulo** sem alterar lógica existente.
Modificações nos arquivos do core são **aditivas** (imports + registros):

| Arquivo Core | Modificação | Tipo |
|---|---|---|
| `src/services/mcp/mcpServer.ts` | + registrar tool `handoff` | Import + register |
| `src/services/mcp/gateway/index.ts` | + exportar handler | 1 linha de export |
| `src/services/mcp/gateway/types.ts` | + HandoffAction, HandoffParams | Adição de types |
| `src/index.ts` | + registrar comandos `handoff:*` | Import + commands |

### O que é novo (isolado)

```
src/services/handoff/           ← NOVO módulo completo
├── index.ts
├── types.ts
├── handoffService.ts
├── tokenEstimator.ts
├── transcriptReader.ts
├── stateManager.ts
├── contextSummarizer.ts
├── handoffGenerator.ts
├── hookInstaller.ts
├── hooks/                      ← Scripts standalone (.mjs) distribuídos via npm
│   ├── monitor.mjs
│   ├── pre-compact.mjs
│   ├── session-start.mjs
│   ├── on-stop.mjs
│   ├── generate-prompt.mjs
│   └── lib/
│       ├── token-estimator.mjs
│       ├── transcript-reader.mjs
│       ├── state-manager.mjs
│       ├── context-summarizer.mjs
│       ├── handoff-generator.mjs
│       └── utils/
│           ├── config-loader.mjs
│           ├── hook-io.mjs
│           └── logger.mjs
├── templates/
│   ├── config.json             ← Config padrão
│   └── auto-handoff.sh         ← Wrapper script
└── __tests__/
    ├── tokenEstimator.test.ts
    ├── transcriptReader.test.ts
    ├── stateManager.test.ts
    └── handoffService.test.ts

src/services/mcp/gateway/
└── handoff.ts                  ← NOVO gateway handler
```

### Fluxo de Atualização do Core

Quando o mantenedor liberar uma nova versão:

1. `git pull` traz mudanças no core
2. `src/services/handoff/` permanece intacto (diretório novo, sem conflitos)
3. As 4 linhas aditivas nos arquivos core (`mcpServer.ts`, `index.ts`, `gateway/index.ts`, `gateway/types.ts`) podem gerar merge conflicts mínimos → facilmente resolvidos
4. Hooks instalados no projeto do usuário (`.claude/extensions/auto-handoff/`) ficam intactos

### Dual Architecture: TypeScript + Standalone Hooks

```
┌─────────────────────────────────────────────────────────┐
│          ai-coders-context (TypeScript/npm)              │
│                                                         │
│  src/services/handoff/                                  │
│  ├── handoffService.ts    ← Service Layer (TS)          │
│  ├── tokenEstimator.ts    ← Lógica core (TS)            │
│  ├── ...                                                │
│  └── hooks/               ← Scripts standalone (.mjs)   │
│      ├── monitor.mjs      ← Executado pelo Claude Code  │
│      └── lib/             ← Lib duplicada (standalone)   │
│                                                         │
│  src/services/mcp/gateway/handoff.ts ← MCP Gateway      │
│  src/index.ts                        ← CLI commands      │
│                                                         │
│  Quando `npx @ai-coders/context handoff:install`:       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Copia hooks/ → .claude/extensions/auto-handoff/ │    │
│  │  Configura .claude/settings.json (hooks)         │    │
│  │  Gera config.json + auto-handoff.sh              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│        Projeto do Usuário (.claude/)                    │
│                                                         │
│  .claude/                                               │
│  ├── settings.json         ← Hooks configurados         │
│  └── extensions/                                        │
│      └── auto-handoff/     ← Cópia standalone dos hooks │
│          ├── config.json                                │
│          ├── auto-handoff.sh                            │
│          └── src/          ← Hooks .mjs (standalone)    │
│              ├── monitor.mjs                            │
│              ├── pre-compact.mjs                        │
│              ├── session-start.mjs                      │
│              ├── on-stop.mjs                            │
│              └── lib/                                   │
└─────────────────────────────────────────────────────────┘
```

**Por que duplicar?** Os hooks Claude Code executam como processos Node.js independentes.
Eles NÃO podem importar do build TypeScript compilado. Precisam ser self-contained.
A versão TypeScript serve para o MCP gateway e CLI commands.

## Novo MCP Gateway Tool: `handoff`

### Tipo: Gateway (action-based, padrão existente)

```typescript
// gateway/types.ts - adição
export type HandoffAction = 'install' | 'uninstall' | 'status' | 'config' | 'clean' | 'trigger';

export interface HandoffParams {
  action: HandoffAction;
  repoPath?: string;
  target?: 'project' | 'user';
  contextLimit?: number;
  proactiveThreshold?: number;
  reactiveThreshold?: number;
  debug?: boolean;
  reason?: string;
}
```

### Actions

| Action | Descrição | Retorno |
|--------|-----------|---------|
| `install` | Instala hooks no projeto ou user settings | Caminhos configurados |
| `uninstall` | Remove hooks do settings.json | Confirmação |
| `status` | Estado atual: sessão, tokens, threshold | Métricas de saúde |
| `config` | Lê/atualiza configuração | Config atual |
| `clean` | Limpa estado e sessões antigas | Arquivos removidos |
| `trigger` | Força handoff manual (salva estado) | Handoff pending criado |

### Registro no MCP Server (adição em `mcpServer.ts`)

```typescript
// Tool 10: handoff - Auto-handoff context preservation
this.server.registerTool('handoff', {
  description: `Auto-handoff context preservation to prevent compaction loss. Actions:
- install: Install auto-handoff hooks in project (params: target?)
- uninstall: Remove auto-handoff hooks
- status: Get current context health and session state
- config: Read/update handoff configuration (params: contextLimit?, proactiveThreshold?, debug?)
- clean: Clean up old session state
- trigger: Manually trigger a handoff save (params: reason?)`,
  inputSchema: {
    action: z.enum(['install', 'uninstall', 'status', 'config', 'clean', 'trigger']),
    repoPath: z.string().optional(),
    target: z.enum(['project', 'user']).optional(),
    contextLimit: z.number().optional(),
    proactiveThreshold: z.number().optional(),
    reactiveThreshold: z.number().optional(),
    debug: z.boolean().optional(),
    reason: z.string().optional(),
  }
}, wrap('handoff', async (params) => {
  return handleHandoff(params as HandoffParams, { repoPath: this.getRepoPath() });
}));
```

## Novos CLI Commands (adição em `src/index.ts`)

```bash
# Instalar hooks no projeto
npx @ai-coders/context handoff:install [--project|--user]

# Ver status do handoff (tokens, threshold, sessão)
npx @ai-coders/context handoff:status

# Atualizar configuração
npx @ai-coders/context handoff:config --threshold 85 --limit 200000

# Limpar estado e sessões antigas
npx @ai-coders/context handoff:clean

# Rodar em modo autônomo (wrapper script)
npx @ai-coders/context handoff:run --prompt task.md [--max 10]

# Remover hooks
npx @ai-coders/context handoff:uninstall
```

## HandoffService (Service Layer Pattern)

Segue o padrão de DI do projeto (`BaseDependencies`):

```typescript
// src/services/handoff/handoffService.ts

export class HandoffService {
  private repoPath: string;
  private stateManager: StateManager;
  private tokenEstimator: TokenEstimator;

  constructor(repoPath: string, deps?: Partial<HandoffDependencies>) { ... }

  // API Pública (MCP + CLI)
  async install(target: 'project' | 'user'): Promise<InstallResult> { ... }
  async uninstall(target: 'project' | 'user'): Promise<void> { ... }
  async getStatus(): Promise<HandoffStatus> { ... }
  async getConfig(): Promise<HandoffConfig> { ... }
  async updateConfig(updates: Partial<HandoffConfig>): Promise<HandoffConfig> { ... }
  async clean(): Promise<CleanResult> { ... }
  async triggerHandoff(reason?: string): Promise<void> { ... }
  async isInstalled(): Promise<boolean> { ... }
  async getContextHealth(transcriptPath: string): Promise<ContextHealth> { ... }
}
```

## Fases de Implementação

### Fase 1 — Migração: Hooks → TypeScript Service
> **Agente**: refactoring-specialist

**Objetivo**: Criar `src/services/handoff/` com a lógica core em TypeScript.

| # | Task | Status | Entregável |
|---|------|--------|------------|
| 1.1 | Criar `types.ts` com todas as interfaces (HandoffConfig, ContextHealth, etc.) | pending | Types |
| 1.2 | Migrar `token-estimator.mjs` → `tokenEstimator.ts` | pending | TS module |
| 1.3 | Migrar `transcript-reader.mjs` → `transcriptReader.ts` | pending | TS module |
| 1.4 | Migrar `state-manager.mjs` → `stateManager.ts` (repoPath dinâmico) | pending | TS module |
| 1.5 | Migrar `context-summarizer.mjs` → `contextSummarizer.ts` | pending | TS module |
| 1.6 | Migrar `handoff-generator.mjs` → `handoffGenerator.ts` | pending | TS module |
| 1.7 | Criar `handoffService.ts` (Service Layer com DI) | pending | Service class |
| 1.8 | Criar `index.ts` (exports públicos) | pending | Module exports |

### Fase 2 — Integração: MCP Gateway + CLI Commands
> **Agente**: feature-developer

| # | Task | Status | Entregável |
|---|------|--------|------------|
| 2.1 | Criar `src/services/mcp/gateway/handoff.ts` (handler seguindo padrão existente) | pending | Gateway |
| 2.2 | Adicionar `HandoffAction` + `HandoffParams` em `gateway/types.ts` | pending | Types |
| 2.3 | Exportar handler em `gateway/index.ts` | pending | Export |
| 2.4 | Registrar tool `handoff` em `mcpServer.ts` (Zod schema + handler) | pending | Registration |
| 2.5 | Registrar comandos `handoff:*` em `src/index.ts` | pending | CLI |

### Fase 3 — Hook Installer + Wrapper
> **Agente**: feature-developer

| # | Task | Status | Entregável |
|---|------|--------|------------|
| 3.1 | Criar `hookInstaller.ts` (copia hooks, configura settings.json) | pending | Installer |
| 3.2 | Mover hooks .mjs para `src/services/handoff/hooks/` | pending | Scripts |
| 3.3 | Criar templates/ (config.json, auto-handoff.sh) | pending | Templates |
| 3.4 | Adicionar `src/services/handoff/hooks/**` ao `files` do package.json | pending | npm pkg |
| 3.5 | Testar `handoff:install` + `handoff:run` end-to-end | pending | E2E |

### Fase 4 — Testes + Validação
> **Agente**: test-writer

| # | Task | Status | Entregável |
|---|------|--------|------------|
| 4.1 | Testes unitários p/ tokenEstimator, transcriptReader, stateManager | pending | Tests |
| 4.2 | Testes para handoffService | pending | Tests |
| 4.3 | Testes para gateway handler | pending | Tests |
| 4.4 | Validação: install → uso → compactação → restore | pending | E2E |
| 4.5 | Limpar implementação anterior de `.claude/extensions/` | pending | Cleanup |

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Merge conflicts em updates do core | Modificações são mínimas (4 arquivos, linhas aditivas) |
| Hooks desatualizados nos projetos | `handoff:install` sempre copia versão mais recente |
| Build quebra com novo módulo | Sem deps de outros serviços; isolamento total |
| Hooks não funcionam após build | Hooks são .mjs pré-compilados, independentes do TS |

## Critérios de Sucesso

- [ ] `npx @ai-coders/context handoff:install` instala hooks funcionais
- [ ] MCP tool `handoff({ action: "status" })` retorna saúde do contexto
- [ ] Hooks preservam contexto antes da compactação (PreCompact)
- [ ] `handoff:run` executa wrapper em modo autônomo
- [ ] Zero modificações na lógica de serviços existentes
- [ ] Testes passam no pipeline (`npm test`)
- [ ] `npm publish` inclui hooks standalone
