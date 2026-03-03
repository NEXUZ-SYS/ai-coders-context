# AGENTS.md

> Regras para agentes AI neste projeto.
> Compativel com: **Claude Code**, **Cursor**, **Codex**, **Gemini CLI** e outros.

---

## Handoff de Contexto

Ao iniciar sessao, verificar se existe contexto pendente:
```bash
cat .context/workflow/handoff.yaml 2>/dev/null
```
Se existir, informar o usuario e perguntar se deseja retomar.

Pergunte: "qual o status do handoff?" ou use `/handoff`

📖 Detalhes: `.context/skills/handoff/SKILL.md`

---

## AI Context References
- Documentation: `.context/docs/README.md`
- Agents: `.context/agents/README.md`
- Skills: `.context/skills/`
- Handoff service: `src/services/handoff/`
- Plans: `.context/plans/`
