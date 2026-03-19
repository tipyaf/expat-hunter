# expat-hunter

Generated with [ai-spec-driven-generator](https://github.com/tipyaf/ai-spec-driven-generator).

## Quick start

1. Open this project in Cursor or Claude Code
2. The AI reads `CLAUDE.md` and follows the framework workflow
3. Describe your project idea, or provide a YAML spec in `specs/`
4. Follow the phase-by-phase process with human validation

## Structure

```
expat-hunter/
├── framework/           # Git submodule — AI framework (agents, prompts, rules)
├── specs/               # Project specs (YAML, UX, architecture)
├── memory/              # Project memory (decisions, phase status)
├── stacks/              # Stack profiles (coding & security contracts)
├── apps/                # Application code (created during scaffold phase)
├── packages/            # Shared packages (created during scaffold phase)
├── CLAUDE.md            # AI instructions (generated from framework template)
└── .cursorrules         # Cursor rules (generated from framework template)
```

## Update framework

```bash
git submodule update --remote framework
```
