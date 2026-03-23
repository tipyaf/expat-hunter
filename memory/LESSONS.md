# Lessons Learned

Recurring failures and lessons learned across sessions. Every agent MUST read this file before starting work.

## How to use
- **Read**: Before starting any task, check if a relevant lesson exists
- **Write**: When the same mistake happens twice, log it here
- **Format**: Each lesson has a category, description, and the rule to follow

## Lessons

### [UI] Hardcoded colors instead of design system
**Problem**: PR #27 used `text-blue-800` instead of CSS variables. The card was unreadable.
**Root cause**: Developer didn't check existing design system reference (market-snapshot.tsx).
**Rule**: Always grep for the design system reference component before writing any UI. Use CSS variables from the design system, never Tailwind color classes directly.

### [Validation] Declaring done without runtime verification
**Problem**: PR #27 and #28 were declared "done" with "0 TS errors" but features didn't work visually or at runtime.
**Root cause**: Developer validated TypeScript compilation but never started the app or took screenshots.
**Rule**: Never declare done without: 1) starting the dev server, 2) visiting the modified page, 3) taking a screenshot, 4) curling modified endpoints.

### [Validation] Always validate both dark mode AND light mode
**Problem**: sc-27 was declared validated with only a dark mode screenshot. Light mode was not checked.
**Root cause**: Validator took one screenshot and assumed the other mode was fine.
**Rule**: Every UI change MUST be validated visually in BOTH dark and light mode. Two screenshots minimum. Never skip one mode.

### [UI] Tailwind prose overrides design system colors
**Problem**: sc-28 chat markdown used `prose` class which overrides text color with its own value, ignoring the parent's `text-[var(--color-text-main)]`. Text was unreadable in light mode.
**Root cause**: `prose` applies its own color scheme that takes precedence over inherited CSS variables.
**Rule**: When using `prose` for markdown rendering, ALWAYS force design system colors via `text-[var(--color-text-main)]`, `prose-strong:text-[var(--color-text-main)]`, `prose-headings:text-[var(--color-text-main)]`. Never rely on prose default colors.

### [Workflow] Shortcut story state not updated during work
**Problem**: sc-57, sc-58, sc-59 were never moved to "In Progress" before starting the research work. They went directly from "To Do" to "Done".
**Root cause**: Agent started working without updating the story state first.
**Rule**: ALWAYS update Shortcut story state in real-time at each transition: To Do → In Progress (500000008, start dev) → In Review (500000009, start review/validation) → Done (500000010, validated). Never skip a state.

### [Workflow] Segmenter les tickets en tâches (checklist)
**Problem**: Les tickets sc-57/58/59 ont été réalisés sans tâches, impossible de savoir ce qui est fait vs ce qui reste.
**Root cause**: L'agent a travaillé sur le ticket sans le découper en sous-tâches traçables.
**Rule**: TOUJOURS ajouter des tâches (stories-add-task) dans un ticket Shortcut AVANT de commencer le travail. Chaque étape significative = une tâche. Cocher les tâches au fur et à mesure (stories-update-task isCompleted). Cela permet de savoir exactement où on en est à tout moment, même si la session est interrompue.

### [Quality] TOUJOURS écrire les TU avant de déclarer terminé
**Problem**: sc-60 — 4 services modifiés (visa_sponsor_registry, email_enricher, company_enricher, sourcing_service) sans aucun test unitaire. Détecté en review par l'utilisateur.
**Root cause**: L'agent a implémenté le code et déclaré "done" sans écrire les tests, alors que le framework l'exige (Phase 4: Test).
**Rule**: TOUTE modification de code DOIT être accompagnée de tests unitaires AVANT de pousser. C'est dans les specs du framework (Phase 4). Ne JAMAIS déclarer terminé sans : 1) TU écrits et passants pour chaque fonction modifiée, 2) e2e vérifié si impact frontend. Les TU ne sont PAS optionnels.
