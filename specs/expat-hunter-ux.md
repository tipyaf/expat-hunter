# ExpatHunter — Phase 0.5 : Design UX/UI

## Récapitulatif des décisions UX

| # | Question | Réponse |
|---|----------|---------|
| 1 | Navigation | Sidebar fixe à gauche |
| 2 | Dashboard | Actions en attente (to-do list) |
| 3 | Onboarding profil | Wizard + upload CV + IA conversationnelle pour affiner |
| 4 | Lancement sourcing | Mode assisté par l'IA (suggestions basées sur le profil) |
| 5 | Validation emails | Hybride (3 premiers un par un, puis lot) |
| 6 | Pipeline kanban | 5 colonnes simplifiées pour le MVP |
| 7 | Score pertinence | Badge couleur + explication courte (pas de chiffre brut) |
| 8 | Tonalité visuelle | Moderne et chaleureux (teal/orange, style Linear/Notion) |
| 9 | Dark mode | Préférences système par défaut + toggle dans les settings |
| 10 | i18n | Anglais + Français au MVP, architecturé pour ajouter des langues facilement |
| 11 | Design system partagé | Web et mobile doivent partager le même design system (tokens, couleurs, typo, composants) |

---

## 1. Architecture d'information (Sitemap)

### Pages publiques
- `/login` — Connexion
- `/register` — Inscription (MVP mono-user, mais prêt)

### Pages authentifiées
- `/` — Dashboard (actions en attente)
- `/profile` — Profil candidat (édition)
- `/profile/setup` — Wizard onboarding (première connexion)
- `/sourcing` — Lancement et historique des campagnes de sourcing
- `/contacts` — Liste de tous les contacts trouvés
- `/contacts/:id` — Fiche détaillée d'un contact
- `/emails` — File d'attente des emails (brouillons, envoyés, relances)
- `/emails/:id` — Preview/édition d'un email
- `/pipeline` — Vue kanban du pipeline
- `/settings` — Paramètres (compte, connecteurs email, préférences)

### Navigation sidebar
```
┌──────────────────────┐
│  🏠 ExpatHunter      │  ← Logo + nom
├──────────────────────┤
│  Dashboard           │
│  Profil              │
│  Sourcing            │
│  Contacts            │
│  Emails              │
│  Pipeline            │
├──────────────────────┤
│  Paramètres          │  ← En bas
└──────────────────────┘
```

---

## 2. User Flows

### Flow 1 : Onboarding (première connexion)

```
1. L'utilisateur se connecte pour la première fois
2. Redirection vers /profile/setup (wizard)
3. Étape 1/3 : Infos de base
   - Nom, pays de résidence actuel
   - Pays cible(s)
   - Secteur(s) visé(s)
4. Étape 2/3 : Upload CV
   - Drag & drop ou sélection fichier (PDF)
   - L'IA parse le CV en arrière-plan
   - Affiche un résumé : compétences détectées, expérience estimée
   - L'utilisateur valide ou corrige
5. Étape 3/3 : Affinage conversationnel
   - L'IA pose 2-3 questions pour préciser :
     "Tu as mentionné Python et Data — tu cherches plutôt Data Engineer ou Data Scientist ?"
     "Taille d'entreprise préférée : startup, PME, grand groupe ?"
   - Les réponses complètent le profil
6. Profil créé → redirection vers Dashboard avec message de bienvenue
7. Le dashboard propose de lancer le premier sourcing

### États spéciaux
- Empty state wizard : indicateur de progression (étape 1/3)
- Loading : skeleton pendant le parsing CV
- Error : "Format non supporté" / "Impossible de lire le CV"
- Success : "Profil créé avec succès"
```

### Flow 2 : Lancement d'un sourcing

