# ExpatHunter -- Document de Design V2

**Date** : 2026-03-21
**Auteur** : UX/UI Designer
**Version** : 1.0
**Statut** : Draft
**Spec de reference** : `specs/redesign-v2.md`

---

## Table des matieres

1. [Architecture d'information](#1-architecture-dinformation)
2. [User Flows](#2-user-flows)
3. [Design System](#3-design-system)
4. [Specification des composants](#4-specification-des-composants)
5. [Layout des pages](#5-layout-des-pages)

---

## 1. Architecture d'information

### 1.1 Sitemap

```
/                           Tableau de bord (Dashboard)
/onboarding                 Wizard premiere connexion (3 etapes)
  /onboarding/infos         Etape 1 : Infos de base
  /onboarding/cv            Etape 2 : Upload CV
  /onboarding/affinage      Etape 3 : Affinage conversationnel IA
/recherche                  Trouver des contacts
  /recherche/nouvelle       Nouvelle recherche (formulaire pre-rempli)
  /recherche/[id]           Detail d'une recherche en cours / terminee
/contacts                   Mes contacts
  /contacts/[id]            Fiche contact (historique complet)
/emails                     Mes emails
  /emails/[id]              Detail / edition d'un email
/suivi                      Suivi (Kanban)
/profil                     Mon profil
/parametres                 Parametres
  /parametres/compte        Section Compte
  /parametres/preferences   Section Preferences
  /parametres/email         Section Connexion email
  /parametres/ia            Section IA
/admin/ai-settings          Parametres IA (admin)
/admin/users                Gestion utilisateurs (admin)
```

### 1.2 Redirections (301)

| Ancienne route | Nouvelle route |
|----------------|----------------|
| `/sourcing`    | `/recherche`   |
| `/pipeline`    | `/suivi`       |
| `/profile`     | `/profil`      |
| `/settings`    | `/parametres`  |

### 1.3 Structure de la navigation (sidebar)

```
+-------------------------------+
|  ExpatHunter              [X] |  <- Logo + fermeture mobile
+-------------------------------+
|                               |
|  [H] Tableau de bord          |
|  [S] Trouver des contacts     |
|  [C] Mes contacts             |
|  [M] Mes emails        (12)   |  <- Badge brouillons
|  [K] Suivi               (3)  |  <- Badge reponses
|                               |
|  ------- separateur -------   |
|  [U] Mon profil               |
|  [P] Parametres               |
|                               |
|  ------- admin (conditionnel) |
|  ADMINISTRATION               |
|  [A] Parametres IA            |
|  [U] Utilisateurs             |
|                               |
+-------------------------------+
|  Marie Dupont                 |
|  marie@example.com            |
|  [Deconnexion]                |
+-------------------------------+
```

**Changements vs V1** :
- "Mon profil" et "Parametres" sont separes du bloc navigation principal (en bas, avant le footer user)
- Badges numeriques sur "Mes emails" et "Suivi"
- Labels en francais courant, possessifs ("Mon", "Mes")
- "Trouver des contacts" = verbe d'action au lieu de "Sourcing"

---

## 2. User Flows

### 2.1 Flow "Premiere connexion" (Onboarding wizard)

```
[Inscription/Connexion]
        |
        v
+------ isFirstLogin ? ------+
|  OUI                   NON  |
|   |                     |   |
|   v                     v   |
| /onboarding           /     |
+-----------------------------+
        |
        v
  ETAPE 1/3 : Infos de base
  - Nom, prenom
  - Pays actuel (select)
  - Pays cible(s) (multi-select)
  - Secteur(s) (multi-select)
  [Suivant ->]
        |
        v
  ETAPE 2/3 : Upload CV
  - Zone drag & drop / browse
  - Parsing IA automatique
  - Affichage competences detectees (chips editables)
  - Affichage experience detectee
  [<- Retour] [Suivant ->]
        |
        v
  ETAPE 3/3 : Affinage IA
  - Interface conversationnelle (2-3 questions)
  - Ex: "Quel type de poste recherchez-vous ?"
  - Ex: "Preferez-vous une grande entreprise ou une startup ?"
  [<- Retour] [Terminer]
        |
        v
  / (Dashboard) avec message de bienvenue
  + CTA "Lancer votre premiere recherche"
```

**Etats** :

| Etat | Comportement |
|------|--------------|
| **Empty** | Formulaires vides, bouton "Suivant" desactive tant que les champs requis ne sont pas remplis |
| **Loading** | Etape 2 : spinner pendant le parsing du CV, message "Analyse de votre CV en cours..." |
| **Error** | Etape 2 : si le fichier n'est pas un PDF/DOCX, message d'erreur inline. Si le parsing echoue, permettre la saisie manuelle |
| **Success** | Etape 2 : competences affichees en chips verts editables. Etape 3 : redirection dashboard avec toast "Profil cree avec succes" |

---

### 2.2 Flow "Lancer une recherche"

```
  / (Dashboard)
  ou /recherche
        |
        v
  [CTA "Nouvelle recherche"]
        |
        v
  /recherche/nouvelle
  Formulaire pre-rempli depuis le profil :
  - Pays cible (pre-selectionne)
  - Secteurs (pre-selectionnes)
  - Types de roles (pre-selectionnes)
  - Sources (auto-cochees selon pays)
  L'utilisateur ajuste si besoin
  [Lancer la recherche]
        |
        v
  /recherche/[id]
  Barre de progression unifiee 3 phases :
  +================================================+
  | [====Scraping====] [===Analyse===] [Generation] |
  | Phase 1/3 : Scraping en cours... 34/120         |
  +================================================+
        |
        v (automatique)
  Phase 2/3 : Analyse IA... 18/34
        |
        v (automatique)
  Phase 3/3 : Generation emails... 12/18
        |
        v
  TERMINE : Notification toast
  "42 contacts trouves, 28 pertinents, 28 emails prets"
  [Voir les emails] [Voir les contacts]
```

**Etats** :

| Etat | Comportement |
|------|--------------|
| **Empty** | Aucune recherche precedente : page avec illustration + CTA "Lancez votre premiere recherche" |
| **Loading** | Barre de progression 3 phases, mise a jour en temps reel (WebSocket/SSE). L'utilisateur peut naviguer ailleurs |
| **Error** | Si erreur sur une phase : les phases precedentes restent valides. Message "La phase X a rencontre un probleme. Y contacts ont ete traites avec succes." + bouton "Relancer la phase echouee" |
| **Success** | Resume avec stats + 2 CTAs (emails, contacts). Badge sidebar "Mes emails" mis a jour |

---

### 2.3 Flow "Valider et envoyer les emails en masse"

```
  /emails
        |
        v
  +-- isFirstCampaign && <3 emails revus ? --+
  |  OUI                                 NON  |
  |   |                                   |   |
  |   v                                   v   |
  | MODE GUIDED REVIEW              VUE LISTE |
  | (email plein ecran               (defaut) |
  |  un par un, 3 premiers)                   |
  +-------------------------------------------+
        |
        v
  VUE LISTE EMAILS
  - Filtres : pays | pertinence | statut
  - [x] Tout selectionner (X/Y)
  - Liste avec : checkbox | apercu sujet + 2 lignes | badge pertinence
  - Barre d'actions batch (apparait si selection > 0)
    [Approuver (X)] [Rejeter (X)]
        |
        v (clic sur un email)
  /emails/[id] -- Edition individuelle
  - Sujet editable
  - Corps editable
  - Infos contact (sidebar)
  - [Approuver] [Rejeter] [Sauvegarder brouillon]
  [<- Retour a la liste]
        |
        v (retour liste, emails approuves)
  [Envoyer les emails approuves (X)]
        |
        v
  MODALE CONFIRMATION
  "Vous allez envoyer X emails. Confirmer ?"
  [Annuler] [Confirmer l'envoi]
        |
        v
  Barre de progression envoi : X/Y envoyes
        |
        v
  Toast : "X emails envoyes avec succes"
  (ou : "X envoyes, Y en erreur" + lien vers erreurs)
```

**Etats** :

| Etat | Comportement |
|------|--------------|
| **Empty** | Aucun email : illustration + "Lancez une recherche pour generer des emails" + CTA |
| **Loading** | Skeleton loaders sur la liste. Pendant l'envoi : barre de progression + desactivation des actions |
| **Error** | Echec partiel : liste des emails en erreur avec raison (email invalide, SMTP erreur, etc.). Bouton "Renvoyer les emails en erreur" |
| **Success** | Emails envoyes passes en statut "Envoye" avec horodatage. Compteur badge sidebar decremente |

---

### 2.4 Flow "Suivre ses demarches" (Kanban)

```
  /suivi
        |
        v
  VUE KANBAN (5 colonnes, scroll horizontal mobile)

  | Trouve | A contacter | Contacte | En discussion | Termine |
  |--------|-------------|----------|---------------|---------|
  | (12)   | (8)         | (15)     | (3)           | (2)     |
  | [card] | [card]      | [card]   | [card]        | [card]  |
  | [card] | [card]      | [card]   |               |         |
  |  ...   |  ...        |  ...     |               |         |

  Filtres : source | pertinence | campagne

  CARTE CONTACT :
  +-------------------------+
  | Nom Prenom         [**] | <- badge pertinence
  | Role @ Entreprise       |
  | Pays                    |
  +-------------------------+
        |
        v (clic carte)
  /contacts/[id] -- Fiche contact
  - Infos completes
  - Historique : emails envoyes, reponses, mouvements kanban
  - Actions : deplacer manuellement, envoyer un email
```

**Mouvements automatiques** :
- Email envoye -> carte "A contacter" vers "Contacte"
- Reponse recue -> carte "Contacte" vers "En discussion"
- Drag & drop manuel toujours possible

**Etats** :

| Etat | Comportement |
|------|--------------|
| **Empty** | Kanban vide : illustration + "Vos contacts apparaitront ici apres votre premiere recherche" + CTA |
| **Loading** | Skeleton cards dans chaque colonne |
| **Error** | Erreur chargement : message + bouton "Reessayer" |
| **Success** | Kanban rempli, badges "reponses non lues" sur les cartes concernees (pastille coloree) |

---

## 3. Design System

### 3.1 Palette de couleurs (evolution)

Les CSS variables existantes sont conservees. Ajouts et ajustements :

```css
@theme {
  /* --- Existants (conserves) --- */
  --color-primary: #0d9488;          /* Teal 600 */
  --color-primary-hover: #0f766e;    /* Teal 700 */
  --color-secondary: #f97316;        /* Orange 500 */
  --color-bg-light: #fafafa;
  --color-bg-dark: #18181b;
  --color-surface-light: #ffffff;
  --color-surface-dark: #27272a;
  --color-text-main: #18181b;
  --color-text-muted: #71717a;
  --color-border: #e4e4e7;
  --color-success: #22c55e;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  --color-info: #3b82f6;

  /* --- Nouveaux (V2) --- */
  --color-primary-light: #ccfbf1;    /* Teal 100 - fonds subtils */
  --color-primary-muted: #5eead4;    /* Teal 300 - bordures actives */
  --color-surface-elevated: #ffffff; /* Cartes sureleves (ombre) */
  --color-badge-bg: #ef4444;         /* Rouge notification */
  --color-badge-text: #ffffff;
  --color-kanban-found: #e0f2fe;     /* Bleu clair */
  --color-kanban-tocontact: #fef3c7; /* Jaune clair */
  --color-kanban-contacted: #dbeafe; /* Bleu */
  --color-kanban-discussion: #d1fae5;/* Vert clair */
  --color-kanban-done: #f3f4f6;      /* Gris clair */

  /* --- Espacement standardise --- */
  --spacing-page-x: 1.5rem;         /* Mobile: 24px */
  --spacing-page-x-md: 2rem;        /* Tablet: 32px */
  --spacing-page-x-lg: 2.5rem;      /* Desktop: 40px */
}

.dark {
  /* Existants conserves + ajouts dark mode */
  --color-primary-light: #042f2e;    /* Teal 950 */
  --color-surface-elevated: #3f3f46;
  --color-kanban-found: #0c4a6e;
  --color-kanban-tocontact: #78350f;
  --color-kanban-contacted: #1e3a5f;
  --color-kanban-discussion: #064e3b;
  --color-kanban-done: #27272a;
}
```

### 3.2 Typographie

Le systeme existant (Inter variable) est conserve. Echelle standardisee :

| Role | Taille | Poids | Line-height | Usage |
|------|--------|-------|-------------|-------|
| Display | 2rem (32px) | 700 | 1.2 | Titres de page dashboard |
| H1 | 1.5rem (24px) | 700 | 1.3 | Titres de page |
| H2 | 1.25rem (20px) | 600 | 1.4 | Titres de section |
| H3 | 1.125rem (18px) | 600 | 1.4 | Sous-titres |
| Body | 0.875rem (14px) | 400 | 1.5 | Texte courant |
| Body-sm | 0.8125rem (13px) | 400 | 1.5 | Texte secondaire |
| Caption | 0.75rem (12px) | 500 | 1.4 | Labels, badges, metadata |

### 3.3 Ombres et elevations

```
--shadow-sm:   0 1px 2px rgba(0,0,0,0.05);
--shadow-md:   0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
--shadow-lg:   0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);
--shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
```

Les cartes et surfaces sureleves utilisent `--shadow-card` par defaut, `--shadow-md` au hover.

### 3.4 Bordures et rayons

```
--radius-sm: 0.375rem;   /* 6px - badges, chips */
--radius-md: 0.5rem;     /* 8px - boutons, inputs */
--radius-lg: 0.75rem;    /* 12px - cartes, modales */
--radius-xl: 1rem;       /* 16px - sections, conteneurs */
```

### 3.5 Ameliorations look "pro et moderne"

1. **Surfaces elevees** : les cartes de stats, cartes kanban et sections du dashboard utilisent `bg-surface-elevated` + `shadow-card` au lieu de bordures plates
2. **Micro-animations** : transitions 150ms sur les hover, 200ms sur les ouvertures de panneau, 300ms sur les toast
3. **Gradients subtils** : le header de page peut utiliser un gradient `from-primary/5 to-transparent` pour un look plus riche
4. **Iconographie** : passer des lettres dans des carres (V1) a des icones SVG Lucide React (V2) pour un rendu professionnel
5. **Espacement genereux** : augmenter le padding des cartes (p-4 -> p-5), l'espacement entre sections (gap-4 -> gap-6)
6. **Focus visible ameliore** : ring-2 ring-primary/50 ring-offset-2 pour une meilleure accessibilite

### 3.6 Nouveaux composants necessaires

| Composant | Usage | Priorite |
|-----------|-------|----------|
| `BadgeNotification` | Badges numeriques dans la sidebar | Must |
| `BatchActionsBar` | Barre d'actions flottante pour selection en masse | Must |
| `ProgressBarMultiStep` | Barre de progression 3 phases (recherche) | Must |
| `NotificationToast` | Notifications non intrusives coin bas-droit | Must |
| `KanbanBoard` | Vue kanban 5 colonnes avec drag & drop | Must |
| `KanbanCard` | Carte contact dans le kanban | Must |
| `StatCard` | Carte de statistique pour le dashboard | Must |
| `ActionCard` | Carte d'action en attente (dashboard) | Must |
| `EmailPreviewRow` | Ligne de la liste emails avec checkbox + apercu | Must |
| `FilterBar` | Barre de filtres combinables (pays, pertinence, statut) | Must |
| `OnboardingWizard` | Wizard 3 etapes avec indicateur de progression | Should |
| `GuidedReview` | Mode revision email plein ecran (education) | Should |
| `ChatConversation` | Interface conversationnelle pour affinage IA | Should |
| `CVUploader` | Zone upload CV avec drag & drop et parsing | Should |
| `ConfirmModal` | Modale de confirmation generique | Must |
| `EmptyState` | Illustration + message + CTA pour etats vides | Must |
| `ProfileCompleteness` | Jauge de completude du profil | Should |

---

## 4. Specification des composants

### 4.1 BadgeNotification

**Wireframe** :

```
Inline dans un lien sidebar :

  [M] Mes emails  (12)
                   ^^^^
                   badge rouge, cercle, texte blanc
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `count` | `number` | oui | Nombre a afficher |
| `max` | `number` | non | Seuil au-dela duquel afficher "99+" (defaut: 99) |
| `variant` | `'danger' \| 'warning' \| 'info'` | non | Couleur (defaut: danger) |

**Etats** :

| Etat | Rendu |
|------|-------|
| `count = 0` | Badge masque (rendu nul) |
| `count > 0 && count <= max` | Badge visible avec le chiffre |
| `count > max` | Badge visible avec "99+" |

**Interactions** : Aucune directe. Herite du clic du lien parent.

**Responsive** : Taille identique sur tous les breakpoints (h-5 w-auto min-w-5 text-xs).

**Accessibilite** :
- `aria-label` sur le lien parent incluant le compteur : "Mes emails, 12 brouillons en attente"
- Le badge est `aria-hidden="true"` (l'info est dans le label)

---

### 4.2 BatchActionsBar

**Wireframe** :

```
Mobile (bas de l'ecran, fixe) :
+---------------------------------------------------+
|  12 selectionnes    [Approuver]  [Rejeter]  [ X ] |
+---------------------------------------------------+

Desktop (bas de la zone de contenu, sticky) :
+-----------------------------------------------------------------------+
| [checkbox] 12/42 selectionnes  |  [Approuver la selection]  [Rejeter] |  [ X Annuler ]
+-----------------------------------------------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `selectedCount` | `number` | oui | Nombre d'elements selectionnes |
| `totalCount` | `number` | oui | Nombre total d'elements filtre |
| `onApprove` | `() => void` | oui | Callback approbation |
| `onReject` | `() => void` | oui | Callback rejet |
| `onCancel` | `() => void` | oui | Deselectionner tout |
| `isLoading` | `boolean` | non | Desactive les boutons pendant le traitement |

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** (selectedCount = 0) | Barre masquee |
| **active** (selectedCount > 0) | Barre visible, animation slide-up |
| **loading** | Boutons desactives, spinner sur le bouton d'action en cours |
| **hidden** (apres annulation) | Barre slide-down, disparait |

**Interactions** :
- Apparait avec animation `translate-y` quand `selectedCount > 0`
- Le bouton "Approuver" est le CTA principal (bg-primary)
- Le bouton "Rejeter" est secondaire (outline)
- "X Annuler" deselectionne tout

**Responsive** :
- Mobile : fixe en bas (bottom-0), pleine largeur, z-30, padding safe-area-inset-bottom
- Tablet/Desktop : sticky en bas de la zone liste, avec marges laterales

**Accessibilite** :
- `role="toolbar"` avec `aria-label="Actions sur la selection"`
- Boutons avec `aria-label` explicite : "Approuver 12 emails selectionnes"
- `aria-live="polite"` sur le compteur pour annoncer les changements de selection
- Focus trap clavier : Tab navigue entre les boutons

---

### 4.3 ProgressBarMultiStep

**Wireframe** :

```
Compact (dans une carte ou le dashboard) :
+----------------------------------------------------+
| Recherche en cours                            67%   |
| [========Scraping========][==Analyse==][           ]|
|  34/50 contacts            12/34        0/12        |
+----------------------------------------------------+

Detail (page /recherche/[id]) :
+----------------------------------------------------+
|  (1) Scraping          (2) Analyse IA   (3) Emails |
|  [=================]   [==========  ]   [         ]|
|   34/50 contacts        12/34 analyses   En attente|
|   Source: Seek AU        Pertinents: 12             |
+----------------------------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `steps` | `Step[]` | oui | Tableau des etapes |
| `variant` | `'compact' \| 'detail'` | non | Mode d'affichage (defaut: compact) |

```ts
type Step = {
  label: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
  current: number
  total: number
  detail?: string  // Texte additionnel (ex: "Source: Seek AU")
}
```

**Etats** :

| Etat | Rendu |
|------|-------|
| **pending** | Barre grise, texte "En attente" |
| **in-progress** | Barre animee (pulse subtil sur la progression), couleur primary |
| **completed** | Barre pleine, couleur success, icone check |
| **error** | Barre rouge a l'endroit de l'erreur, icone alerte, message d'erreur |

**Interactions** :
- Mise a jour en temps reel via WebSocket/SSE
- Clic sur une etape en erreur -> affiche le detail de l'erreur

**Responsive** :
- Mobile : variante compact uniquement, etapes empilees verticalement
- Desktop : variante detail, etapes cote a cote

**Accessibilite** :
- `role="progressbar"` sur chaque segment
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` sur chaque barre
- `aria-label` descriptif : "Etape 1 sur 3 : Scraping, 34 sur 50 contacts"
- `aria-live="polite"` pour annoncer les changements d'etape

---

### 4.4 NotificationToast

**Wireframe** :

```
Coin inferieur droit (desktop) / bas centre (mobile) :

+-------------------------------------------+
| [icone] Recherche terminee         [ X ]  |
| 42 contacts, 28 pertinents, 28 emails     |
| [Voir les emails]                         |
+-------------------------------------------+
   ^                                 ^
   |                                 |
   couleur bord gauche              fermer
   selon type (success/info/error)
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `title` | `string` | oui | Titre de la notification |
| `message` | `string` | non | Message detaille |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | non | Type (defaut: info) |
| `action` | `{ label: string, href: string }` | non | Lien cliquable optionnel |
| `duration` | `number` | non | Duree en ms avant auto-dismiss (defaut: 5000, 0 = persistant) |
| `onDismiss` | `() => void` | non | Callback fermeture |

**Etats** :

| Etat | Rendu |
|------|-------|
| **entering** | Animation slide-up + fade-in (300ms) |
| **visible** | Affiche avec barre de temps qui se vide (bord inferieur) |
| **dismissing** | Animation slide-down + fade-out (200ms) |
| **stacked** | Si plusieurs toasts, empiles avec decalage vertical (max 3 visibles) |

**Interactions** :
- Hover sur le toast : pause le timer d'auto-dismiss
- Clic sur le bouton action : navigue + ferme le toast
- Clic sur X : ferme immediatement
- Swipe gauche (mobile) : ferme

**Responsive** :
- Mobile : bas-centre, pleine largeur avec marges (mx-4), bottom-4
- Desktop : bas-droite, largeur max 400px, bottom-6 right-6

**Accessibilite** :
- `role="alert"` pour les types error/warning
- `role="status"` pour les types success/info
- `aria-live="assertive"` pour error, `aria-live="polite"` pour les autres
- Bouton fermer avec `aria-label="Fermer la notification"`
- Le lien action est focusable au clavier

---

### 4.5 KanbanBoard

**Wireframe** :

```
Desktop :
+----------+-------------+----------+---------------+------------+---------+
| Trouve   | A contacter | Contacte | En discussion | Entretien  | Termine |
| (12)     | (8)         | (15)     | (3)           | (1)        | (2)     |
+----------+-------------+----------+---------------+------------+---------+
| [card]   | [card]      | [card]   | [card]        | [card]     | [card]  |
| [card]   | [card]      | [card]   | [card]        |   +date    | [card]  |
| [card]   |             | [card]   |               |            |  +motif |
|          |             | [card]   |               |            |         |
| scroll   |             | scroll   |               |            |         |
+----------+-------------+----------+---------------+------------+---------+

Colonne "Termine" — sous-statuts affiches sur la carte :
  [Offre recue ✓]  [Refuse ✗]  [Abandon —]

Mobile (scroll horizontal, 1 colonne visible a la fois) :
+----------------------------------+
| < Trouve (12)  | A contacter >  |  <- tabs ou swipe
+----------------------------------+
| [card]                           |
| [card]                           |
| [card]                           |
| ...                              |
+----------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `columns` | `KanbanColumn[]` | oui | Definition des colonnes |
| `onCardMove` | `(cardId, fromCol, toCol) => void` | oui | Callback drag & drop |
| `filters` | `FilterState` | non | Filtres actifs |

```ts
type KanbanColumn = {
  id: string
  label: string
  color: string         // CSS variable pour le fond
  cards: KanbanCardData[]
}

type KanbanCardData = {
  id: string
  name: string
  role: string
  company: string
  country: string
  relevanceScore: 'high' | 'medium' | 'low'
  hasUnreadReply: boolean
  interviewDate?: string        // date d'entretien detectee par l'IA
  endReason?: 'offer' | 'refused' | 'abandoned'  // sous-statut de "Termine"
  lastEventDetected?: string    // dernier evenement detecte par l'IA
}
```

**Etats** :

| Etat | Rendu |
|------|-------|
| **empty** | Illustration centree + message + CTA |
| **loading** | Skeleton columns avec skeleton cards |
| **default** | Colonnes remplies, drag & drop actif |
| **dragging** | Carte soulevee (shadow-lg, scale 1.02), zone de depot surlignee |
| **error** | Si echec du deplacement : carte revient a sa position, toast erreur |

**Interactions** :
- Drag & drop (desktop) : pointer-events sur la carte, drop zones surlignees
- Mobile : pas de drag & drop, bouton "Deplacer" dans le menu contextuel de la carte
- Clic sur carte : navigation vers /contacts/[id]

**Responsive** :
- Mobile : navigation par tabs horizontaux ou swipe, 1 colonne a la fois
- Tablet : 2-3 colonnes visibles, scroll horizontal
- Desktop : 6 colonnes visibles (xl: confortable, lg: compact)

**Accessibilite** :
- `role="region"` avec `aria-label` pour chaque colonne
- Cartes avec `role="listitem"` dans un `role="list"`
- Drag & drop : alternative clavier via bouton "Deplacer vers..." qui ouvre un select des colonnes
- Compteurs de colonnes annonces par screen reader
- Couleurs de pertinence accompagnees d'un label textuel

---

### 4.6 KanbanCard

**Wireframe** :

```
+-----------------------------+
| [*] Jean Dupont        [**] |  <- [*] pastille reponse non lue
|     Dev Lead                |      [**] badge pertinence
|     @ TechCorp Australia    |
|     Australie               |
+-----------------------------+

Badge pertinence :
  [**] = pastille coloree
  Haute  : vert  (--color-success)
  Moyenne: orange (--color-warning)
  Faible : gris  (--color-text-muted)
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `contact` | `KanbanCardData` | oui | Donnees du contact |
| `isDragging` | `boolean` | non | Etat drag en cours |
| `onClick` | `() => void` | oui | Navigation vers fiche |

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** | Carte avec shadow-card, bg-surface-elevated |
| **hover** | shadow-md, bordure primary subtile |
| **dragging** | shadow-lg, scale(1.02), opacity 0.9 |
| **unread** | Pastille coloree (--color-info) coin superieur gauche |
| **focus** | Ring primary visible |

**Responsive** : Pleine largeur de la colonne parente. Padding p-3 mobile, p-4 desktop.

**Accessibilite** :
- `role="button"` car cliquable
- `aria-label` complet : "Jean Dupont, Dev Lead chez TechCorp Australia, pertinence haute, 1 reponse non lue"
- Le badge pertinence a un `title` textuel en plus de la couleur

---

### 4.7 EventDetectionNotification

**Role** : Notification affichee quand l'IA detecte un evenement important dans un email recu (entretien, refus, offre). L'utilisateur peut confirmer ou corriger.

**Wireframe** :

```
+---------------------------------------------------------------+
|  🤖 Detection IA                                       [×]    |
|                                                                |
|  Marie Dupont (TechCorp) vous propose un entretien             |
|  le 25 mars 2026.                                              |
|                                                                |
|  La carte a ete deplacee en "Entretien".                       |
|                                                                |
|  [Voir la conversation]  [Corriger le statut ▾]               |
+---------------------------------------------------------------+
```

**Props** :
- `contactName`: string
- `companyName`: string
- `detectedEvent`: 'interview_proposed' | 'refused' | 'offer' | 'info_request'
- `detectedDate`: string | null — date detectee (ex: entretien)
- `newStatus`: string — colonne cible du kanban
- `onDismiss`: () => void
- `onCorrect`: (newStatus: string) => void
- `onViewConversation`: () => void

**Etats** :
- Default : notification persistante (ne disparait pas automatiquement, contrairement aux toasts)
- Apres correction : toast de confirmation "Statut mis a jour"

**Responsive** : Meme comportement que NotificationToast mais reste visible jusqu'au dismiss.

**Accessibilite** :
- `role="alertdialog"` car necessite une action
- `aria-label="Detection IA : [evenement] pour [contact]"`
- Boutons accessibles au clavier

---

### 4.8 RefusalBlockModal

**Role** : Modale affichee quand un contact passe en "Termine → Refuse" pour choisir le perimetre de blocage.

**Wireframe** :

```
+---------------------------------------------------------------+
|  Contact refuse                                         [×]    |
|                                                                |
|  Marie Dupont (TechCorp NZ) a ete marque comme refuse.        |
|  Que souhaitez-vous faire ?                                    |
|                                                                |
|  ( ) Bloquer ce contact uniquement                             |
|      Vous pourrez contacter d'autres personnes chez TechCorp  |
|                                                                |
|  ( ) Bloquer toute l'entreprise TechCorp                       |
|      Plus aucun contact chez TechCorp ne sera inclus           |
|      dans vos prochains envois                                 |
|                                                                |
|  Duree du blocage : [12 mois              ▾]                  |
|  (6 mois / 12 mois / 2 ans / Definitivement)                  |
|                                                                |
|  [Annuler]                            [Confirmer le blocage]   |
+---------------------------------------------------------------+
```

**Props** :
- `contactName`: string
- `companyName`: string
- `onConfirm`: (scope: 'contact' | 'company', duration: number | 'permanent') => void
- `onCancel`: () => void

**Etats** :
- Default : radio "contact uniquement" pre-selectionne, duree "12 mois" par defaut
- Loading : apres confirmation, bouton en spinner
- Success : modale fermee + toast "Blocage enregistre"

**Accessibilite** :
- `role="dialog"` avec `aria-modal="true"`
- Focus trap a l'interieur de la modale
- Escape pour fermer
- Premier focus sur le premier radio button

---

### 4.9 StatCard

**Wireframe** :

```
+---------------------------+
| [icone]                   |
| 142                       |  <- valeur (display)
| Contacts trouves          |  <- label (body-sm, muted)
+---------------------------+

Variante avec tendance :
+---------------------------+
| [icone]              +12% |  <- tendance (vert = hausse)
| 42                        |
| Emails envoyes            |
+---------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `value` | `number \| string` | oui | Valeur principale |
| `label` | `string` | oui | Description de la metrique |
| `icon` | `ReactNode` | non | Icone Lucide |
| `trend` | `{ value: number, direction: 'up' \| 'down' }` | non | Tendance |

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** | Carte avec fond surface-elevated, shadow-card |
| **loading** | Skeleton : rectangle pour la valeur, ligne pour le label |
| **hover** | shadow-md |
| **empty** | Valeur "0" ou "--", label en muted |

**Responsive** :
- Mobile : 2 cartes par ligne (grid-cols-2)
- Tablet : 3 cartes par ligne
- Desktop : 4 cartes par ligne

**Accessibilite** :
- `role="figure"` avec `aria-label` : "142 contacts trouves"
- Tendance avec `aria-label` : "en hausse de 12 pourcent"

---

### 4.10 ActionCard

**Wireframe** :

```
+-----------------------------------------------------+
| [icone anim]  12 emails a valider                    |
|               Campagne "Australie - Tech" du 20 mars |
|                                    [Voir les emails] |
+-----------------------------------------------------+

Etat vide (aucune action) :
+-----------------------------------------------------+
| [illustration]                                       |
|  Rien a faire pour le moment !                       |
|  Lancez une recherche pour commencer.                |
|                              [Nouvelle recherche]    |
+-----------------------------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `icon` | `ReactNode` | oui | Icone representant l'action |
| `title` | `string` | oui | Description de l'action |
| `subtitle` | `string` | non | Detail complementaire |
| `action` | `{ label: string, href: string }` | oui | CTA |
| `urgency` | `'high' \| 'normal'` | non | Determine la couleur du bord gauche |

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** | Fond surface-elevated, bord gauche colore (primary = normal, warning = high) |
| **hover** | shadow-md, le CTA passe en sousligne |
| **loading** | Skeleton |

**Responsive** : Pleine largeur, empilee. Mobile : padding p-4. Desktop : padding p-5.

**Accessibilite** :
- La carte entiere est cliquable (lien) mais le CTA est aussi focusable individuellement
- `aria-label` sur le lien : "12 emails a valider, campagne Australie Tech du 20 mars"

---

### 4.11 EmailPreviewRow

**Wireframe** :

```
+------------------------------------------------------------------+
| [x] | [avatar] Jean Dupont          | Score: [***]  | Australie |
|     |          Dev Lead @ TechCorp   |               |           |
|     |          Re: Opportunite...    |               |           |
|     |          Bonjour Jean, je me   |               |           |
|     |          permets de...         |               |           |
+------------------------------------------------------------------+

[x] = checkbox
[***] = badge pertinence (3 etoiles / points)
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `email` | `EmailPreview` | oui | Donnees de l'email |
| `isSelected` | `boolean` | oui | Etat de selection |
| `onSelect` | `(id) => void` | oui | Toggle selection |
| `onClick` | `(id) => void` | oui | Ouvrir le detail |

```ts
type EmailPreview = {
  id: string
  contactName: string
  contactRole: string
  contactCompany: string
  country: string
  subject: string
  preview: string          // 2 premieres lignes
  relevanceScore: 'high' | 'medium' | 'low'
  status: 'draft' | 'approved' | 'sent' | 'error'
}
```

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** | Fond transparent, bordure bottom subtile |
| **hover** | Fond primary/5 |
| **selected** | Fond primary/10, checkbox cochee, bordure gauche primary |
| **approved** | Badge "Approuve" vert |
| **sent** | Badge "Envoye" gris, non selectionnable |
| **error** | Badge "Erreur" rouge, bordure gauche rouge |

**Interactions** :
- Checkbox : toggle selection sans ouvrir le detail
- Clic ailleurs sur la ligne : ouvre le detail de l'email
- Sur mobile : swipe droit = selectionner, swipe gauche = rejeter (optionnel)

**Responsive** :
- Mobile : layout empile (nom, sujet, apercu sur 3 lignes), checkbox a gauche, badge a droite
- Desktop : layout horizontal sur une ligne

**Accessibilite** :
- Checkbox avec `aria-label` : "Selectionner l'email pour Jean Dupont"
- La ligne est un `role="row"` dans un `role="table"` ou un `role="listitem"`
- Score de pertinence : `aria-label="Pertinence haute"` en plus du visuel

---

### 4.12 FilterBar

**Wireframe** :

```
Desktop :
+-----------------------------------------------------------------------+
| Filtres:  [Pays v]  [Pertinence v]  [Statut v]  |  Reinitialiser (3) |
+-----------------------------------------------------------------------+

Filtre ouvert :
+------------------+
| Pays             |
| [x] Australie    |
| [ ] Canada       |
| [ ] Allemagne    |
| [Appliquer]      |
+------------------+

Mobile :
+-------------------------------------------+
| [Filtrer (3)]                 [Trier v]   |
+-------------------------------------------+
   -> ouvre un bottom sheet avec tous les filtres
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `filters` | `FilterDefinition[]` | oui | Liste des filtres disponibles |
| `activeFilters` | `Record<string, string[]>` | oui | Filtres actifs |
| `onChange` | `(filters) => void` | oui | Callback changement |
| `onReset` | `() => void` | oui | Reinitialiser tout |

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** | Tous les filtres en etat neutre |
| **active** | Les filtres avec valeurs ont un badge compteur, bouton "Reinitialiser" visible |
| **open** | Dropdown ouvert sous le filtre selectionne |
| **loading** | Skeleton placeholder |

**Responsive** :
- Mobile : bouton "Filtrer" ouvre un bottom sheet modal avec tous les filtres
- Desktop : filtres inline, dropdowns

**Accessibilite** :
- Chaque filtre est un `<button>` avec `aria-haspopup="listbox"` et `aria-expanded`
- Le dropdown utilise `role="listbox"` avec `role="option"` pour chaque choix
- Le badge compteur est annonce : "Pays, 2 filtres actifs"
- "Reinitialiser" a un `aria-label` : "Reinitialiser tous les filtres, 3 actifs"

---

### 4.13 ConfirmModal

**Wireframe** :

```
+-------------------------------------------+
|  Confirmer l'envoi                   [X]  |
|-------------------------------------------|
|                                           |
|  Vous allez envoyer 28 emails.            |
|  Cette action est irreversible.           |
|                                           |
|               [Annuler]  [Confirmer]      |
+-------------------------------------------+

Fond : overlay noir 50%
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `title` | `string` | oui | Titre de la modale |
| `message` | `string` | oui | Message descriptif |
| `confirmLabel` | `string` | non | Texte du bouton confirmer (defaut: "Confirmer") |
| `cancelLabel` | `string` | non | Texte du bouton annuler (defaut: "Annuler") |
| `variant` | `'danger' \| 'primary'` | non | Couleur du bouton confirmer |
| `isLoading` | `boolean` | non | Spinner sur confirmer pendant le traitement |
| `onConfirm` | `() => void` | oui | Callback confirmation |
| `onCancel` | `() => void` | oui | Callback annulation |

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** | Modale centree, overlay, focus sur le bouton "Confirmer" |
| **loading** | Bouton confirmer avec spinner, desactive. Annuler toujours actif |

**Responsive** :
- Mobile : modale pleine largeur avec marges (mx-4), ancree en bas (bottom sheet style)
- Desktop : centree, max-w-md

**Accessibilite** :
- `role="alertdialog"` avec `aria-modal="true"`
- `aria-labelledby` pointe vers le titre
- `aria-describedby` pointe vers le message
- Focus trap : Tab circule entre Annuler et Confirmer
- Echap ferme la modale
- Focus restaure sur l'element declencheur a la fermeture

---

### 4.14 EmptyState

**Wireframe** :

```
+-------------------------------------------+
|                                           |
|         [illustration SVG]                |
|                                           |
|   Aucun email pour le moment              |
|   Lancez une recherche pour generer       |
|   vos premiers emails personnalises.      |
|                                           |
|         [Lancer une recherche]            |
|                                           |
+-------------------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `illustration` | `'search' \| 'email' \| 'kanban' \| 'welcome'` | oui | Type d'illustration |
| `title` | `string` | oui | Titre |
| `description` | `string` | oui | Description |
| `action` | `{ label: string, href: string }` | non | CTA optionnel |

**Etats** : Un seul etat (statique).

**Responsive** : Centre sur tous les breakpoints. Illustration plus petite sur mobile (h-32 vs h-48).

**Accessibilite** :
- Illustration avec `aria-hidden="true"` (decorative)
- Le CTA est un lien standard focusable

---

### 4.15 OnboardingWizard

**Wireframe** :

```
+-----------------------------------------------------------+
|  ExpatHunter                                              |
|-----------------------------------------------------------|
|                                                           |
|   Bienvenue ! Configurons votre profil.                   |
|                                                           |
|   (1)-------(2)-------(3)                                 |
|   Infos     CV        Affinage                            |
|   [actif]   [a venir] [a venir]                           |
|                                                           |
|   +---------------------------------------------+        |
|   | Pays actuel                                  |        |
|   | [France                              v]      |        |
|   |                                              |        |
|   | Pays cible(s)                                |        |
|   | [Australie] [Canada] [+ Ajouter]             |        |
|   |                                              |        |
|   | Secteur(s)                                   |        |
|   | [Tech / IT] [+ Ajouter]                      |        |
|   +---------------------------------------------+        |
|                                                           |
|                                        [Suivant ->]       |
+-----------------------------------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `currentStep` | `1 \| 2 \| 3` | oui | Etape courante |
| `onNext` | `(data) => void` | oui | Passer a l'etape suivante |
| `onBack` | `() => void` | oui | Revenir en arriere |
| `onComplete` | `(data) => void` | oui | Fin du wizard |

**Etats par etape** :

| Etape | Loading | Error | Success |
|-------|---------|-------|---------|
| 1 | -- | Validation inline si champs requis manquants | Champs valides, bouton Suivant actif |
| 2 | Spinner pendant parsing CV | Fichier invalide : message inline + saisie manuelle | Competences affichees en chips editables |
| 3 | Spinner pendant reponse IA | Erreur IA : "Nous n'avons pas pu analyser, vous pouvez passer cette etape" | Reponses validees |

**Responsive** :
- Mobile : plein ecran, etapes empilees, indicateur de progression en haut
- Desktop : centre dans la page, max-w-2xl

**Accessibilite** :
- Indicateur de progression : `role="progressbar"` ou `aria-label="Etape 1 sur 3"`
- Navigation : boutons Retour/Suivant clairement labels
- Focus place sur le premier champ a chaque changement d'etape

---

### 4.16 GuidedReview

**Wireframe** :

```
+-----------------------------------------------------------+
|  Email 1/3 - Mode decouverte                  [Passer >>] |
|-----------------------------------------------------------|
|                                                           |
|  Destinataire : Jean Dupont                               |
|  Role : Dev Lead @ TechCorp                               |
|  Pays : Australie | Pertinence : Haute                    |
|                                                           |
|  +-----------------------------------------------------+ |
|  | Objet: Opportunite dev front-end - TechCorp          | |
|  |-----------------------------------------------------| |
|  | Bonjour Jean,                                        | |
|  |                                                      | |
|  | Je me permets de vous contacter car votre profil     | |
|  | chez TechCorp correspond exactement a ce que je      | |
|  | recherche dans le cadre de mon projet d'expatriation | |
|  | en Australie.                                        | |
|  | ...                                                  | |
|  +-----------------------------------------------------+ |
|                                                           |
|  [Rejeter]       [Modifier]       [Approuver -->]         |
|                                                           |
|  Astuce : L'IA a personnalise cet email en fonction       |
|  du profil de Jean et de votre experience.                |
+-----------------------------------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `emails` | `Email[]` | oui | Les 3 premiers emails |
| `currentIndex` | `number` | oui | Index courant (0-2) |
| `onApprove` | `(id) => void` | oui | Approuver |
| `onReject` | `(id) => void` | oui | Rejeter |
| `onEdit` | `(id) => void` | oui | Ouvrir en edition |
| `onSkip` | `() => void` | oui | Passer au mode liste |

**Etats** :

| Etat | Rendu |
|------|-------|
| **default** | Email affiche en plein ecran, 3 boutons d'action |
| **transitioning** | Animation slide vers l'email suivant |
| **last** | Apres le 3eme : message "Vous etes pret ! Passage en mode liste..." puis redirection |

**Responsive** :
- Mobile : contenu scrollable, boutons fixes en bas
- Desktop : email centre, max-w-3xl

**Accessibilite** :
- Indicateur "Email 1 sur 3" avec `aria-live="polite"`
- Boutons avec `aria-label` explicites
- Contenu de l'email dans un `article` avec `aria-label`

---

### 4.17 CVUploader

**Wireframe** :

```
Etat initial :
+-------------------------------------------+
|                                           |
|  [icone upload]                           |
|                                           |
|  Deposez votre CV ici                     |
|  ou cliquez pour parcourir                |
|                                           |
|  Formats acceptes : PDF, DOCX            |
|  Taille max : 10 Mo                       |
+-------------------------------------------+

Etat drag over :
+-------------------------------------------+
|  //////// bordure tirets primary //////// |
|                                           |
|  Deposez votre fichier                    |
|                                           |
+-------------------------------------------+

Etat uploade + parsing :
+-------------------------------------------+
|  [icone check] mon-cv.pdf                 |
|  Analyse en cours...  [===========    ]   |
+-------------------------------------------+

Etat parsing termine :
+-------------------------------------------+
|  [icone check] mon-cv.pdf    [Changer]    |
|                                           |
|  Competences detectees :                  |
|  [React] [TypeScript] [Node.js] [x]      |
|  [+ Ajouter]                              |
|                                           |
|  Experience : 5 ans dev front-end         |
+-------------------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `onUpload` | `(file) => Promise<ParseResult>` | oui | Upload + parsing |
| `onSkillsChange` | `(skills) => void` | oui | Modification des competences |
| `initialFile` | `File` | non | Fichier deja uploade |
| `maxSize` | `number` | non | Taille max en octets (defaut: 10Mo) |

**Etats** :

| Etat | Rendu |
|------|-------|
| **empty** | Zone drag & drop vide |
| **dragover** | Bordure tirets primary, fond primary/5 |
| **uploading** | Nom du fichier + barre de progression |
| **parsing** | Message "Analyse en cours" + spinner |
| **success** | Fichier uploade + competences en chips editables |
| **error** | Message rouge : "Format non supporte" ou "Echec de l'analyse, saisissez vos competences manuellement" |

**Responsive** : Pleine largeur. La zone de drop est plus haute sur mobile (min-h-48) pour faciliter le tap.

**Accessibilite** :
- Input file cache, label cliquable sur toute la zone
- `aria-label="Deposer ou selectionner votre CV, formats PDF ou DOCX, taille maximum 10 megaoctets"`
- Etat du parsing annonce via `aria-live="polite"`
- Les chips de competences sont des boutons avec `aria-label="Supprimer React"` sur le X

---

### 4.18 ProfileCompleteness

**Wireframe** :

```
+-----------------------------------+
| Profil complete a 75%             |
| [================        ]        |
| Il manque : competences, CV       |
+-----------------------------------+
```

**Props** :

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `percentage` | `number` | oui | Pourcentage de completude (0-100) |
| `missingFields` | `string[]` | non | Champs manquants |

**Etats** :

| Etat | Rendu |
|------|-------|
| **incomplete** (< 100%) | Barre partielle, couleur warning si < 50%, primary si >= 50% |
| **complete** (100%) | Barre pleine, couleur success, message "Profil complet !" |

**Accessibilite** :
- `role="progressbar"` avec `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`
- `aria-label="Profil complete a 75 pourcent, champs manquants : competences, CV"`

---

## 5. Layout des pages

### 5.1 Layout global

```
+--------+----------------------------------------------+
|        |  [breadcrumb]                                 |
|        |  Titre de la page                             |
| Sidebar|                                               |
| (fixe  |  +------------------------------------------+ |
|  240px)|  |                                          | |
|        |  |          CONTENU DE LA PAGE               | |
|        |  |                                          | |
|        |  +------------------------------------------+ |
|        |                                               |
|        |  [Toast notifications - coin bas droit]       |
+--------+----------------------------------------------+

Mobile :
+----------------------------------------------+
| [hamburger] ExpatHunter                      |
|----------------------------------------------|
| [breadcrumb]                                 |
| Titre de la page                             |
|                                              |
| +------------------------------------------+ |
| |          CONTENU DE LA PAGE               | |
| +------------------------------------------+ |
|                                              |
| [Toast notifications - bas centre]           |
+----------------------------------------------+
```

La sidebar existante est conservee avec les modifications du point 1.3.
Le contenu principal a un `id="main-content"` pour le lien "Skip to content" existant.

---

### 5.2 Page : Tableau de bord (`/`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Tableau de bord                                     |
|        |                                                      |
|        |  +-- ACTIONS EN ATTENTE (section) ----------------+ |
|        |  |                                                 | |
|        |  |  [ActionCard] 12 emails a valider               | |
|        |  |              Campagne "AU - Tech" du 20/03      | |
|        |  |                           [Voir les emails]     | |
|        |  |                                                 | |
|        |  |  [ActionCard] 3 reponses non lues               | |
|        |  |              Derniere il y a 2h                  | |
|        |  |                           [Voir le suivi]       | |
|        |  |                                                 | |
|        |  |  [ActionCard] Recherche en cours                 | |
|        |  |              Canada - Finance (67%)              | |
|        |  |                           [Voir le detail]      | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- STATISTIQUES (grid 4 colonnes) ---------------+ |
|        |  |                                                 | |
|        |  | [StatCard]  [StatCard]  [StatCard]  [StatCard]  | |
|        |  |  142         42         18%         3           | |
|        |  | Contacts   Emails     Taux rep.   Entretiens   | |
|        |  | trouves    envoyes                obtenus      | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- ACTIONS RAPIDES ------------------------------+ |
|        |  |                                                 | |
|        |  |  [Nouvelle recherche]  [Voir mes contacts]      | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Composants utilises** :
- `ActionCard` x N (actions en attente)
- `StatCard` x 4 (stats globales)
- `EmptyState` (si aucune action et aucun contact)
- Boutons CTA standards

**Donnees necessaires** :
- `GET /api/dashboard/actions` -> actions en attente (emails, reponses, recherches en cours)
- `GET /api/dashboard/stats` -> stats globales (contacts, emails, taux reponse, entretiens)

**Responsive** :
- Mobile : Actions empilees, stats en grid 2 colonnes, actions rapides empilees
- Tablet : Stats en grid 3 colonnes
- Desktop : Layout ci-dessus, stats en grid 4 colonnes

---

### 5.3 Page : Trouver des contacts (`/recherche`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Trouver des contacts          [Nouvelle recherche]  |
|        |                                                      |
|        |  +-- RECHERCHES EN COURS / RECENTES ---------------+ |
|        |  |                                                 | |
|        |  |  [ProgressBarMultiStep compact]                 | |
|        |  |  Australie - Tech | 20/03 | Phase 2/3 : 67%    | |
|        |  |                                   [Voir detail] | |
|        |  |                                                 | |
|        |  |  [Carte recherche terminee]                     | |
|        |  |  Canada - Finance | 18/03 | 42 contacts        | |
|        |  |                             [Voir les contacts] | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Page `/recherche/nouvelle`** :

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  <- Retour   Nouvelle recherche                      |
|        |                                                      |
|        |  +-- PARAMETRES (pre-remplis) --------------------+ |
|        |  |                                                 | |
|        |  |  Pays cible                                     | |
|        |  |  [Australie v]     (pre-rempli depuis profil)   | |
|        |  |                                                 | |
|        |  |  Secteurs                                       | |
|        |  |  [Tech / IT] [Finance] [+ Ajouter]              | |
|        |  |                                                 | |
|        |  |  Types de roles                                 | |
|        |  |  [Dev Lead] [CTO] [+ Ajouter]                   | |
|        |  |                                                 | |
|        |  |  Sources                                        | |
|        |  |  [x] Seek  [x] Indeed  [ ] LinkedIn             | |
|        |  |  (auto-cochees selon le pays)                    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |          [Lancer la recherche]                       |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Composants utilises** :
- `ProgressBarMultiStep` (variante compact pour la liste, variante detail pour /recherche/[id])
- `EmptyState` (si aucune recherche)
- `FilterBar` (optionnel pour filtrer les recherches passees)
- Formulaire avec selects, multi-selects, chips, checkboxes

**Donnees necessaires** :
- `GET /api/searches` -> liste des recherches
- `GET /api/searches/[id]` -> detail + progression temps reel (WebSocket)
- `GET /api/profile` -> pre-remplissage du formulaire
- `POST /api/searches` -> lancer une recherche

---

### 5.4 Page : Mes contacts (`/contacts`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Mes contacts                           (142 total)  |
|        |                                                      |
|        |  [FilterBar: pays | pertinence | campagne | source] |
|        |                                                      |
|        |  +-- LISTE (table responsive) --------------------+ |
|        |  |  Nom          Role         Entreprise  Score   | |
|        |  |  J. Dupont    Dev Lead     TechCorp    ***     | |
|        |  |  A. Smith     CTO          StartupXY   **      | |
|        |  |  ...                                           | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  [Pagination: < 1 2 3 ... 15 >]                     |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Page `/contacts/[id]`** :

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  <- Mes contacts   Jean Dupont                       |
|        |                                                      |
|        |  +-- INFOS ---------+  +-- HISTORIQUE -----------+ |
|        |  | Dev Lead          |  | 20/03 - Trouve          | |
|        |  | TechCorp          |  | 20/03 - Email genere    | |
|        |  | Sydney, AU        |  | 20/03 - Email envoye    | |
|        |  | jean@techcorp.au  |  | 21/03 - Reponse recue   | |
|        |  | Pertinence: ***   |  | "Thanks for reaching.." | |
|        |  | Statut: En disc.  |  +-------------------------+ |
|        |  +-------------------+                              |
|        |                                                      |
|        |  [Deplacer vers...] [Envoyer un email]              |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Composants utilises** :
- `FilterBar`
- Table responsive (composant existant ou nouveau)
- `EmptyState`
- Pagination standard

**Donnees necessaires** :
- `GET /api/contacts?page=&filters=` -> liste paginee
- `GET /api/contacts/[id]` -> fiche contact + historique

---

### 5.5 Page : Mes emails (`/emails`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Mes emails                             (42 total)   |
|        |                                                      |
|        |  [FilterBar: pays | pertinence | statut]            |
|        |                                                      |
|        |  [x] Tout selectionner (12/42)                      |
|        |                                                      |
|        |  +-- LISTE EMAILS --------------------------------+ |
|        |  |  [EmailPreviewRow] J. Dupont | Re: Opp... | AU  | |
|        |  |  [EmailPreviewRow] A. Smith  | Hello...   | CA  | |
|        |  |  [EmailPreviewRow] ...                          | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  [Pagination: < 1 2 3 >]                            |
|        |                                                      |
|        |  +-- BatchActionsBar (si selection > 0) ----------+ |
|        |  | 12/42 select.  [Approuver(12)] [Rejeter] [ X ] | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  [Envoyer les emails approuves (8)]                 |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Page `/emails/[id]`** :

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  <- Mes emails   Email pour Jean Dupont              |
|        |                                                      |
|        |  +-- CONTACT INFO (sidebar droite desktop) -------+ |
|        |  | Jean Dupont                                     | |
|        |  | Dev Lead @ TechCorp                             | |
|        |  | Sydney, Australie                               | |
|        |  | Pertinence: Haute                               | |
|        |  +------------------------------------------------+ |
|        |                                                      |
|        |  +-- EMAIL (editable) ----------------------------+ |
|        |  | Objet: [Opportunite dev front-end - TechCorp ] | |
|        |  |------------------------------------------------| |
|        |  | Bonjour Jean,                                  | |
|        |  |                                                | |
|        |  | [textarea editable du corps]                   | |
|        |  |                                                | |
|        |  +------------------------------------------------+ |
|        |                                                      |
|        |  [Rejeter] [Sauvegarder brouillon] [Approuver]      |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Composants utilises** :
- `FilterBar`
- `EmailPreviewRow` x N
- `BatchActionsBar`
- `ConfirmModal` (avant envoi en masse)
- `ProgressBarMultiStep` (pendant envoi, variante simple 1 phase)
- `NotificationToast` (fin d'envoi)
- `GuidedReview` (premiere campagne, 3 premiers emails)
- `EmptyState`

**Donnees necessaires** :
- `GET /api/emails?page=&filters=` -> liste paginee
- `GET /api/emails/[id]` -> detail email + contact
- `PATCH /api/emails/[id]` -> modifier un email
- `POST /api/emails/batch/approve` -> approuver en masse
- `POST /api/emails/batch/reject` -> rejeter en masse
- `POST /api/emails/send` -> envoyer les approuves

---

### 5.6 Page : Suivi (`/suivi`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Suivi                                               |
|        |                                                      |
|        |  [FilterBar: source | pertinence | campagne]        |
|        |                                                      |
|        |  +-- KANBAN BOARD --------------------------------+ |
|        |  |                                                 | |
|        |  | Trouve  A contact. Contacte  En disc.  Termine  | |
|        |  | (12)    (8)       (15)       (3)       (2)      | |
|        |  | ------  -------  --------  --------  -------   | |
|        |  | [card]  [card]   [card]    [card]    [card]     | |
|        |  | [card]  [card]   [card]    [card]    [card]     | |
|        |  | [card]           [card]                         | |
|        |  |                  [card]                         | |
|        |  |                                                 | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Composants utilises** :
- `KanbanBoard`
- `KanbanCard` x N
- `FilterBar`
- `EmptyState`

**Donnees necessaires** :
- `GET /api/contacts?view=kanban&filters=` -> contacts groupes par statut
- `PATCH /api/contacts/[id]/status` -> deplacer un contact
- WebSocket/SSE pour les mouvements automatiques en temps reel

---

### 5.7 Page : Mon profil (`/profil`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Mon profil                                          |
|        |                                                      |
|        |  [ProfileCompleteness: 75%]                         |
|        |                                                      |
|        |  +-- INFORMATIONS PERSONNELLES -------------------+ |
|        |  |  Nom: [Marie Dupont           ] (edit inline)   | |
|        |  |  Pays actuel: [France v]                        | |
|        |  |  Pays cible(s): [Australie] [Canada] [+]        | |
|        |  |  Secteur(s): [Tech / IT] [+]                    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- COMPETENCES ---------------------------------+ |
|        |  |  [React] [TypeScript] [Node.js] [Next.js] [+]  | |
|        |  |  Source: CV uploade le 20/03                     | |
|        |  |                          [Re-uploader un CV]    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- EXPERIENCE ----------------------------------+ |
|        |  |  5 ans - Developpeur front-end                  | |
|        |  |  Entreprises: TechFR (3 ans), StartupXY (2 ans) | |
|        |  |  Source: CV parse automatiquement                | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- PREFERENCES EMAIL ---------------------------+ |
|        |  |  Instructions personnalisees pour l'IA :        | |
|        |  |  [textarea: "Ton professionnel mais chaleur..."] |
|        |  |                              [Sauvegarder]      | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Composants utilises** :
- `ProfileCompleteness`
- `CVUploader` (dans la modale de re-upload)
- Formulaire avec edition inline
- Chips editables pour competences, pays, secteurs

**Donnees necessaires** :
- `GET /api/profile` -> profil complet
- `PATCH /api/profile` -> mise a jour partielle
- `POST /api/profile/cv` -> upload CV

---

### 5.8 Page : Onboarding (`/onboarding`)

```
+-----------------------------------------------------------+
|                                                           |
|  ExpatHunter                                              |
|                                                           |
|  +-----------------------------------------------------+ |
|  |                                                       | |
|  |  [OnboardingWizard]                                   | |
|  |                                                       | |
|  |  Contenu varie selon l'etape :                        | |
|  |  - Etape 1: Formulaire infos de base                 | |
|  |  - Etape 2: CVUploader + resultats parsing            | |
|  |  - Etape 3: ChatConversation (affinage IA)            | |
|  |                                                       | |
|  +-----------------------------------------------------+ |
|                                                           |
+-----------------------------------------------------------+
```

Pas de sidebar pendant l'onboarding. Page plein ecran centree.

**Composants utilises** :
- `OnboardingWizard`
- `CVUploader` (etape 2)
- `ChatConversation` (etape 3)

**Donnees necessaires** :
- `POST /api/onboarding/step1` -> sauvegarder infos de base
- `POST /api/onboarding/cv` -> upload + parsing CV
- `POST /api/onboarding/chat` -> affinage IA (requete/reponse)
- `POST /api/onboarding/complete` -> finaliser le profil

---

### 5.9 Page : Parametres (`/parametres`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Parametres                                          |
|        |                                                      |
|        |  +-- COMPTE --------------------------------------+ |
|        |  |  Email: marie@example.com         [Modifier]    | |
|        |  |  Mot de passe: ********           [Modifier]    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- PREFERENCES ---------------------------------+ |
|        |  |  Langue: [Francais v]                           | |
|        |  |  Theme:  (o) Clair  ( ) Sombre  ( ) Systeme    | |
|        |  |                               [Sauvegarder]    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- CONNEXION EMAIL -----------------------------+ |
|        |  |  Methode: [SMTP v]                              | |
|        |  |  Serveur: [smtp.gmail.com     ]                 | |
|        |  |  Port:    [587                ]                 | |
|        |  |  ...                                            | |
|        |  |  [Tester la connexion]         [Sauvegarder]    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- RECONTACT ------------------------------------+ |
|        |  |  Delai minimum avant relance: [6 mois        v] | |
|        |  |  (3 mois / 6 mois / 1 an / Personnalise)       | |
|        |  |  i: L'email de relance fera reference au        | |
|        |  |     premier contact envoye.                     | |
|        |  |                               [Sauvegarder]    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- GENERATION D'EMAILS --------------------------+ |
|        |  |  [EmailGenerationSettings — parametres par       | |
|        |  |   defaut pour toutes les generations]            | |
|        |  |                                                  | |
|        |  |  Mes templates:                                  | |
|        |  |  [EmailTemplateEditor — CRUD templates]          | |
|        |  |                               [Sauvegarder]    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
|        |  +-- INTELLIGENCE ARTIFICIELLE -------------------+ |
|        |  |  Modele: [GPT-4o v]                             | |
|        |  |  Instructions:                                  | |
|        |  |  [textarea]                                     | |
|        |  |                               [Sauvegarder]    | |
|        |  +-------------------------------------------------+ |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Composants utilises** :
- Sections independantes avec sauvegarde individuelle
- Formulaires standards (inputs, selects, radio buttons, textareas)
- `NotificationToast` pour confirmer les sauvegardes

**Donnees necessaires** :
- `GET /api/settings` -> toutes les sections
- `PATCH /api/settings/account` -> mise a jour compte
- `PATCH /api/settings/preferences` -> mise a jour preferences
- `PATCH /api/settings/email` -> mise a jour connexion email
- `POST /api/settings/email/test` -> tester la connexion
- `PATCH /api/settings/ai` -> mise a jour parametres IA

---

## 6. Nouvelles specifications — Features 6, 7, 8, 14, 15

### 6.1 Composant : ConversationThread

**Role** : Affiche le fil de conversation complet entre l'utilisateur et un contact (emails envoyes + reponses recues).

**Wireframe textuel** :
```
+---------------------------------------------------------------+
|  Conversation avec Marie Dupont                    [Reduire ^] |
+---------------------------------------------------------------+
|                                                                |
|  Resume IA :                                                   |
|  +----------------------------------------------------------+ |
|  | Marie semble interessee par votre profil. Elle a demande  | |
|  | plus de details sur votre experience en startup.          | |
|  | → Action suggeree : repondre avec details experience      | |
|  +----------------------------------------------------------+ |
|                                                                |
|  21 mars 2026 — Vous                            [Premier email]|
|  +----------------------------------------------------------+ |
|  | Subject: Looking for talented developers at TechCorp      | |
|  | Hi Marie, ...                                             | |
|  +----------------------------------------------------------+ |
|                                                                |
|  22 mars 2026 — Marie Dupont                    [Reponse]      |
|  +----------------------------------------------------------+ |
|  | Hi Yannick, thanks for reaching out! ...                  | |
|  +----------------------------------------------------------+ |
|                                                                |
|  +----------------------------------------------------------+ |
|  | Reponse suggeree par l'IA :                               | |
|  |                                                            | |
|  | Hi Marie, thank you for your interest! Regarding my...    | |
|  |                                                            | |
|  | [Modifier]  [Regenerer]  [Envoyer]  [Ecrire manuellement] | |
|  +----------------------------------------------------------+ |
|                                                                |
+---------------------------------------------------------------+
```

**Props / Donnees** :
- `contactId`: string — ID du contact
- `messages`: Message[] — liste ordonnee des echanges
- `summary`: string — resume IA de la conversation
- `suggestedReply`: string | null — reponse suggeree par l'IA
- `nextAction`: string — prochaine action suggeree

**Etats** :
- Default : thread complet avec resume + suggestion
- Loading : skeleton sur le resume et la suggestion pendant la generation IA
- Empty : "Aucun echange pour le moment" avec CTA vers l'email initial
- Error : "Impossible de charger les reponses. Verifier la connexion email."

**Responsive** :
- Mobile (< 768px) : plein ecran modal, messages empiles
- Desktop : panneau lateral droit (50% de la largeur) ou page dediee

**Accessibilite** :
- `role="log"` sur le conteneur de messages
- `aria-label="Conversation avec [nom]"`
- Messages marques avec `role="article"` et timestamp

---

### 6.2 Composant : ContactDuplicateAlert

**Role** : Alerte affichee quand un contact trouve lors d'une recherche a deja ete contacte.

**Wireframe textuel** :
```
+---------------------------------------------------------------+
|  ⚠ Contact deja contacte                                      |
|                                                                |
|  Vous avez contacte Marie Dupont le 15 janvier 2026.          |
|  Prochaine relance possible : 15 juillet 2026 (dans 4 mois). |
|                                                                |
|  Ce contact ne sera pas inclus dans l'envoi en masse.         |
|  [Voir la conversation]                                        |
+---------------------------------------------------------------+
```

**Etats** :
- **Bloque** : cooldown non expire → message informatif, pas d'action d'envoi
- **Relancable** : cooldown expire → "Vous pouvez relancer ce contact. L'email sera adapte." + bouton [Generer une relance]

**Accessibilite** :
- `role="alert"` pour le message
- `aria-live="polite"`

---

### 6.3 Composant : EmailGenerationSettings

**Role** : Panneau de parametres de generation d'emails (style Hunter.io).

**Wireframe textuel** :
```
+---------------------------------------------------------------+
|  Parametres de generation                          [Preset v]  |
+---------------------------------------------------------------+
|                                                                |
|  Longueur                                                      |
|  Court |====o================| Long                            |
|                                                                |
|  Langue                        Framework                       |
|  [Automatique      v]         [AIDA              v]           |
|                                                                |
|  Ton                                                           |
|  Professionnel |=======o======| Decontracte                   |
|                                                                |
|  Instructions personnalisees                                   |
|  +----------------------------------------------------------+ |
|  | Mentionne toujours mon experience en startup et ma        | |
|  | maitrise de React/TypeScript.                             | |
|  +----------------------------------------------------------+ |
|                                                                |
|  [Sauvegarder comme preset]                                    |
+---------------------------------------------------------------+
|                                                                |
|  Preview                                                       |
|  +----------------------------------------------------------+ |
|  | Subject: Looking for talented developers at {{company}}   | |
|  |                                                            | |
|  | Hi {{first_name:"there"}},                                | |
|  |                                                            | |
|  | Finding experienced developers in {{city}} can be...      | |
|  +----------------------------------------------------------+ |
|                                                                |
+---------------------------------------------------------------+
```

**Props / Donnees** :
- `length`: number (1-5) — longueur du mail
- `framework`: 'AIDA' | 'PAS' | 'BAB' | 'direct' — framework de copywriting
- `language`: 'auto' | 'fr' | 'en' | ... — langue forcee ou auto
- `tone`: number (1-5) — professionnel ←→ decontracte
- `customInstructions`: string — instructions libres
- `preset`: string | null — preset sauvegarde
- `onPreview`: () => void — declenche la preview

**Responsive** :
- Mobile : empile verticalement, preview sous les parametres
- Desktop : 2 colonnes (parametres a gauche, preview a droite) ou panneau depliable

**Accessibilite** :
- Sliders avec `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label`
- Tooltips sur les frameworks avec explication (accessible au focus)

---

### 6.4 Composant : EmailTemplateEditor

**Role** : Edition et gestion des templates d'emails.

**Wireframe textuel** :
```
+---------------------------------------------------------------+
|  Mes templates                              [+ Nouveau template]|
+---------------------------------------------------------------+
|                                                                |
|  +-- Premier contact (defaut) ------ [Modifier] [Supprimer] -+|
|  |  Sujet : Looking for {{role}} at {{company}}               ||
|  |  Corps : Hi {{first_name}}, I noticed that {{company}}...  ||
|  +------------------------------------------------------------+|
|                                                                |
|  +-- Relance ----------------------- [Modifier] [Supprimer] -+|
|  |  Sujet : Following up — {{role}} opportunity               ||
|  |  Corps : Hi {{first_name}}, I reached out a few months...  ||
|  +------------------------------------------------------------+|
|                                                                |
+---------------------------------------------------------------+
```

**Placeholders disponibles** :
- `{{first_name}}`, `{{last_name}}`, `{{full_name}}`
- `{{company}}`, `{{role}}`, `{{city}}`, `{{country}}`
- `{{user_name}}`, `{{user_skills}}`, `{{user_experience}}`

**Accessibilite** :
- Templates navigables au clavier (Tab entre les templates, Enter pour editer)
- Confirmation avant suppression

---

### 6.5 Composant : CooldownSettings

**Role** : Parametre de delai de recontact dans la page Parametres.

**Wireframe textuel** :
```
+---------------------------------------------------------------+
|  +-- RECONTACT -----------------------------------------------+|
|  |                                                             ||
|  |  Delai minimum avant relance :  [6 mois           v]       ||
|  |                                                             ||
|  |  Options : 3 mois / 6 mois / 1 an / Personnalise           ||
|  |                                                             ||
|  |  ℹ Apres ce delai, vous pourrez relancer un contact.       ||
|  |    L'email de relance fera reference au premier contact.    ||
|  |                                                             ||
|  |                                          [Sauvegarder]      ||
|  +-------------------------------------------------------------+|
+---------------------------------------------------------------+
```

---

### 6.6 Layout : Fiche contact enrichie (`/contacts/[id]`)

```
+--------+------------------------------------------------------+
|        |                                                      |
| Sidebar|  Marie Dupont                          [badge: 95%]  |
|        |  HR Manager — TechCorp NZ                            |
|        |  Auckland, Nouvelle-Zelande                          |
|        |  fisalek673@paylaar.com                              |
|        |                                                      |
|        |  +-- RESUME IA ------------------------------------+ |
|        |  | Marie semble interessee. Elle a demande des     | |
|        |  | details sur l'experience startup. Ton positif.  | |
|        |  | → Repondre avec details experience               | |
|        |  +--------------------------------------------------+ |
|        |                                                      |
|        |  +-- HISTORIQUE -----------------------------------+ |
|        |  |  [Timeline verticale]                           | |
|        |  |                                                  | |
|        |  |  ● 21/03 — Email envoye (Premier contact)       | |
|        |  |    Subject: Looking for developers at TechCorp  | |
|        |  |    [Voir l'email complet]                        | |
|        |  |                                                  | |
|        |  |  ● 22/03 — Reponse recue ★ NON LUE             | |
|        |  |    "Thanks for reaching out! Could you..."      | |
|        |  |    [Voir la reponse] [Repondre]                  | |
|        |  |                                                  | |
|        |  |  ● 15/01 — Premier contact (campagne precedente)| |
|        |  |    Subject: Experienced developer available     | |
|        |  |    [Voir l'email complet]                        | |
|        |  +--------------------------------------------------+ |
|        |                                                      |
|        |  +-- REPONDRE ------------------------------------+ |
|        |  | [ConversationThread avec reponse suggeree]      | |
|        |  +--------------------------------------------------+ |
|        |                                                      |
+--------+------------------------------------------------------+
```

**Donnees necessaires** :
- `GET /api/contacts/:id` → infos contact + historique complet
- `GET /api/contacts/:id/conversations` → tous les threads
- `GET /api/contacts/:id/summary` → resume IA
- `POST /api/contacts/:id/reply` → envoyer une reponse
- `POST /api/contacts/:id/generate-reply` → generer suggestion IA

---

### 6.7 Composant : AssistantPanel

**Role** : Panneau chat lateral accessible depuis toutes les pages. Interface unifiee vers l'assistant multi-expert.

**Wireframe** :

```
Bouton flottant (ferme) :
                                    +------+
                                    |  ?   |  <- coin inferieur droit
                                    +------+

Panneau ouvert :
+---------------------------------------------+
|  Assistant ExpatHunter              [- ][x] |
+---------------------------------------------+
|                                             |
|  Suggestions rapides (basees sur contexte): |
|  [Que sais-tu sur TechCorp ?]               |
|  [Conseils entretien en NZ]                 |
|  [Infos visa Nouvelle-Zelande]              |
|                                             |
|  +-----------------------------------------+|
|  | IA: Bonjour ! Vous consultez la fiche   ||
|  |    de Marie Dupont chez TechCorp NZ.     ||
|  |    Voulez-vous que je vous aide a        ||
|  |    preparer votre email ?                ||
|  +-----------------------------------------+|
|                                             |
|  +-----------------------------------------+|
|  | Vous: Oui, et dis-moi si TechCorp       ||
|  |    sponsorise les visas                  ||
|  +-----------------------------------------+|
|                                             |
|  +-----------------------------------------+|
|  | IA: D'apres mes informations (cachees   ||
|  |    le 15/03/2026), TechCorp NZ est un   ||
|  |    "Accredited Employer" qui peut        ||
|  |    sponsoriser des visas de travail...   ||
|  |                                          ||
|  |    Source : immigration.govt.nz          ||
|  +-----------------------------------------+|
|                                             |
+---------------------------------------------+
|  [Ecrivez votre question...        ] [>]   |
+---------------------------------------------+
```

**Props / Donnees** :
- `currentPage`: string — page courante pour le contexte
- `currentContact`: Contact | null — contact affiche (si applicable)
- `currentCompany`: Company | null — entreprise affichee
- `userProfile`: UserProfile — profil de l'utilisateur
- `messages`: ChatMessage[] — historique de la session

**Etats** :
- **Ferme** : bouton flottant uniquement, badge si conseil proactif disponible
- **Ouvert** : panneau lateral droit (400px desktop, plein ecran mobile)
- **Loading** : indicateur de frappe ("L'assistant reflechit...")
- **Error** : "Impossible de joindre l'assistant. Reessayez."

**Interactions** :
- Clic bouton flottant : ouvre/ferme le panneau
- Suggestions cliquables : envoient la question directement
- L'assistant peut proposer des actions : "Regenerer cet email" → bouton d'action dans la reponse
- Raccourci clavier : `Ctrl+/` pour ouvrir/fermer

**Responsive** :
- Mobile : plein ecran modal (comme un chat)
- Desktop : panneau lateral 400px, ne deplace pas le contenu principal

**Accessibilite** :
- `role="complementary"` avec `aria-label="Assistant ExpatHunter"`
- Focus trap quand ouvert en mobile
- Messages avec `role="log"` et `aria-live="polite"`
- Bouton flottant : `aria-label="Ouvrir l'assistant"`, `aria-expanded`

---

### 6.8 Composant : ProactiveTip

**Role** : Conseil proactif contextuel affiche directement dans les pages (pas dans le panneau chat).

**Wireframe** :

```
+---------------------------------------------------------------+
| Conseil                                                 [x]   |
|                                                                |
| En Nouvelle-Zelande, le secteur tech recrute surtout entre    |
| fevrier et avril. C'est le bon moment pour envoyer vos emails!|
|                                                                |
| [En savoir plus]  [Ne plus afficher ce type de conseil]       |
+---------------------------------------------------------------+
```

**Props** :
- `expertDomain`: 'recruitment' | 'market' | 'visa' | 'career'
- `message`: string
- `actionLabel`: string | null
- `onAction`: () => void | null
- `onDismiss`: () => void
- `onDisableCategory`: () => void

**Etats** :
- Default : bandeau avec icone, message, actions
- Dismissed : disparait avec animation fadeOut
- Disabled : ce type de conseil ne reapparait plus (preferences)

**Position** : sous le header de chaque page, au-dessus du contenu principal.

**Accessibilite** :
- `role="status"` avec `aria-live="polite"`
- Bouton fermer avec `aria-label="Fermer le conseil"`

---

### 6.9 Composant : MarketSnapshot

**Role** : Encart expert affiche en haut de la page "Trouver des contacts". Donne un apercu du marche du pays/secteur cible.

**Wireframe** :

```
+---------------------------------------------------------------+
|  NZ Tech — Apercu marche                       [Mise a jour ↻]|
+---------------------------------------------------------------+
|                                                                |
|  📈 +12% d'embauches en 2025      💰 85-120k NZD/an          |
|  📅 Meilleure periode : fev-avr   🏢 ~340 offres actives     |
|                                                                |
|  "Les startups d'Auckland recrutent activement des frontend    |
|   developers. Les entreprises de taille moyenne (50-200 emp.)  |
|   sont les plus receptives aux candidatures internationales."  |
|                                                                |
|  Source : Seek + analyse IA — Mis a jour le 18 mars 2026      |
+---------------------------------------------------------------+
```

**Props** :
- `country`: string
- `sector`: string
- `data`: MarketData (trend, salary, bestPeriod, openPositions, summary)
- `lastUpdated`: Date
- `source`: string

**Comportement** :
- Se met a jour dynamiquement quand l'utilisateur change le pays ou le secteur dans le formulaire
- Les donnees viennent du cache (pas de requete a chaque visite)
- Le bouton ↻ force un refresh (avec confirmation si les donnees sont fraiches)

**Responsive** : 2 colonnes de stats sur desktop, empile sur mobile

**Accessibilite** : `role="region"` avec `aria-label="Apercu du marche"`

---

### 6.10 Composant : ConfidenceScore

**Role** : Badge de score de confiance avec explication, affiche sur les cartes contact.

**Wireframe** :

```
Compact (dans la carte kanban / liste) :
+--------+
| 92%  ✓ |  <- vert si > 80%, orange 50-80%, gris < 50%
+--------+

Detaille (au hover ou dans la fiche contact) :
+---------------------------------------------------------------+
|  Score de confiance : 92%                                      |
|                                                                |
|  ✓ Poste ouvert sur Seek (actif depuis 2 sem.)                |
|  ✓ Entreprise en croissance (+30% effectif en 1 an)           |
|  ✓ Sponsor visa confirme (Accredited Employer)                |
|  ✗ Pas d'email direct (email generique depart.)               |
+---------------------------------------------------------------+
```

**Props** :
- `score`: number (0-100)
- `factors`: { label: string, positive: boolean }[]
- `variant`: 'compact' | 'detailed'

**Responsive** : compact partout sauf fiche contact (detailed)

**Accessibilite** :
- `aria-label="Score de confiance : 92 pourcent"` sur le badge
- Facteurs en liste `role="list"`

---

### 6.11 Architecture du cache (note pour l'architecte)

```
Table : intelligence_cache
+------+--------+--------+------------+----------+------------+-------+
| id   | source | type   | entity_id  | data     | fetched_at | ttl   |
+------+--------+--------+------------+----------+------------+-------+
| 1    | hunter | email  | contact_42 | {json}   | 2026-03-15 | 14j   |
| 2    | apify  | profile| contact_42 | {json}   | 2026-03-15 | 14j   |
| 3    | perpl. | company| company_7  | {json}   | 2026-03-10 | 30j   |
| 4    | web    | market | country_NZ | {json}   | 2026-03-18 | 7j    |
| 5    | govt   | visa   | country_NZ | {json}   | 2026-01-15 | 90j   |
+------+--------+--------+------------+----------+------------+-------+

Flow :
1. Besoin d'info sur contact/entreprise/pays
2. SELECT WHERE entity_id AND type AND fetched_at + ttl > NOW()
3. Cache HIT → retourne donnees cachees
4. Cache MISS → appel provider externe → stocke en cache
5. Donnees fusionnees dans la fiche unifiee

Providers (extensibles via pattern strategy) :
+----------+  +--------+  +-----------+  +--------+  +------+
|  Apify   |  | Hunter |  | Perplexity|  | Google |  | Govt |
| (scraper)|  | (email)|  | (research)|  | (web)  |  |(visa)|
+----------+  +--------+  +-----------+  +--------+  +------+
      |             |            |             |           |
      +-------------+------------+-------------+-----------+
                         |
                  IntelligenceCache
                  (service unifie)
```

**Principes cles** :
- **Cache-first** : jamais d'appel externe si le cache est frais
- **Provider pattern** : chaque source est un module independant
- **Fusion** : donnees de N providers fusionnees par entite
- **Tracabilite** : chaque donnee affiche source + fraicheur
- **Economies** : dashboard admin avec metriques (hit rate, credits)

---

## Annexe A : Checklist accessibilite WCAG 2.1 AA

| Critere | Implementation |
|---------|----------------|
| **1.1.1 Contenu non textuel** | Toutes les icones ont `aria-hidden` + label textuel adjacent. Images decoratives marquees. |
| **1.3.1 Information et relations** | Landmarks semantiques (nav, main, aside, header). Headings hierarchiques (h1 > h2 > h3). |
| **1.4.3 Contraste minimum** | Ratio 4.5:1 pour le texte normal, 3:1 pour le texte large. Primary (#0d9488) sur blanc = 4.6:1 OK. |
| **1.4.11 Contraste non textuel** | Bordures et icones interactives a ratio >= 3:1 vs fond. |
| **2.1.1 Clavier** | Tous les composants interactifs accessibles au clavier. Drag & drop avec alternative clavier. |
| **2.4.1 Contournement** | Lien "Skip to content" deja present dans layout.tsx. |
| **2.4.3 Parcours du focus** | Focus logique (sidebar -> contenu). Focus trap dans les modales. |
| **2.4.7 Visibilite du focus** | `focus-visible:ring-2 ring-primary/50 ring-offset-2` sur tous les interactifs. |
| **3.3.1 Identification des erreurs** | Erreurs identifiees en texte (pas seulement couleur). Messages inline sous les champs. |
| **3.3.2 Labels** | Tous les champs ont un `<label>` associe ou `aria-label`. |
| **4.1.2 Nom, role, valeur** | Composants custom avec `role`, `aria-*` documentes dans chaque spec composant. |

---

## Annexe B : Tokens d'animation

| Nom | Duree | Easing | Usage |
|-----|-------|--------|-------|
| `transition-fast` | 150ms | ease-out | Hover sur boutons, liens |
| `transition-base` | 200ms | ease-in-out | Ouverture panneau, slide sidebar |
| `transition-slow` | 300ms | ease-in-out | Toast apparition, modale |
| `transition-progress` | 100ms | linear | Mise a jour barre de progression |

---

## Annexe C : Breakpoints

| Nom | Largeur min | Usage |
|-----|-------------|-------|
| `sm` | 640px | Petit mobile -> grand mobile |
| `md` | 768px | Sidebar visible (fixe). Grids 2-3 cols |
| `lg` | 1024px | Layouts 2 colonnes (contenu + sidebar info) |
| `xl` | 1280px | Kanban 5 colonnes confortables |

Ces breakpoints sont ceux par defaut de Tailwind CSS, deja utilises dans le projet.
