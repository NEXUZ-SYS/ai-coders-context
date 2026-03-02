---
type: skill
name: handoff
description: Save and recover context between sessions. Detects pause intent, creates handoff.yaml, and integrates with the auto-handoff system for context preservation.
skillSlug: handoff
phases: [P, E]
mode: true
priority: high
autoActivate: true
---

# Handoff - Salvar e Retomar Contexto

**Skill para salvar e recuperar contexto entre sessoes de trabalho.**
Integra-se com o sistema auto-handoff (`src/services/handoff/`) para preservacao automatica de contexto.

## Comandos

| Comando | Descricao |
|---------|-----------|
| `/handoff` | Verificar e mostrar contexto de handoff |
| `/handoff clear` | Limpar handoff (trabalho concluido) |
| `/handoff status` | Status resumido |

## MCP Tool (Programatico)

O sistema de handoff tambem esta disponivel via MCP:

| Acao | Descricao |
|------|-----------|
| `handoff({ action: "diagnose" })` | Diagnosticar nivel de protecao (none/skill-only/partial/full) |
| `handoff({ action: "status" })` | Ver status do contexto e saude da sessao |
| `handoff({ action: "install" })` | Instalar/upgrade para auto-handoff completo (funciona mesmo com handoff parcial) |
| `handoff({ action: "trigger", reason: "..." })` | Disparar handoff manualmente |
| `handoff({ action: "setup" })` | Setup leve — injeta AGENTS.md + copia skill (sem hooks) |
| `handoff({ action: "config" })` | Ver/ajustar configuracao |
| `handoff({ action: "clean" })` | Limpar estado de handoff |
| `handoff({ action: "uninstall" })` | Remover hooks de auto-handoff |

## Gatilhos de Deteccao

### Gatilhos de Pausa
Quando o usuario disser algo como:
- "parar por hoje", "continuar amanha", "salvar trabalho", "pause"
- "vou parar", "ate amanha", "save progress"

**Acao**: Perguntar se quer salvar contexto para retomar depois.

### Gatilhos de Retomada
Quando o usuario disser algo como:
- "continuar de onde parei", "o que eu estava fazendo"
- "retomar", "continue", "where did I stop"

**Acao**: Verificar handoff.yaml e apresentar contexto.

## Fluxo de CRIACAO (Salvar Contexto)

Quando detectar intencao de pausa:

1. **Perguntar ao usuario**:
   ```json
   {
     "questions": [{
       "question": "Quer salvar contexto para retomar depois?",
       "header": "Handoff",
       "multiSelect": false,
       "options": [
         { "label": "Sim, salvar contexto (Recomendado)", "description": "Cria handoff.yaml com estado atual" },
         { "label": "Nao, apenas parar", "description": "Encerrar sem salvar contexto" }
       ]
     }]
   }
   ```

2. **Se sim, criar `.context/workflow/handoff.yaml`**:
   ```yaml
   # AI Handoff Context
   handoff:
     created_at: "<timestamp>"
     branch: "<branch-atual>"
     working_dir: "<diretorio-atual>"
     session_type: "<tipo>"

   context:
     current_task: "<descricao do trabalho atual>"
     progress: "<porcentagem e status>"
     completed_today:
       - "<item completado 1>"
       - "<item completado 2>"
     next_steps:
       - "<proximo passo 1>"
       - "<proximo passo 2>"

   decisions:
     <decisao-chave>: "<valor>"

   files_modified:
     - <arquivo1>
     - <arquivo2>

   notes: |
     <notas adicionais>
   ```

3. **Informar**: "Use `/handoff` para retomar na proxima sessao"

## Fluxo de LEITURA (Retomar Contexto)

Ao iniciar uma nova sessao:

1. **Verificar se existe handoff.yaml**:
   ```bash
   HANDOFF_FILE=".context/workflow/handoff.yaml"
   if [ -f "$HANDOFF_FILE" ]; then
       cat "$HANDOFF_FILE"
   fi
   ```

2. **Se existir, apresentar contexto e perguntar**:
   ```json
   {
     "questions": [{
       "question": "Encontrei contexto de sessao anterior. O que deseja fazer?",
       "header": "Handoff",
       "multiSelect": false,
       "options": [
         { "label": "Continuar trabalho (Recomendado)", "description": "Ver detalhes e continuar de onde parou" },
         { "label": "Ignorar handoff", "description": "Comecar do zero sem contexto anterior" },
         { "label": "Limpar handoff", "description": "Remover arquivo (trabalho concluido)" }
       ]
     }]
   }
   ```

3. **Acoes baseadas na escolha**:
   - **Continuar**: Mostrar detalhes completos, sugerir proximos passos
   - **Ignorar**: Prosseguir normalmente, manter arquivo
   - **Limpar**: Remover handoff.yaml

## Niveis de Protecao

| Nivel | Descricao | Componentes |
|-------|-----------|-------------|
| `none` | Nenhum handoff | Nada instalado |
| `skill-only` | Manual (skill + AGENTS.md) | Handoff por comando, sem contagem de tokens |
| `partial` | Incompleto | Alguns hooks presentes, instalacao incompleta |
| `full` | Automatico completo | Hooks + contagem de tokens + 3 camadas de protecao |

Use `handoff({ action: "diagnose" })` para verificar o nivel atual.
Use `handoff({ action: "install" })` para fazer upgrade de qualquer nivel para `full`.

## Auto-Handoff (Protecao Automatica — nivel `full`)

O sistema de auto-handoff oferece 3 camadas de protecao contra perda de contexto:

| Camada | Hook | Descricao |
|--------|------|-----------|
| **Proativa** | Stop (80%) | Bloqueia sessao e dispara handoff antes da compactacao |
| **Reativa** | PreCompact (95%) | Salva snapshot do transcript antes da compactacao |
| **Restauracao** | SessionStart | Injeta contexto salvo ao iniciar/retomar sessao |
| **Monitor** | PostToolUse | Monitora tokens a cada chamada de ferramenta |

Instalar/upgrade com: `handoff({ action: "install" })`

## Integracao com Workflow PREVC

O handoff trabalha em conjunto com o sistema de workflow:
1. **Handoff** fornece contexto de ONDE parou
2. **Workflow** fornece contexto de QUAL FASE esta

Ao retomar, verificar ambos:
```bash
cat .context/workflow/handoff.yaml 2>/dev/null
cat .context/workflow/status.yaml 2>/dev/null
```

## Ativacao Automatica

Esta skill e ativada automaticamente quando:
1. Nova sessao em um projeto com handoff.yaml existente
2. Usuario expressa intencao de pausa
3. Usuario pede para retomar trabalho anterior
4. Hooks de auto-handoff detectam threshold de contexto

## Referencias

- Servico de handoff: `src/services/handoff/`
- Workflow PREVC: `.context/workflow/status.yaml`
- Plans: `.context/plans/`