```
1. L'utilisateur clique "Sourcing" dans la sidebar
2. Il voit l'historique des campagnes précédentes (si existantes)
3. Il clique "Nouvelle recherche"
4. L'IA propose des paramètres pré-remplis basés sur le profil :
   - Pays : [pré-rempli depuis profil]
   - Secteur : [pré-rempli depuis profil]
   - Sources : [cochées automatiquement selon le pays]
   - Type de contacts : "Responsables d'équipes opérationnelles"
5. L'utilisateur ajuste si besoin et valide
6. Le sourcing se lance en arrière-plan
7. Redirection vers la page sourcing avec barre de progression
8. Notifications au fur et à mesure : "12 contacts trouvés sur Seek..."
9. Une fois terminé : résumé (X contacts trouvés, Y sources utilisées)
10. CTA : "Lancer l'analyse IA" ou automatique selon settings

### États spéciaux
- Empty state : "Aucune campagne lancée. Lancez votre première recherche."
- Loading : barre de progression avec détail par source
- Error : "Échec sur Seek (anti-bot détecté), les autres sources ont fonctionné"
- Success : résumé avec compteurs
```

### Flow 3 : Analyse IA + validation emails

```
1. Après un sourcing, l'IA analyse les contacts automatiquement
2. Les contacts apparaissent dans /contacts avec leur badge de pertinence
3. Les contacts "très pertinents" génèrent automatiquement un brouillon d'email
4. L'utilisateur va dans /emails
5. Les 3 premiers emails sont présentés un par un :
   - Preview de l'email (sujet + corps)
   - Infos du contact (nom, rôle, entreprise, badge pertinence, explication)
   - Actions : Approuver / Modifier / Rejeter
6. Après les 3 premiers, vue liste pour le reste :
   - Liste scrollable de tous les brouillons
   - Checkbox pour sélection multiple
   - Actions en masse : "Approuver sélection" / "Rejeter sélection"
   - Clic sur un email → ouvre le preview/éditeur
7. Une fois tous les emails validés : bouton "Envoyer tout"
8. Confirmation : "X emails vont être envoyés. Confirmer ?"

### États spéciaux
- Empty state : "Aucun email en attente. Lancez un sourcing."
- Loading : "Génération des emails en cours..." avec progression
- Error : "Impossible d'envoyer à X (email invalide)"
- Success : "X emails envoyés avec succès"
```

### Flow 4 : Suivi pipeline

```
1. L'utilisateur va dans /pipeline
2. Vue kanban avec 5 colonnes :
   - Trouvé (contacts issus du sourcing)
   - À contacter (validés par l'IA ou l'utilisateur)
   - Contacté (email envoyé)
   - En discussion (réponse reçue)
   - Terminé (entretien obtenu / offre / rejeté — sous-statuts visibles)
3. Chaque carte contact affiche :
   - Nom + rôle
   - Entreprise
   - Badge pertinence + explication courte
   - Dernier statut email (envoyé il y a 3j, relance prévue dans 2j)
4. Drag & drop pour déplacer un contact manuellement
5. Clic sur une carte → ouvre la fiche contact (/contacts/:id)
6. Filtres en haut : par source, par pertinence, par date

### États spéciaux
- Empty state : "Votre pipeline est vide. Lancez un sourcing."
- Loading : skeleton des colonnes
```

### Flow 5 : Consultation d'un contact

```
1. Clic sur un contact (depuis pipeline, liste, ou emails)
2. Page /contacts/:id avec :
   - En-tête : nom, rôle, entreprise, badge pertinence
   - Explication IA : pourquoi ce contact est pertinent/non pertinent
   - Infos entreprise : secteur, taille, site web, signaux détectés
   - Historique emails : liste des emails envoyés/reçus, statuts
   - Actions : "Générer un email" / "Override pertinence" / "Changer statut"
3. L'utilisateur peut override la recommandation IA (bouton toggle)

### États spéciaux
- Loading : skeleton de la fiche
- Error : "Contact introuvable"
```

---

## 3. Design System

### Couleurs

