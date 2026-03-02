# AGENTS.md

> Este arquivo define regras para todos os agentes AI que trabalham neste projeto.
> Compativel com: **Claude Code**, **Cursor**, **Codex**, **Gemini CLI** e outros.
>
> Project: ai-coders-context
> MCP tool for AI context management

---

## Handoff de Contexto (AUTOMATICO)

> **IMPORTANTE:** Este projeto possui um sistema de auto-handoff integrado
> (`src/services/handoff/`) que previne perda de contexto por compactacao.

### Ao iniciar uma nova sessao

O AI DEVE verificar se existe um arquivo de handoff:

```bash
cat .context/workflow/handoff.yaml 2>/dev/null
```

#### Se o arquivo existir:

1. **Ler o conteudo** para entender o contexto
2. **Informar o usuario** sobre a continuidade:
   - De qual branch veio
   - Qual o proposito desta branch
   - Proximos passos sugeridos
3. **Perguntar** se deseja continuar de onde parou

#### Comando manual (se necessario):

O usuario pode pedir explicitamente:
- "verificar handoff"
- "continuar de onde parei"
- "ler contexto anterior"

### MCP Handoff Tool

O handoff tambem esta disponivel via MCP:

| Acao | Descricao |
|------|-----------|
| `handoff({ action: "status" })` | Ver status do contexto e saude da sessao |
| `handoff({ action: "trigger", reason: "..." })` | Disparar handoff manualmente |
| `handoff({ action: "install" })` | Instalar hooks de auto-handoff |
| `handoff({ action: "config" })` | Ver/ajustar configuracao |
| `handoff({ action: "clean" })` | Limpar estado de handoff |

### Auto-Handoff (3 camadas de protecao)

| Camada | Hook | Threshold | Descricao |
|--------|------|-----------|-----------|
| **Proativa** | Stop | 80% | Bloqueia sessao e dispara handoff antes da compactacao |
| **Reativa** | PreCompact | — | Salva snapshot do transcript antes da compactacao |
| **Restauracao** | SessionStart | — | Injeta contexto salvo ao iniciar/retomar sessao |

Instalar com: `handoff({ action: "install" })`

---

## Salvar Trabalho — Tiers (Escolha do Usuario)

> **REGRA:** Quando o usuario pedir "salvar o trabalho", "parar por hoje", etc.,
> **NAO salvar tudo automaticamente**. Apresentar opcoes ao usuario.
> Salvar APENAS o que o usuario escolher.

### Opcoes (apresentar via AskUserQuestion)

| Opcao | O que salva | Custo estimado |
|-------|-------------|----------------|
| **1. Resumo em tela** (Recomendado) | Imprime resumo da sessao na tela. Retomar com `/resume` ou `/continue` | ~200 tokens (apenas output) |
| **2. Handoff** | Cria `.context/workflow/handoff.yaml` com branch, tarefas, proximos passos | ~800 tokens |
| **3. Handoff + Workflow** | Opcao 2 + atualiza `workflow-status` e avanca fase se necessario | ~1,500 tokens |
| **4. Handoff + Workflow + Napkin** | Opcao 3 + registra licoes aprendidas no `.claude/napkin.md` + resumo em tela | ~3,000 tokens |

### Formato do resumo em tela (Opcao 1 e 4)

```
## Resumo da Sessao
- **Branch**: <branch-atual>
- **Workflow**: <fase-atual>
- **Concluido**: <lista>
- **Pendente**: <lista>
- **Decisoes**: <decisoes-chave>
```

> O usuario pode copiar este resumo e colar em `/resume` ou `/continue` na proxima sessao.
> Isto e a opcao mais economica e funcional.

---

## Handoff Skill

**Gatilhos de pausa**: "parar por hoje", "continuar amanha", "salvar trabalho"
→ Perguntar se quer salvar contexto para retomar depois

**Ao iniciar sessao**: Verificar `.context/workflow/handoff.yaml`

**Comando**: `/handoff`

📖 `.context/skills/handoff/SKILL.md`

📖 Regras completas na secao "Salvar Trabalho — Tiers" acima.

---

## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`
- Skills: `.context/skills/`
- Handoff service: `src/services/handoff/`
- Plans: `.context/plans/`

