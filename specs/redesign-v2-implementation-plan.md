# ExpatHunter Redesign V2 -- Plan d'implementation par epics

**Date** : 2026-03-21
**Auteurs** : Product Owner + Architecte
**Spec produit** : `specs/redesign-v2.md`
**Spec design** : `specs/redesign-v2-design.md`

---

## Synthese

Le plan decoupe le redesign V2 en **9 epics ordonnes**. Le positionnement expert (F14) est **distribue dans chaque epic** plutot que concentre dans un seul : chaque page livree inclut ses micro-conseils et ses elements d'expertise. Le chat dual arrive a l'Epic 7 quand il y a assez de contenu expert pour etre utile.

**Principe directeur** : chaque epic livre une valeur testable ET un element visible du positionnement expert.

```
Epic 1   Navigation V2 + Design System + fondations expert   ----+
Epic 2   Cache d'intelligence + score de confiance            ----+--> en parallele possible
Epic 3   Automatisation du flow + snapshot marche             (prereq: Epic 2)           [DONE]
Epic 3.5 Sourcing et enrichissement de contacts qualifies     (prereq: Epic 3)           [ADDED]
Epic 4   Emails en masse + templates + conseils email         (prereq: Epic 3, 3.5)
Epic 5   Dashboard repense + conseils dashboard               (prereq: Epic 3, 4)
Epic 6   Kanban intelligent + conseils suivi                  (prereq: Epic 4)
Epic 7   Chat dual (support + expert)                         (prereq: Epic 2, 5)
Epic 8   Gestion des reponses et conversations                (prereq: Epic 2, 6, 7)
Epic 9   Onboarding, profil, expert avance et finitions       (prereq: Epic 1-8)
```

> **Note** : Epic 3.5 a ete insere le 2026-03-22 suite a validation PO. Spec detaillee dans `specs/contact-sourcing-strategy.yaml`. Epic 4 depend desormais de 3.5 car la qualite des contacts conditionne directement l'efficacite du funnel email.

---

## Epic 1 : Navigation V2, Design System et fondations expert

**Features couvertes** : F1 (Navigation et labels), F14.2 (infrastructure micro-conseils)
**Prerequis** : Aucun
**Priorite MoSCoW** : Must-have

**Valeur livree** : L'utilisateur voit la nouvelle sidebar en francais avec des labels comprehensibles. L'app a un look plus professionnel des le premier jour. Le composant `ProactiveTip` est pret et un premier conseil statique s'affiche sur le dashboard vide ("Bienvenue ! Commencez par completer votre profil pour des recherches plus pertinentes").