| Rôle | Couleur | Hex | Usage |
|------|---------|-----|-------|
| Primary | Teal | `#0D9488` | Actions principales, liens, sidebar active |
| Primary Hover | Teal foncé | `#0F766E` | Hover sur actions principales |
| Secondary | Orange chaud | `#F97316` | Accents, notifications, badges importants |
| Background | Gris très clair | `#FAFAFA` | Fond de page (light) |
| Background Dark | Gris très foncé | `#18181B` | Fond de page (dark) |
| Surface | Blanc | `#FFFFFF` | Cartes, modales, sidebar (light) |
| Surface Dark | Gris foncé | `#27272A` | Cartes, modales, sidebar (dark) |
| Text | Gris très foncé | `#18181B` | Texte principal (light) |
| Text Dark | Gris très clair | `#FAFAFA` | Texte principal (dark) |
| Text Muted | Gris moyen | `#71717A` | Texte secondaire |
| Success | Vert | `#22C55E` | Confirmations, badge "très pertinent" |
| Error | Rouge | `#EF4444` | Erreurs, badge "non pertinent" |
| Warning | Ambre | `#F59E0B` | Avertissements, badge "à vérifier" |
| Info | Bleu | `#3B82F6` | Informations, badge "pertinent" |

### Badges de pertinence

| Catégorie | Couleur | Label |
|-----------|---------|-------|
| Très pertinent (75-100) | Success vert | "Très pertinent" |
| Pertinent (50-74) | Info bleu | "Pertinent" |
| À vérifier (25-49) | Warning ambre | "À vérifier" |
| Non pertinent (0-24) | Error rouge | "Non pertinent" |

### Typographie

| Rôle | Font | Size | Weight |
|------|------|------|--------|
| H1 | Inter | 30px | 700 (Bold) |
| H2 | Inter | 24px | 600 (Semibold) |
| H3 | Inter | 20px | 600 (Semibold) |
| Body | Inter | 14px | 400 (Regular) |
| Body medium | Inter | 14px | 500 (Medium) |
| Small | Inter | 12px | 400 (Regular) |
| Caption | Inter | 11px | 500 (Medium) |

### Spacing
- Base unit: 4px
- Scale: xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

### Border radius
- Small: 4px — inputs, badges, tags
- Medium: 8px — cards, buttons
- Large: 12px — modales, containers
- Full: 9999px — avatars, pills, toggle

### Shadows (light mode)
- sm: `0 1px 2px rgba(0,0,0,0.05)` — éléments subtils
- md: `0 4px 6px rgba(0,0,0,0.07)` — cards
- lg: `0 10px 15px rgba(0,0,0,0.1)` — modales, dropdowns

### Shadows (dark mode)
- sm: `0 1px 2px rgba(0,0,0,0.3)` — éléments subtils
- md: `0 4px 6px rgba(0,0,0,0.4)` — cards
- lg: `0 10px 15px rgba(0,0,0,0.5)` — modales, dropdowns

---

## 4. Spécification des composants

### Composant: Sidebar

**Rôle**: Navigation principale fixe à gauche

**Wireframe**:
```
┌──────────────────────┐
│  [Logo] ExpatHunter  │
│                      │
│  ● Dashboard         │  ← Actif : fond teal léger, texte teal
│  ○ Profil            │
│  ○ Sourcing          │
│  ○ Contacts     (42) │  ← Badge compteur
│  ○ Emails       (7)  │  ← Badge compteur (en attente)
│  ○ Pipeline          │
│                      │
│                      │
│                      │
│  ──────────────────  │
│  ○ Paramètres        │
│  [Avatar] Yannick    │
└──────────────────────┘
```

**Dimensions**: 240px de large, hauteur 100vh, position fixed

**États**:
- Default : fond surface, items en text muted
- Active : fond primary/10%, texte primary, barre latérale gauche 3px primary
- Hover : fond gris léger
- Mobile (< 768px) : sidebar cachée, hamburger menu en top-left, overlay

**Accessibilité**:
- Role ARIA: `navigation`
- `aria-current="page"` sur l'item actif
- Navigation clavier : Tab entre items

---

### Composant: DashboardActions

