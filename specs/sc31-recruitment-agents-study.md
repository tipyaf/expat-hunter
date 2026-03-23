# Étude : Agents IA dédiés au recrutement et à l'organisation d'entreprise
# sc-31 — ExpatHunter

> Auteur : Agent architecte
> Date : 2026-03-23
> Contexte : Pipeline de contacts qualifiés (sc-31), SectorTitleService

---

## 1. Problème posé

Le `SectorTitleService` a besoin de deux choses :
1. Une base statique de titres de postes cibles par secteur, pays et niveau hiérarchique
2. Un prompt LLM fallback capable de générer des titres pertinents pour tout secteur inconnu

La question est : faut-il créer 1 ou 2 agents IA dédiés à ExpatHunter pour construire et maintenir ces artefacts ?

---

## 2. Étude comparative : 1 agent vs 2 agents

### Option A — 1 agent généraliste "Recrutement & Organisation"

**Domaine de compétence :**
- Structures hiérarchiques par secteur et pays
- Pouvoir décisionnel sur le recrutement
- Marché caché : qui recrute sans publier, pourquoi, quand
- Titres et nomenclatures par culture d'entreprise

**Arguments pour :**
- Cohérence : un seul référentiel, pas de risque de divergence entre deux agents
- Simplicité opérationnelle : une seule invocation pour produire la base statique ET le prompt fallback
- Les deux domaines (org + recrutement) sont fortement couplés dans le contexte ExpatHunter : on cherche des managers qui ont à la fois un rôle opérationnel ET un pouvoir de recrutement
- Réduction du risque de désaccord entre agents (ex : l'agent "org" dit que le CTO recrute, l'agent "recrutement" dit que c'est le VP Engineering)
- Maintenance plus légère : 1 fichier de contexte à mettre à jour

**Arguments contre :**
- Prompt context plus dense → risque de dilution de l'expertise sur chaque dimension
- Si l'un des deux domaines évolue fortement (ex : nouvelles structures org post-remote), il faut tout réviser

---

### Option B — 2 agents spécialisés

**Agent 1 : "Company Structure Analyst"**
- Expert : hiérarchies, titres, organigrammes, variations culturelles (NZ vs FR vs DE)
- Mission : produire et valider la taxonomie des titres par secteur et pays
- Inputs : secteur, pays, taille d'entreprise
- Output : liste normalisée de titres avec niveau hiérarchique et variantes locales

**Agent 2 : "Hidden Market Recruiter"**
- Expert : comment fonctionne le recrutement non publié, qui décide, signaux d'embauche
- Mission : définir les critères de ciblage, valider la pertinence des titres produits par Agent 1
- Inputs : titres candidats, secteur, signaux d'entreprise
- Output : validation/rejet des titres, critères de filtrage, contenu du prompt fallback

**Arguments pour :**
- Séparation claire des responsabilités
- Chaque agent peut être invoqué indépendamment (ex : seulement valider des titres sans régénérer la base)
- Facilite la révision ciblée : si la structure org d'un secteur change, seul Agent 1 est modifié

**Arguments contre :**
- Pour une base statique de ~10 secteurs, la complexité opérationnelle dépasse le bénéfice
- Risque de désaccord entre agents sur la frontière entre "qui a le titre" et "qui a le pouvoir" → nécessite une coordination explicite
- Double maintenance
- Dans les faits, ExpatHunter ne lancera pas ces agents fréquemment (base statique = rare mise à jour)

---

## 3. Recommandation : 1 agent, rôle dual

**Recommandation : créer 1 seul agent, nommé `recruitment-intelligence.md`.**

**Justification :**

Le cas d'usage d'ExpatHunter est spécifique : on cherche des managers opérationnels qui **ont la double casquette** — ils ont un titre lié à leur métier (Engineering, Finance, etc.) ET ils ont le pouvoir informel de déclencher un recrutement. Cette dualité est indissociable. Séparer les agents reviendrait à scinder une connaissance qui, dans la réalité, est portée par une seule personne (le recruteur d'un cabinet senior, un HRBP spécialisé secteur, ou un consultant en organisation qui a travaillé dans RH).

De plus, la fréquence d'invocation est faible (mise à jour de la base statique = quelques fois par an, affinement du prompt fallback = ad hoc). Le retour sur investissement d'une architecture à 2 agents n'est pas justifiable à ce stade.

**Si le projet grossit :** envisager la séparation à partir de la Phase 3, quand le SectorTitleService couvrira 30+ secteurs ou que l'auto-amélioration via feedback Hunter deviendra le mode principal.

---

## 4. Spécification de l'agent recommandé

### Fichier : `/Volumes/Samsung_T5/dev/expat-hunter/.claude/agents/recruitment-intelligence.md`

**Rôle :** Expert en organisation d'entreprise et marché caché de l'emploi
**Missions :**
1. Construire et maintenir `data/sector-titles.yaml` — la base statique des titres cibles
2. Rédiger et affiner `data/sector-titles-prompt.md` — le prompt fallback LLM
3. Valider la pertinence des titres générés par le LLM fallback
4. Conseiller sur les signaux de recrutement à intégrer dans le `ContextEnrichmentService`

**Domaine de compétence :**
- Structures hiérarchiques par secteur (IT, Finance, Healthcare, etc.) et par culture (anglophone, FR, DE/CH)
- Nomenclature des titres : variantes par pays, taille d'entreprise, type d'organisation
- Marché caché : qui recrute sans publier, comment identifier un besoin avant l'offre
- Signaux de recrutement : croissance d'équipe, funding, reorganisation, départs LinkedIn
- Différenciation opérationnel vs RH vs stratégique dans chaque secteur

**Format d'invocation :** `claude --agent recruitment-intelligence "Génère les titres pour le secteur Medtech en Australie"`

---

## 5. Séparation framework / ExpatHunter

Les agents du framework (`/Volumes/Samsung_T5/dev/expat-hunter/framework/agents/`) sont des agents de processus de développement (architect, developer, product-owner, etc.). Ils ne doivent pas être contaminés par la logique métier d'ExpatHunter.

L'agent `recruitment-intelligence` est un **agent métier ExpatHunter**. Il doit résider dans :

```
/Volumes/Samsung_T5/dev/expat-hunter/.claude/agents/recruitment-intelligence.md
```

Ce chemin est hors du répertoire `framework/`, il ne sera pas écrasé lors des mises à jour du submodule. Il est versionné dans le repo ExpatHunter lui-même.

---

## 6. Workflow d'intégration dans le développement

```
Nouveau secteur identifié par l'utilisateur
         │
         ▼
1. Vérifier si le secteur est dans data/sector-titles.yaml
         │
   ┌─────┴─────┐
   │ OUI        │ NON
   ▼            ▼
Utiliser    Invoquer agent recruitment-intelligence
base        → "Génère les titres pour secteur X, pays Y"
statique    → Valider le JSON produit
             → Ajouter à data/sector-titles.yaml si récurrent
             → Ou laisser dans le cache DB (sector_title_cache, 30j)
```

**Pour la maintenance de la base statique :**
1. Invoquer l'agent avec le secteur cible
2. L'agent produit un bloc YAML dans le format de `sector-titles.yaml`
3. Révision humaine rapide (5 min)
4. Commit dans `data/sector-titles.yaml`

**Pour le prompt fallback :**
1. Tester le prompt actuel sur 3-5 secteurs inconnus
2. Comparer les titres générés avec les attentes
3. Invoquer l'agent pour affiner le prompt
4. Mettre à jour `data/sector-titles-prompt.md`