**Backend** :
- Aucune modification API necessaire (les routes API ne changent pas)
- Endpoint leger : `GET /api/tips/static` — retourne les conseils statiques pre-definis par page (pas d'IA, juste un fichier de config)

**Frontend** :
- Refactoring `sidebar.tsx` : nouveaux labels, structure en 2 blocs (navigation principale + profil/parametres), icones Lucide React
- Composant `BadgeNotification` (compteur brouillons / reponses non lues)
- Redirections 301 (`/sourcing` -> `/recherche`, `/pipeline` -> `/suivi`, `/profile` -> `/profil`, `/settings` -> `/parametres`) via `next.config.js`
- Renommage des dossiers de pages
- Mise a jour i18n : labels FR pour la sidebar V2
- Integration des nouvelles CSS variables V2 (couleurs, spacing, shadows, radius)
- Composants utilitaires : `ConfirmModal`, `EmptyState`, `NotificationToast`
- **Composant `ProactiveTip`** : bandeau de conseil contextuel, fermable, avec icone et CTA optionnel. Utilise en mode statique pour l'instant (conseils pre-definis par page)
- Premier conseil visible : message de bienvenue expert sur le dashboard

**Tests** :
- E2E : naviguer sur chaque page via la sidebar, verifier les labels affiches
- E2E : acceder aux anciennes URLs et verifier la redirection
- E2E : verifier que les badges affichent un compteur (meme si 0)
- E2E : verifier qu'un `ProactiveTip` s'affiche sur le dashboard
- Visuel : verifier le rendu des icones Lucide et du nouveau look

**Estimation relative** : S

---

## Epic 2 : Cache d'intelligence et score de confiance

**Features couvertes** : F15 (Cache — US-15.1, US-15.3), F14.3 (Score de confiance)
**Prerequis** : Aucun (peut demarrer en parallele d'Epic 1)
**Priorite MoSCoW** : Must-have

**Valeur livree** : L'app ne re-scrape plus un contact deja connu. Les recherches sont plus rapides. Chaque contact affiche un **score de confiance** (ex: 87%) avec explication des facteurs positifs et risques. L'utilisateur sait immediatement ou investir ses efforts. Le dashboard admin affiche les stats du cache.

**Backend** :
- Nouvelle migration : table `external_cache` (source, entity_type, entity_id, data JSON, fetched_at, expires_at)
- Service `CacheService` avec logique cache-first : `getOrFetch(key, fetcher, ttl)`
- Integration dans `SourcingService` : verifier le cache avant de scraper
- Integration dans `EmailGenerationService` : contexte enrichi depuis le cache (US-15.3)
- Durees d'expiration configurables par type (entreprise: 30j, contact: 14j, marche: 7j, visa: 90j)
- Endpoint admin : `GET /api/admin/cache/stats`
- **Service `ConfidenceScoreService`** : calcul du score par contact basé sur les donnees disponibles (email verifie, poste confirme, entreprise enrichie, offre active, sponsor visa). Retourne score + facteurs
- Enrichir `GET /api/contacts` et `GET /api/contacts/:id` : inclure `confidence_score` et `confidence_factors`
- Architecture extensible pour les providers d'enrichissement (US-15.2)

**Frontend** :
- Page admin : section stats cache dans `/admin/ai-settings`
- Indicateur "source + fraicheur" sur la fiche contact ("via Seek, il y a 3 jours")
- **Composant `ConfidenceScore`** : badge circulaire avec score %, code couleur (vert/orange/rouge), tooltip avec facteurs positifs et risques
- Integration du `ConfidenceScore` sur la liste contacts et la fiche contact

**Tests** :
- Unitaire : `CacheService.getOrFetch` retourne le cache si frais, appelle le fetcher si expire
- Unitaire : TTL respectes par type de donnee
- Unitaire : `ConfidenceScoreService` — un contact avec email + poste + offre active score plus haut qu'un contact sans email
- Integration : un second sourcing sur le meme pays ne re-scrape pas les contacts en cache
- E2E admin : la page cache affiche des statistiques
- E2E : un contact affiche son score de confiance avec explication

**Estimation relative** : L

---

## Epic 3 : Automatisation du flow + snapshot marche

**Features couvertes** : F2 (Automatisation du flow), F7 (Anti-doublon et cooldown), F14.1 (Snapshot marche)
**Prerequis** : Epic 2 (le cache est en place pour eviter le re-scraping, fournir le contexte enrichi, et alimenter le snapshot)
**Priorite MoSCoW** : Must-have

**Valeur livree** : L'utilisateur lance UNE recherche et recupere des emails prets a envoyer. Avant de lancer, il voit un **snapshot du marche** de son pays/secteur cible en haut de page — il se sent informe et confiant. Les contacts deja contactes sont exclus. Le score de confiance est visible sur les resultats.

**Backend** :
- Job orchestrator : chainement `scraping -> analyse IA -> generation emails` via job queue (BullMQ ou equivalent AdonisJS)
- Nouveau endpoint : `POST /api/recherche` qui lance le flow complet
- Nouveau endpoint : `GET /api/recherche/:id/progress` (SSE ou polling)
- Pre-remplissage : `GET /api/recherche/defaults` depuis le profil utilisateur
- Anti-doublon (F7) : flag `already_contacted` et `cooldown_until` sur `Contact`. Exclusion des contacts en cooldown
- Parametre utilisateur : `recontact_cooldown_days` (defaut: 180)
- Logique de relance differenciee
- **Endpoint snapshot marche** : `GET /api/market/snapshot?country=X&sector=Y` — assembler les donnees depuis le cache + recherche web (Perplexity). Retourne tendance, meilleure periode, nb offres estimees, salaire moyen. Cache 7 jours
- Provider `MarketDataProvider` : fetcher les donnees marche via recherche web, stocker dans le cache

**Frontend** :
- Nouvelle page `/recherche` : formulaire pre-rempli, bouton unique "Lancer la recherche"
- **Composant `MarketSnapshot`** en haut de page : encart expert avec tendance, meilleure periode, offres, salaire. Mise a jour dynamique quand l'utilisateur change pays/secteur
- Composant `ProgressBarMultiStep` (3 phases : scraping, analyse, generation)
- Page `/recherche/[id]` : detail recherche avec progression et resultats
- `ConfidenceScore` affiche sur chaque contact dans les resultats
- Notification toast a la fin : "X contacts, Y pertinents, Z emails prets"
- Badge "Deja contacte le [date]" sur les contacts concernes
- `ProactiveTip` sur la page recherche : conseil contextuel ("Fevrier-avril est la meilleure periode pour postuler en NZ")
- Section cooldown dans les parametres utilisateur

**Tests** :
- E2E : lancer une recherche, verifier que la barre progresse sur 3 phases
- E2E : verifier le snapshot marche affiche en haut de page
- E2E : verifier que le snapshot change quand on modifie le pays
- E2E : verifier que les contacts dans les resultats ont un score de confiance
- E2E : verifier qu'a la fin, des emails brouillons existent dans "Mes emails"
- Integration : 2 recherches sur le meme pays — contacts deja contactes exclus
- Unitaire : la job queue chaine les 3 etapes, continue sur erreur partielle

**Estimation relative** : XL

---

## Epic 3.5 : Sourcing et enrichissement de contacts qualifies

**Features couvertes** : F15.2 (Enrichissement contacts), F14.3 (Scoring expat-contextualise)
**Prerequis** : Epic 3 (le flow de recherche est en place, les scrapers de base fonctionnent)
**Priorite MoSCoW** : Must-have
**Spec detaillee** : `specs/contact-sourcing-strategy.yaml`

**Valeur livree** : ExpatHunter trouve des contacts que Hunter.io et Apollo ne trouvent pas — en combinant extraction intelligente depuis les offres, crawl des pages equipes des entreprises et croisement avec les registres gouvernementaux de sponsors visa. Hunter et Apollo enrichissent les contacts deja identifies (pas l'inverse). Le score de confiance est contextualise pour les expats (visa, culture, hiring intensity). Chaque contact affiche pourquoi il vaut la peine d'etre contacte.

**Proposition de valeur unique vs Hunter direct** :
- Hunter repond a "quel est l'email de Jean Dupont chez Acme Corp ?"
- ExpatHunter repond a "qui dois-je contacter chez Acme Corp pour decrocher un poste de dev senior a Auckland en tant que Francais ?"
- Hunter est une brique dans notre pipeline a l'etape 4, pas un concurrent.

**Backend — Pipeline sourcing en 5 etapes** :

*Etape 1 — Decouverte* :
- Scrapers existants (Seek, Indeed) completement refactores : extraire le nom, titre, email ET domaine de l'entreprise depuis chaque offre
- Nouveau : extraction NLP du contact directement dans le texte de l'offre ("Contact John Smith at john@company.com for enquiries")
- Annuaires sectoriels locaux (par pays, configurable)

*Etape 2 — Enrichissement entreprise* :
- Service `CompanyEnricher` : a partir du nom + domaine, crawler le site pour trouver la page "About", "Our Team", "Leadership"
- Extraction des noms + titres + emails des pages equipe via regex + NLP
- Cibler les hiring managers, CTOs, heads of department (pas les generiques HR@ ou info@)

*Etape 3 — Croisement registres visa gouvernementaux* (differenciateur unique) :
- Immigration NZ : liste des Accredited Employers (AEWV) — publique et telechargeable
- Home Office UK : Sponsor Licence Register
- DOCA Australia : liste des sponsors visa 482
- Service `VisaSponsorRegistry` : indexer ces listes en base, croisement automatique au sourcing
- Ajouter flag `is_visa_sponsor: boolean` + `visa_types: string[]` sur Contact
- Dans le score de confiance : +25 points si l'entreprise est sponsor visa confirme

*Etape 4 — Enrichissement email* :
- Service `EmailEnricher` en cascade : Hunter.io → Apollo.io → inférence pattern (prenom.nom@domaine)
- Deduplication : ne pas appeler Hunter/Apollo si email deja trouve a l'etape 2
- Verification syntaxique + MX record
- Stocker `email_source: 'scraped' | 'hunter' | 'apollo' | 'inferred'` et `email_confidence: number` sur Contact

*Etape 5 — Scoring expat-contextualise* :
- Refonte `ConfidenceScoreService` avec 5 sous-scores visibles :
  - **Visa** (0-25) : `is_visa_sponsor` + types de visa compatibles profil
  - **Role** (0-30) : pertinence IA du contact vs poste + secteur cible
  - **Hiring intensity** (0-20) : nb d'offres actives de l'entreprise sur 30 jours
  - **Expat-friendly** (0-15) : signaux langue (offre en anglais), mentions visa, equipe internationale
  - **Momentum** (0-10) : levee de fonds recente, expansion, recrutement actif
- Score global = somme ponderable par l'admin (configurable dans ai_settings)
- Chaque sous-score expose son "explication" (ex: "Sponsor AEWV confirme — peut recruter sans restriction")

**Backend — Contraintes legales/ethiques** :
- LinkedIn : jamais scrape directement. Google Search comme proxy uniquement pour trouver les URLs de profils publics, jamais le contenu des profils
- RGPD : base legale = interet legittime sur donnees professionnelles publiques. Unsubscribe dans chaque email, cooldown 6 mois
- Job boards : delais 3-8s entre requetes, rotation user-agents, Apify comme fallback officiel
- Stocker `data_source_url` sur chaque contact pour tracabilite

**Backend — Variables d'environnement requises** :
- `HUNTER_API_KEY` (abonnement existant)
- `APOLLO_API_KEY` (optionnel, fallback)

**Frontend** :
- Fiche contact : affichage des 5 sous-scores avec barres et explications inline
- Badge "Sponsor visa confirme" (vert) ou "Non-sponsor" (gris) sur chaque contact
- Badge `email_source` : "Email verifie (Hunter)" vs "Email infere" vs "Email public"
- Filtres sur la liste contacts : filtrer par sponsor visa, par sous-score minimum, par email_source
- Page `/parametres/sourcing` : activer/desactiver les sources (Hunter, Apollo, crawl pages equipe), configurer la ponderation des sous-scores (admin uniquement)

**Tests** :
- Unitaire : `CompanyEnricher` extrait des noms/emails d'une page HTML mock "Our Team"
- Unitaire : `VisaSponsorRegistry` retourne `true` pour une entreprise connue, `false` pour une inconnue
- Unitaire : `EmailEnricher` appelle Hunter si pas d'email, Apollo si Hunter echoue, infere le pattern en dernier recours
- Unitaire : `ConfidenceScoreService` — sous-score Visa = 25 si sponsor confirme, 0 sinon
- Unitaire : `ConfidenceScoreService` — score global respecte la ponderation configuree
- Integration : un sourcing complet sur NZ produit au moins X% de contacts avec email verifie
- Integration : un contact trouve dans le registre AEWV a `is_visa_sponsor = true`
- E2E : la fiche contact affiche les 5 sous-scores avec leurs explications
- E2E : filtrer par "Sponsor visa uniquement" reduit la liste aux contacts eligibles

**Estimation relative** : XL

---

## Epic 4 : Emails en masse + templates + conseils email

**Features couvertes** : F3 (Envoi en masse), F8 (Templates et parametres), F16 (Parametres d'envoi — relances), F14.2 (micro-conseils page emails)
**Prerequis** : Epic 3 (les emails sont generes par le flow)
**Priorite MoSCoW** : Must-have

**Valeur livree** : L'utilisateur selectionne et approuve des dizaines d'emails d'un coup, les envoie en 1 clic. Il cree ses templates, choisit le ton et le framework, et configure ses relances dans les limites fixees par l'administrateur. Les emails sont tries par score de confiance. Des **conseils experts** s'affichent sur la page (timing d'envoi, ton culturel).

**Backend** :
- Endpoint : `POST /api/emails/send-batch` (envoi en masse, arriere-plan avec progression)
- Endpoint progression : `GET /api/emails/send-batch/:id/progress`
- CRUD templates : `POST/GET/PUT/DELETE /api/templates`
- Nouvelle migration : table `email_templates` (user_id, name, subject_pattern, body_pattern, is_default)
- Nouvelle migration : table `generation_presets` (user_id, name, length, framework, tone, language, custom_instructions)
- Integration dans `EmailGenerationService` : template + preset
- Enrichir `POST /api/recherche` pour accepter template_id et preset_id
- Filtres avances sur `GET /api/emails` : par pays, pertinence, statut
- **Endpoint conseils contextuels** : `GET /api/tips/contextual?page=emails&country=X` — retourne des conseils dynamiques (timing optimal par fuseau, ton recommande par culture). Utilise le cache marche

**Backend — contraintes admin F16 (relances)** :

- **Stockage** : reutiliser la table `ai_settings` existante avec deux nouvelles cles globales :
  - `email_follow_ups` : stocke `{ max_follow_ups: 3 }` (entier, defaut 3)
  - `email_follow_up_delay` : stocke `{ min_delay: 1, min_delay_unit: 'days' }` (entier + enum `'days'|'weeks'|'months'`, defaut 1 day)
  - Justification : la table `ai_settings` est deja le registre des reglages globaux admin ; ajouter deux nouvelles `featureKey` evite toute nouvelle migration. Le champ `model` est repurpose comme champ JSON generique pour ces cles (ou on utilise un champ `value` JSON si on etend la migration — voir note architecte ci-dessous).
  - **Note architecte** : la table `ai_settings` actuelle n'a pas de champ JSON generique. Option A (zero migration) : serialiser la valeur dans le champ `model` (string) avec JSON.stringify/parse — acceptable car ces deux cles ne sont pas des settings IA. Option B (migration legere) : ajouter une colonne `value` nullable de type JSON a la table `ai_settings`. **Recommandation : Option B**, elle est propre et non destructive.

- **Endpoint admin** : `PATCH /api/admin/settings/emails` — modifie `max_follow_ups`, `min_follow_up_delay`, `min_follow_up_delay_unit`. Accessible uniquement aux admins (middleware existant). Retourne les valeurs mises a jour.

- **Endpoint parametres envoi utilisateur** : `GET /api/sending-settings` — retourne les reglages utilisateur (relances configurees) ET les limites admin en lecture seule :
  ```json
  {
    "follow_ups": [...],
    "limits": {
      "max_follow_ups": 3,
      "min_follow_up_delay": 1,
      "min_follow_up_delay_unit": "days"
    }
  }
  ```

- **Validation backend** (`SendingSettingsValidator`) :
  - `follow_ups.length <= limits.max_follow_ups` — sinon 422 avec message "Nombre de relances maximum atteint (X)"
  - Pour chaque relance, convertir le delai utilisateur en jours et verifier `user_delay_days >= admin_min_delay_days` — sinon 422 avec message "Delai minimum entre relances : X jours"
  - Conversion : `days * 1`, `weeks * 7`, `months * 30` (approximation suffisante pour la validation)

**Frontend** :
- Refonte page `/emails` : `EmailPreviewRow` avec checkbox, apercu, badge pertinence, `ConfidenceScore`
- `BatchActionsBar` : barre flottante "X selectionnes" avec Approuver / Rejeter
- "Tout selectionner" / selection individuelle / compteur dynamique
- `ConfirmModal` avant envoi en masse
- Barre de progression envoi
- `FilterBar` : filtres combinables (pays, pertinence, statut)
- Tri par defaut par score de confiance (les meilleurs contacts en premier)
- Page templates : CRUD dans `/parametres/templates`
- Page presets : sliders longueur/ton, choix framework (AIDA, PAS, BAB, direct), textarea instructions
- Preview temps reel d'un email exemple
- **`ProactiveTip` sur la page emails** : "Meilleur moment pour envoyer en NZ : mardi 9h NZST", "Les recruteurs kiwis preferent un ton decontracte"

**Frontend — SendingSettingsPanel (F16)** :
- Le composant `SendingSettingsPanel` recoit les limites admin en props : `maxFollowUps`, `minFollowUpDelay`, `minFollowUpDelayUnit`
- Bouton "+ Ajouter une relance" : desactive (`disabled`) quand `follow_ups.length >= maxFollowUps`, avec tooltip "X relances maximum (defini par l'administrateur)"
- Label sous le compteur de relances : "X maximum (defini par l'administrateur)" affiche en permanence
- Champ delai de chaque relance : valeur minimale forcee a `minFollowUpDelay` / `minFollowUpDelayUnit`. Si l'utilisateur saisit une valeur inferieure, champ passe en erreur inline : "Delai minimum : X jours (defini par l'administrateur)"
- Page admin `/admin/ai-settings` : section "Parametres d'envoi" avec champs `max_follow_ups` (input number) et delai minimum (input number + select `jours|semaines|mois`), sauvegarde via `PATCH /api/admin/settings/emails`

**Tests** :
- E2E : selectionner 5 emails, Approuver, verifier le changement de statut
- E2E : Envoyer, confirmer, verifier la barre de progression et le toast
- E2E : creer un template, lancer une recherche avec, verifier le style des emails
- E2E : changer le ton, verifier que le preview change
- E2E : verifier qu'un `ProactiveTip` timing s'affiche sur la page emails
- E2E : verifier que les emails sont tries par score de confiance par defaut
- Integration : envoi batch de 10 emails, verifier les statuts et erreurs
- **Tests F16 — contraintes admin relances** :
  - Unitaire : `SendingSettingsValidator` rejette si `follow_ups.length > max_follow_ups`
  - Unitaire : `SendingSettingsValidator` rejette si delai utilisateur < delai admin (toutes combinaisons d'unites)
  - Unitaire : conversion d'unites correcte (1 semaine = 7 jours, 1 mois = 30 jours)
  - Integration : `PATCH /api/admin/settings/emails` met a jour les valeurs en base et les retourne
  - Integration : `GET /api/sending-settings` inclut les limites admin dans la reponse
  - E2E admin : modifier `max_follow_ups` a 2, verifier que le bouton "+ Ajouter une relance" est desactive apres 2 relances cote utilisateur
  - E2E admin : modifier le delai minimum a 3 jours, verifier qu'un delai de 2 jours est refuse cote frontend et backend

**Estimation relative** : XL

---

## Epic 5 : Dashboard repense + conseils dashboard

**Features couvertes** : F4 (Dashboard repense), F14.2 (micro-conseils dashboard)
**Prerequis** : Epic 3 (recherches), Epic 4 (emails) — pour que le dashboard ait des donnees
**Priorite MoSCoW** : Must-have

**Valeur livree** : L'utilisateur ouvre l'app et voit ce qui l'attend : emails a valider, reponses non lues, recherches en cours. Les stats montrent ses progres. Des **conseils experts** apparaissent : stats comparatives, encouragements, prochaines etapes recommandees.

**Backend** :
- Enrichir `GET /api/dashboard` : compteurs d'actions en attente (brouillons, reponses non lues, recherches en cours)
- Stats globales : contacts totaux, emails envoyes, taux de reponse, entretiens obtenus
- **Stats comparatives anonymisees** : taux de reponse moyen par pays/secteur (pour les conseils expert)
- Endpoint : `GET /api/tips/contextual?page=dashboard` — conseil personnalise ("Votre taux de reponse : 18% — Moyenne NZ tech : 15%. Vous etes au-dessus !")

**Frontend** :
- Refonte page `/` (dashboard) :
  - Section "Actions en attente" en haut : `ActionCard` (emails a valider, reponses, recherches)
  - Section stats globales : grille de `StatCard`
  - Etat vide : `EmptyState` avec CTA "Lancer une recherche"
- Les `ActionCard` sont cliquables et redirigent
- Les badges sidebar alimentes par les memes compteurs
- **`ProactiveTip` sur le dashboard** : stats comparatives, encouragements, recommandation de prochaine action ("Vous avez 12 brouillons en attente — envoyez-les avant mardi pour un meilleur taux de reponse")

**Tests** :
- E2E : dashboard affiche le bon nombre d'emails a valider
- E2E : cliquer une ActionCard et verifier la redirection
- E2E : etat vide pour un nouvel utilisateur
- E2E : stats globales coherentes apres un flow complet
- E2E : un `ProactiveTip` pertinent s'affiche sur le dashboard

**Estimation relative** : M

---

## Epic 6 : Kanban intelligent + conseils suivi

**Features couvertes** : F5 (Mouvement auto + blocage), F14.2 (micro-conseils kanban)
**Prerequis** : Epic 4 (les emails doivent etre envoyes pour que les cartes bougent)
**Priorite MoSCoW** : Must-have

**Valeur livree** : Le kanban reflete automatiquement l'etat reel des contacts. Le score de confiance est visible sur chaque carte. Des **conseils experts** s'affichent selon la colonne : preparation entretien, encouragement apres refus, culture locale. L'utilisateur peut bloquer un contact/entreprise apres un refus.

**Backend** :
- Trigger automatique : email "sent" → contact passe de "to_contact" a "contacted"
- Historique des mouvements : migration `contact_movements` (contact_id, from_status, to_status, trigger, created_at)
- Blocage (F5 US-5.3) : migration `blocked_entities` (user_id, entity_type, entity_id, blocked_until, reason)
- Endpoints :
  - `POST /api/contacts/:id/block` (scope: contact ou company, duree)
  - `GET /api/contacts/:id/movements` (historique)
  - `DELETE /api/blocked/:id` (debloquer)
  - `GET /api/blocked` (liste)
- Enrichir `GET /api/pipeline` : 6 colonnes (Trouve, A contacter, Contacte, En discussion, Entretien, Termine avec sous-statuts)
- Exclure les contacts/entreprises bloques du flow d'envoi
- **Endpoint conseils kanban** : `GET /api/tips/contextual?page=kanban&status=X&contactId=Y` — conseils specifiques par colonne (entretien → preparation, refuse → encouragement + alternatives)

**Frontend** :
- Refonte page `/suivi` : `KanbanBoard` avec 6 colonnes et couleurs V2
- `KanbanCard` avec `ConfidenceScore`, indicateur reponse non lue, date entretien
- Drag & drop desktop, menu "Deplacer" sur mobile
- Filtres : source, pertinence, campagne
- `RefusalBlockModal` : choix du perimetre (contact / entreprise) et duree
- Section "Blocages" dans `/parametres`
- Fiche contact : historique des mouvements
- **`ProactiveTip` contextuel sur le kanban** :
  - Colonne "Entretien" : "En NZ, preparez-vous aux questions sur le 'cultural fit'. 3 conseils..."
  - Colonne "Refuse" : "Un refus chez TechCorp ne bloque pas les autres services. 4 autres contacts disponibles."
  - Fiche contact : insight entreprise ("TechCorp : 250 employes, levee de fonds 2025, sponsor visa confirme")

**Tests** :
- E2E : envoyer un email, verifier mouvement automatique dans le kanban
- E2E : refuser un contact, modale de blocage, confirmer, verifier le blocage
- E2E : contact bloque exclu lors d'un nouvel envoi
- E2E : drag & drop entre colonnes
- E2E : historique des mouvements sur la fiche contact
- E2E : `ProactiveTip` s'affiche sur la colonne "Entretien"
- E2E : `ConfidenceScore` visible sur les cartes kanban

**Estimation relative** : L

---

## Epic 7 : Chat dual (support + expert)

**Features couvertes** : F14.4 (Chat dual support + expert)
**Prerequis** : Epic 2 (cache pour le contexte), Epic 5 (dashboard — pour avoir assez de pages et contenu expert exploitable)
**Priorite MoSCoW** : Must-have

**Valeur livree** : L'utilisateur peut poser des questions a tout moment via un panneau chat lateral. L'assistant repond aux questions sur l'app (support) ET aux questions metier (expert emploi, marche, visa). Il connait le contexte de la page courante. Il peut executer des actions (regenerer un email, etc.).

**Backend** :
- Service `ChatAssistantService` avec routing automatique :
  - **Mode support** : "Comment lancer une recherche ?" → reponse avec lien + etapes (base de connaissance app)
  - **Mode expert** : "Quel visa pour la NZ ?" → reponse experte avec sources (contexte cache)
  - **Mode mixte** : "Comment ameliorer mes emails pour la NZ ?" → conseils expert + lien vers parametres
- Endpoint chat : `POST /api/assistant/chat` (message + contexte page courante + session_id)
- Detection d'intent pour le routing support vs expert
- Base de connaissance app (FAQ structuree pour le mode support)
- Providers de contexte : assembler depuis le cache (infos entreprise, marche, visa, culture)
- Historique de conversation en session (stockage temporaire, par session_id)
- Actions executables par l'assistant : regenerer email, changer ton, etc.

**Frontend** :
- Bouton flottant "Assistant" (coin inferieur droit) sur toutes les pages
- Panneau chat lateral (slide-in depuis la droite) sans quitter la page
- Indicateur du mode detecte (support / expert) dans le header du chat
- Suggestions de questions rapides basees sur le contexte de la page :
  - Page emails : "Ameliorer le ton", "Meilleur moment pour envoyer"
  - Fiche contact : "Que sais-tu sur TechCorp ?", "Sponsorise-t-elle les visas ?"
  - Kanban : "Conseils pour preparer mon entretien"
- Actions executables directement depuis le chat (boutons d'action dans les reponses)
- Historique conserve pendant la session

**Tests** :
- E2E : ouvrir le panneau chat, poser une question support, verifier la reponse avec lien
- E2E : poser une question expert (visa NZ), verifier la reponse avec sources
- E2E : verifier que le contexte change selon la page
- E2E : demander a l'assistant de regenerer un email, verifier que ca fonctionne
- E2E : verifier les suggestions de questions contextuelles
- Integration : verifier le routing support vs expert
- Integration : verifier que les donnees marche/visa sont cachees

**Estimation relative** : XL

---

## Epic 8 : Gestion des reponses et conversations

**Features couvertes** : F6 (Gestion des reponses et conversations)
**Prerequis** : Epic 2 (cache pour le contexte), Epic 6 (kanban pour mouvement auto), Epic 7 (chat pour les conseils contextuels sur les reponses)
**Priorite MoSCoW** : Must-have

**Valeur livree** : L'utilisateur voit les reponses a ses emails directement dans l'app. L'IA resume chaque conversation et propose des reponses adaptees. Le kanban bouge automatiquement. Le chat assistant peut aider a formuler une reponse. Des micro-conseils s'affichent sur le thread ("Ne relancez pas avant 5-7 jours ouvres en NZ").

**Backend** :
- Service IMAP polling : connexion IMAP periodique pour recuperer les reponses
- Configuration utilisateur : credentials IMAP/SMTP ou OAuth (table `email_connections`)
- Parsing des threads : associer une reponse au bon contact via email + subject threading
- Detection IA des evenements (US-5.1 + US-6.1) : entretien / refus / offre / demande d'infos
- Mouvement automatique kanban sur reponse : contacted -> in_discussion (ou entretien/termine)
- Resume IA de la conversation (US-6.2) : 2-3 lignes, mis a jour a chaque echange
- Generation IA de reponse suggeree (US-6.3) : basee sur profil + historique + cache
- Endpoints :
  - `GET /api/contacts/:id/thread`
  - `GET /api/contacts/:id/summary`
  - `POST /api/contacts/:id/reply`
  - `POST /api/contacts/:id/reply/generate`
- **Conseils contextuels sur les reponses** : `GET /api/tips/contextual?page=thread&contactId=X` — do's & don'ts culturels, timing de relance

**Frontend** :
- `EventDetectionNotification` : notification quand l'IA detecte un evenement, avec correction possible
- Fiche contact enrichie : thread complet, resume IA, reponse suggeree editable
- Indicateur "reponse non lue" sur les cartes kanban
- Badge sidebar "Suivi" alimente par le compteur de reponses non lues
- Toast notification quand une nouvelle reponse arrive
- Page parametres : section "Connexion email" (IMAP/SMTP ou OAuth)
- **`ProactiveTip` sur le thread** : "En NZ, ne relancez pas avant 5-7 jours ouvres", "Ce recruteur a repondu en 24h — il est reactif, profitez-en"
- Integration chat : dans la fiche contact, possibilite d'ouvrir le chat pour demander de l'aide sur la reponse

**Tests** :
- E2E : simuler une reponse IMAP, verifier qu'elle apparait dans le thread
- E2E : la carte kanban bouge automatiquement
- E2E : resume IA sur la fiche contact
- E2E : suggestion de reponse, modifier, envoyer
- E2E : notification d'evenement detecte et correction
- E2E : `ProactiveTip` de relance s'affiche sur le thread
- Integration : threading correct (reponse associee au bon contact)

**Estimation relative** : XL

---

## Epic 9 : Onboarding, profil, expert avance et finitions

**Features couvertes** : F9 (Onboarding), F10 (Profil ameliore), F11 (Adaptation culturelle), F12 (Notifications temps reel), F13 (Parametres simplifies), F14.5 (Expert marche avance), F14.6 (Expert visa), F14.7 (Coach carriere)
**Prerequis** : Epic 1 a 8 (cet epic finalise l'experience)
**Priorite MoSCoW** : Should-have (F9, F10, F11, F14.5, F14.6), Could-have (F12, F13, F14.7)

**Valeur livree** : Les nouveaux utilisateurs sont guides pas a pas. Le profil est complet et impacte les recherches. Les emails sont adaptes culturellement. Les notifications arrivent en temps reel. L'expert marche et visa sont accessibles via le chat avec des donnees detaillees. Le coach carriere analyse le CV.

**Backend** :
- Onboarding (F9) : endpoint `POST /api/onboarding` (multi-step), flag `is_onboarded`
- CV parsing ameliore : extraction competences + experience en chips editables
- Affinage conversationnel IA : endpoint `POST /api/onboarding/refine`
- Adaptation culturelle (F11) : enrichir le prompt de generation avec conventions culturelles du pays cible
- Notifications temps reel (F12) : WebSocket ou SSE pour les evenements (recherche terminee, reponse recue)
- Completude du profil : calcul du % dans `GET /api/profile`
- **Provider marche avance (F14.5)** : recherche web (Perplexity) + cache 7j pour tendances detaillees, entreprises qui recrutent, salaires, culture
- **Provider visa (F14.6)** : donnees gouvernementales + cache 90j, conditions d'eligibilite, demarches
- **Coach carriere (F14.7)** : analyse du CV avec suggestions d'amelioration via le chat

**Frontend** :
- Wizard onboarding (`/onboarding`) : 3 etapes (infos, CV upload + parsing, affinage IA)
- Composants `OnboardingWizard`, `CVUploader`, `ChatConversation`
- Redirect vers `/onboarding` si `is_onboarded === false`
- Mode "guided review" pour les 3 premiers emails
- Page profil (`/profil`) : sections claires, edition inline, re-upload CV, jauge completude
- Notifications temps reel : provider WebSocket global, toasts automatiques
- Page parametres (`/parametres`) : 4 sections (Compte, Preferences, Connexion email, IA)
- Expert marche avance dans le chat : tendances detaillees, comparatifs, recommandations
- Expert visa dans le chat : types de visa, eligibilite, liens officiels
- Coach carriere dans le chat : analyse CV, suggestions positionnement
- `ProactiveTip` sur le profil : "Avec 9 ans d'experience React, vous etes dans le top 10% des profils ciblant la NZ tech"

**Tests** :
- E2E : wizard complet (3 etapes), redirection dashboard
- E2E : profil pre-rempli depuis le CV
- E2E : modifier le profil, recherche, verifier le pre-remplissage
- E2E : notifications temps reel (simuler recherche terminee, verifier le toast)
- E2E : guided review pour les 3 premiers emails
- E2E : poser une question visa dans le chat, verifier la reponse avec sources
- E2E : poser une question marche dans le chat, verifier les tendances detaillees
- E2E : `ProactiveTip` positionnement sur la page profil

**Estimation relative** : L

---

## Recapitulatif

| Epic | Features | Priorite | Estimation | Prerequis | Element expert inclus |
|------|----------|----------|------------|-----------|----------------------|
| 1 | F1 Navigation | Must | S | - | Composant `ProactiveTip` + premier conseil statique |
| 2 | F15 Cache, F14.3 Score confiance | Must | L | - | `ConfidenceScore` sur les contacts |
| 3 | F2 Automatisation, F7 Anti-doublon, F14.1 Snapshot | Must | XL | Epic 2 | `MarketSnapshot` sur la page recherche |
| 4 | F3 Envoi masse, F8 Templates, F16 Relances | Must | XL | Epic 3 | Conseils timing + ton culturel sur les emails |
| 5 | F4 Dashboard | Must | M | Epic 3, 4 | Conseils stats comparatives sur le dashboard |
| 6 | F5 Kanban intelligent | Must | L | Epic 4 | Conseils preparation entretien + encouragement refus |
| 7 | F14.4 Chat dual | Must | XL | Epic 2, 5 | Chat support + expert accessible partout |
| 8 | F6 Gestion reponses | Must | XL | Epic 2, 6, 7 | Conseils culturels sur les threads + aide chat |
| 9 | F9, F10, F11, F12, F13, F14.5-7 | Should/Could | L | Epic 1-8 | Expert marche/visa/coach avances |

### Distribution du positionnement expert (F14) par epic

```
Epic 1  → ProactiveTip (composant) + conseils statiques
Epic 2  → ConfidenceScore sur tous les contacts
Epic 3  → MarketSnapshot sur la page recherche
Epic 4  → Micro-conseils timing + ton sur les emails
Epic 5  → Micro-conseils stats comparatives sur le dashboard
Epic 6  → Micro-conseils entretien + refus sur le kanban
Epic 7  → Chat dual support + expert (point d'entree unique)
Epic 8  → Micro-conseils culturels sur les threads + aide via chat
Epic 9  → Expert marche/visa/coach avances dans le chat
```

### Parallelisation possible

```
Semaine 1-2 :  Epic 1 (Navigation)  ||  Epic 2 (Cache + Score confiance)
Semaine 3-5 :  Epic 3 (Automatisation flow + Snapshot marche)
Semaine 5-7 :  Epic 4 (Emails masse + templates + conseils)
Semaine 7-8 :  Epic 5 (Dashboard)  ||  Epic 6 (Kanban)
Semaine 8-11:  Epic 7 (Chat dual)  ||  debut Epic 8 (spike IMAP)
Semaine 11-14: Epic 8 (Reponses IMAP + conversations)
Semaine 14-16: Epic 9 (Onboarding + expert avance + polish)
```

**Duree totale estimee** : 15-17 semaines (1 developpeur full-stack)

### Notes architecte

1. **AdonisJS** : le backend existant utilise AdonisJS avec Lucid ORM. Les jobs queues peuvent etre implementees avec `@adonisjs/limiter` ou BullMQ via un provider custom.
2. **SSE vs WebSocket** : privilegier SSE pour la progression (plus simple, unidirectionnel). WebSocket pour le chat (bidirectionnel) et les notifications temps reel (Epic 9).
3. **IMAP** : l'Epic 8 est le plus risque techniquement. Prevoir un spike d'exploration IMAP a la semaine 8 (en parallele du chat) pour securiser l'estimation.
4. **Pas de refonte API** : l'API existante est preservee, on ajoute de nouveaux endpoints.
5. **Migrations incrementales** : chaque epic ajoute ses propres migrations, pas de migration "big bang".
6. **ProactiveTip progressif** : le composant est cree dans l'Epic 1 en mode statique. Chaque epic suivant enrichit les conseils de sa page (d'abord statiques/pre-calcules, puis dynamiques via cache, puis temps reel via chat). Cette approche permet de livrer de la valeur expert des le debut sans bloquer sur l'IA.
7. **Score de confiance** : le calcul est simple au depart (donnees disponibles = score plus haut). Il s'enrichira naturellement au fur et a mesure que de nouvelles sources d'enrichissement seront ajoutees (architecture extensible via providers).
8. **Chat dual** : le routing support/expert est base sur la detection d'intent. La base de connaissance app (mode support) est un fichier structure, pas un LLM — rapide et fiable. Le mode expert utilise le LLM avec le contexte cache.
9. **Snapshot marche** : premiere version basee sur une recherche web unique par pays/secteur, cachee 7 jours. Pas besoin de multiples sources au depart — Perplexity suffit pour un snapshot de qualite.