**Rôle**: Liste des actions en attente sur le dashboard

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  Actions en attente (7)                             │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 📧 5 emails à valider                      │    │
│  │    Générés il y a 2h — Voir →               │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🔄 2 relances prévues aujourd'hui           │    │
│  │    J+7 pour Marie D., J+3 pour Tom B. →     │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ 📩 1 réponse reçue                          │    │
│  │    John Smith — Reply Corp — Voir →         │    │
│  └─────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────┐    │
│  │ ✅ Sourcing terminé                         │    │
│  │    18 contacts trouvés — Analyser →         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Statistiques rapides ──                         │
│  Contacts: 42  |  Emails envoyés: 23  |  Réponses: 3│
└─────────────────────────────────────────────────────┘
```

**États**:
- Empty : "Aucune action en attente. Tout est à jour !" avec CTA vers sourcing
- Loading : skeleton cards
- Items cliquables → redirigent vers la page concernée

**Responsive**:
- Mobile : cards pleine largeur, empilées
- Desktop : max-width 800px, centré

---

### Composant: ProfileWizard

**Rôle**: Onboarding en 3 étapes

**Wireframe étape 1/3** :
```
┌─────────────────────────────────────────────────────┐
│          Créez votre profil candidat                │
│          ●───────○───────○                          │
│          1/3     2/3     3/3                        │
│                                                     │
│  Prénom          [___________________]              │
│  Nom             [___________________]              │
│                                                     │
│  Pays cible(s)   [🔍 Rechercher...     ]           │
│                  [x] New Zealand  [x] Australia     │
│                                                     │
│  Secteur(s)      [🔍 Rechercher...     ]           │
│                  [x] Tech  [x] Engineering          │
│                                                     │
│  Type de poste   [🔍 Rechercher...     ]           │
│                  [x] Backend Dev  [x] Data Engineer │
│                                                     │
│                              [Suivant →]            │
└─────────────────────────────────────────────────────┘
```

**Wireframe étape 2/3** :
```
┌─────────────────────────────────────────────────────┐
│          Importez votre CV                          │
│          ●───────●───────○                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │     Glissez votre CV ici (PDF)              │    │
│  │     ou cliquez pour sélectionner            │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Compétences détectées ──                        │
│  [Python] [FastAPI] [PostgreSQL] [Docker] [+]       │
│                                                     │
│  Expérience estimée : 8 ans                         │
│  [Corriger]                                         │
│                                                     │
│                   [← Retour]   [Suivant →]          │
└─────────────────────────────────────────────────────┘
```

**Wireframe étape 3/3** :
```
┌─────────────────────────────────────────────────────┐
│          Précisons votre recherche                  │
│          ●───────●───────●                          │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🤖 D'après votre CV, vous avez de           │    │
│  │    l'expérience en backend Python.           │    │
│  │                                              │    │
│  │    Vous cherchez plutôt :                    │    │
│  │    ○ Un poste technique (dev/lead)           │    │
│  │    ○ Un poste management (engineering mgr)   │    │
│  │    ○ Les deux                                │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [Réponse de l'utilisateur...]                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🤖 Préférence de taille d'entreprise ?       │    │
│  │    ○ Startup (< 50)                          │    │
│  │    ○ PME (50-500)                            │    │
│  │    ○ Grand groupe (500+)                     │    │
│  │    ○ Peu importe                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│                   [← Retour]   [Terminer ✓]         │
└─────────────────────────────────────────────────────┘
```

**Responsive**:
- Mobile : formulaire pleine largeur, padding réduit
- Desktop : max-width 600px, centré verticalement

---

### Composant: SourcingLauncher

**Rôle**: Configurer et lancer un sourcing assisté par l'IA

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  Nouvelle recherche                                 │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ 🤖 Suggestion basée sur votre profil :       │    │
│  │    Pays : New Zealand                        │    │
│  │    Secteur : Tech, Engineering               │    │
│  │    Cibles : Team Leads, Engineering Managers  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Pays          [New Zealand        ▼] [Modifier]    │
│  Secteur       [Tech               ▼] [Modifier]   │
│                                                     │
│  Sources disponibles pour ce pays :                 │
│  [✓] Seek          [✓] Matchstiq                   │
│  [✓] Zeil          [✓] built.com                   │
│  [✓] LinkedIn      [ ] Hunter.io                   │
│                                                     │
│              [Lancer la recherche →]                │
└─────────────────────────────────────────────────────┘
```

---

### Composant: SourcingProgress

**Rôle**: Afficher la progression du scraping en cours

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  Sourcing en cours...                               │
│  ████████████░░░░░░░░  62%                          │
│                                                     │
│  Seek          ✅ Terminé — 8 contacts              │
│  Matchstiq     ✅ Terminé — 4 contacts              │
│  Zeil          🔄 En cours...                       │
│  built.com     ⏳ En attente                        │
│  LinkedIn      ⏳ En attente                        │
│                                                     │
│  12 contacts trouvés pour le moment                 │
└─────────────────────────────────────────────────────┘
```

---

### Composant: ContactCard

**Rôle**: Carte résumée d'un contact (utilisée dans la liste et le kanban)

**Wireframe**:
```
┌─────────────────────────────────────────┐
│  John Smith                             │
│  Engineering Manager — Xero             │
│                                         │
│  [Très pertinent]  ← badge vert         │
│  "Leader d'équipe backend, entreprise   │
│   en croissance dans ton secteur"       │
│                                         │
│  📧 Email envoyé il y a 3j             │
│  Source: LinkedIn                        │
└─────────────────────────────────────────┘
```

**Dimensions kanban**: ~280px de large, hauteur auto
**Dimensions liste**: pleine largeur, format row

**États**:
- Default : comme ci-dessus
- Hover : léger shadow + bordure primary
- Dragging (kanban) : shadow lg, opacité 90%
- Sans email : pas de ligne "📧"

---

### Composant: EmailPreview

**Rôle**: Preview et édition d'un email avant envoi

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  ← Retour à la liste                                │
│                                                     │
│  ┌── Contact ──────────────────────────────────┐    │
│  │ John Smith — Engineering Manager — Xero     │    │
│  │ [Très pertinent] "Leader d'équipe backend"  │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  À :      john.smith@xero.com                       │
│  Objet :  [Regarding your backend team at Xero   ]  │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ Hi John,                                    │    │
│  │                                              │    │
│  │ I noticed Xero's engineering team has been   │    │
│  │ growing recently...                          │    │
│  │                                              │    │
│  │ [Zone éditable — rich text simple]           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Relances programmées :                             │
│  ○ J+3  ○ J+7  ○ J+14  [Configurer]               │
│                                                     │
│  [Rejeter]        [Sauver brouillon]   [Approuver ✓]│
└─────────────────────────────────────────────────────┘
```

---

### Composant: EmailQueue

**Rôle**: Liste des emails à valider en masse (après les 3 premiers)

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  Emails en attente (12)         [Approuver sélection]│
│                                                     │
│  [✓] John Smith — Xero           [Très pertinent]   │
│      Objet: Regarding your backend team...          │
│                                                     │
│  [✓] Marie Dupont — Datacom      [Pertinent]        │
│      Objet: Your data engineering expertise...      │
│                                                     │
│  [ ] Tom Brown — Spark NZ         [À vérifier]      │
│      Objet: Cloud infrastructure at Spark...        │
│                                                     │
│  ...                                                │
│                                                     │
│  Sélection : 8/12    [Rejeter sélection] [Approuver]│
└─────────────────────────────────────────────────────┘
```

---

### Composant: PipelineBoard

**Rôle**: Vue kanban du pipeline avec 5 colonnes

**Wireframe**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Pipeline            [Vue kanban ●] [Vue liste ○]    [Filtres ▼]       │
│                                                                         │
│  Trouvé (18)    │ À contacter (7) │ Contacté (5)  │ En discussion (2)│ Terminé (1) │
│  ──────────     │ ──────────────  │ ──────────    │ ───────────────  │ ──────────  │
│  ┌───────────┐  │ ┌─────────────┐ │ ┌──────────┐ │ ┌──────────────┐ │ ┌─────────┐ │
│  │ J. Smith  │  │ │ M. Dupont   │ │ │ T. Brown │ │ │ S. Lee       │ │ │ A. Wong │ │
│  │ Eng Mgr   │  │ │ CTO         │ │ │ VP Eng   │ │ │ Team Lead    │ │ │ Dir Eng │ │
│  │ Xero      │  │ │ Datacom     │ │ │ Spark    │ │ │ TradeMe      │ │ │ Rocket  │ │
│  │ [■ Très]  │  │ │ [■ Pert.]   │ │ │ [■ Véri] │ │ │ [■ Très]     │ │ │ ✅ Offre │ │
│  └───────────┘  │ └─────────────┘ │ └──────────┘ │ └──────────────┘ │ └─────────┘ │
│  ┌───────────┐  │ ┌─────────────┐ │ ┌──────────┐ │ ┌──────────────┐ │             │
│  │ ...       │  │ │ ...         │ │ │ ...      │ │ │ ...          │ │             │
│  └───────────┘  │ └─────────────┘ │ └──────────┘ │ └──────────────┘ │             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Colonnes MVP**:
| Colonne | Signification | Sous-statuts |
|---------|---------------|--------------|
| Trouvé | Contact issu du sourcing, analysé par l'IA | identified, analyzed |
| À contacter | Validé comme pertinent, email en préparation | to_contact |
| Contacté | Email envoyé, en attente de réponse | contacted |
| En discussion | Réponse reçue, échanges en cours | replied, interview |
| Terminé | Fin du process | offer, rejected |

**Interactions**:
- Drag & drop entre colonnes
- Clic sur carte → ouvre /contacts/:id
- Compteur par colonne mis à jour en temps réel

**Responsive**:
- Mobile : une seule colonne visible, swipe horizontal pour changer
- Tablet : 3 colonnes visibles, scroll horizontal
- Desktop : toutes les colonnes visibles

---

### Composant: ContactDetail

**Rôle**: Fiche complète d'un contact

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  ← Contacts                                        │
│                                                     │
│  ┌── En-tête ──────────────────────────────────┐    │
│  │  [Avatar]  John Smith                       │    │
│  │            Engineering Manager @ Xero       │    │
│  │            Auckland, New Zealand             │    │
│  │                                              │    │
│  │  [Très pertinent]                           │    │
│  │  "Leader d'une équipe backend de 12 devs,   │    │
│  │   Xero recrute activement dans ton secteur, │    │
│  │   match fort avec ton profil Python/Data"    │    │
│  │                                              │    │
│  │  [Override: Marquer non pertinent]           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── Entreprise ──                                   │
│  Xero | Tech/Fintech | 3000+ employés | xero.com   │
│  Signaux : 📈 3 offres publiées ce mois            │
│                                                     │
│  ── Historique des échanges ──                      │
│  📧 Email initial envoyé le 15/03 — Ouvert ✓       │
│  📧 Relance J+3 envoyée le 18/03 — En attente      │
│  📧 Relance J+7 prévue le 22/03                    │
│                                                     │
│  ── Liens ──                                        │
│  🔗 Profil LinkedIn    📧 john.smith@xero.com       │
│                                                     │
│  Statut : [Contacté ▼]                              │
│                                                     │
│  [Générer un email]  [Voir les emails]              │
└─────────────────────────────────────────────────────┘
```

---

### Composant: SettingsPage

**Rôle**: Configuration du compte et des connecteurs

**Wireframe**:
```
┌─────────────────────────────────────────────────────┐
│  Paramètres                                         │
│                                                     │
│  ── Compte ──                                       │
│  Email : yannick@example.com                        │
│  [Changer le mot de passe]                          │
│                                                     │
│  ── Connecteur Email ──                             │
│  Gmail : ✅ Connecté (yannick@gmail.com)            │
│  [Déconnecter]  [Ajouter un autre compte]           │
│                                                     │
│  ── Séquences de relance (défaut) ──                │
│  Relance 1 : J+ [3]                                │
│  Relance 2 : J+ [7]                                │
│  Relance 3 : J+ [14]                               │
│                                                     │
│  ── Apparence ──                                    │
│  Thème : [Système ▼]  (Clair / Sombre / Système)    │
│  Par défaut : suit les préférences système          │
│                                                     │
│  ── Langue ──                                       │
│  Langue : [English ▼]  (English / Français)         │
│  Par défaut : langue du navigateur                  │
│                                                     │
│  ── Sources de données ──                           │
│  Configurer les sources par pays →                  │
│                                                     │
│  [Sauvegarder]                                      │
└─────────────────────────────────────────────────────┘
```

---

## 5. Layouts des pages

### Page: Dashboard — `/`

```
┌──────────┬──────────────────────────────────────────┐
│          │                                          │
│          │  Bonjour Yannick 👋                      │
│          │                                          │
│ Sidebar  │  ┌── Actions en attente (7) ──────────┐ │
│          │  │  [DashboardActions]                 │ │
│          │  │  ...                                │ │
│          │  └────────────────────────────────────┘ │
│          │                                          │
│          │  ── Statistiques rapides ──              │
│          │  [42 contacts] [23 emails] [3 réponses]  │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Données** : actions depuis l'API, stats depuis /api/pipeline

### Page: Sourcing — `/sourcing`

```
┌──────────┬──────────────────────────────────────────┐
│          │                                          │
│          │  Sourcing          [+ Nouvelle recherche]│
│          │                                          │
│ Sidebar  │  ── Campagne en cours ──                 │
│          │  [SourcingProgress]  (si applicable)      │
│          │                                          │
│          │  ── Historique ──                         │
│          │  | Date  | Pays | Contacts | Statut |    │
│          │  | 17/03 | NZ   | 18       | ✅     |    │
│          │  | 10/03 | NZ   | 12       | ✅     |    │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

### Page: Contacts — `/contacts`

```
┌──────────┬──────────────────────────────────────────┐
│          │                                          │
│          │  Contacts (42)        [Filtres ▼] [🔍]  │
│          │                                          │
│ Sidebar  │  ┌─ Row ──────────────────────────────┐ │
│          │  │ J. Smith | Eng Mgr | Xero | [■Très]│ │
│          │  └────────────────────────────────────┘ │
│          │  ┌─ Row ──────────────────────────────┐ │
│          │  │ M. Dupont | CTO | Datacom | [■Pert]│ │
│          │  └────────────────────────────────────┘ │
│          │  ...                                     │
│          │                                          │
│          │  [← 1 2 3 ... →]  pagination             │
└──────────┴──────────────────────────────────────────┘
```

### Page: Pipeline — `/pipeline`

```
┌──────────┬──────────────────────────────────────────────────────┐
│          │                                                      │
│          │  Pipeline   [Kanban ●] [Liste ○]   [Filtres ▼]      │
│ Sidebar  │                                                      │
│          │  [PipelineBoard — 5 colonnes avec ContactCards]       │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
```

### Page: Emails — `/emails`

```
┌──────────┬──────────────────────────────────────────┐
│          │                                          │
│          │  Emails    [Brouillons (7)] [Envoyés] [Relances]│
│          │                                          │
│ Sidebar  │  ── Mode validation (3 premiers) ──      │
│          │  [EmailPreview — email 1/3]               │
│          │                                          │
│          │  ── OU mode liste ──                      │
│          │  [EmailQueue — liste scrollable]          │
│          │                                          │
│          │  [Envoyer les emails approuvés (5)]       │
└──────────┴──────────────────────────────────────────┘
```

---

## 6. Guidelines d'accessibilité

### WCAG 2.1 AA — Exigences spécifiques

1. **Contraste** : ratio minimum 4.5:1 pour le texte, 3:1 pour les grands textes et les éléments UI
2. **Navigation clavier** : tous les éléments interactifs accessibles via Tab, actions via Enter/Space
3. **Drag & drop kanban** : alternative clavier (menu contextuel "Déplacer vers..." sur chaque carte)
4. **Focus visible** : outline 2px primary sur tous les éléments focusables
5. **Labels de formulaire** : chaque input a un label explicite (pas de placeholder seul)
6. **Badges de pertinence** : ne pas reposer uniquement sur la couleur — le texte "Très pertinent" est toujours visible
7. **Annonces dynamiques** : `aria-live="polite"` pour les mises à jour de progression (sourcing, analyse)
8. **Skip link** : lien "Aller au contenu principal" en premier élément focusable
9. **Images/avatars** : `alt` descriptif ou `aria-hidden` si décoratif
10. **Dark mode** : les contrastes doivent être respectés dans les deux modes

### Responsive breakpoints
| Breakpoint | Largeur | Adaptation |
|------------|---------|------------|
| Mobile | < 768px | Sidebar cachée (hamburger), colonnes empilées, cards pleine largeur |
| Tablet | 768-1024px | Sidebar collapsible, kanban 3 colonnes visibles |
| Desktop | > 1024px | Sidebar fixe, layout complet |
