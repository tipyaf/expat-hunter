# ExpatHunter — Phase 0.5 : Design UX/UI

## Decisions UX

| # | Question | Reponse |
|---|----------|---------|
| 1 | Navigation | Sidebar fixe a gauche, liens en francais |
| 2 | Dashboard | Conseil IA + actions en attente + 5 statistiques |
| 3 | Onboarding profil | Wizard 3 etapes (infos, CV, competences) |
| 4 | Recherche | Snapshot marche IA + formulaire pays/secteur/ville |
| 5 | Gestion emails | Filtres par statut (Brouillon/Approuve/Envoye/Ouvert/Repondu/Rejete) |
| 6 | Pipeline kanban | 6 colonnes (Trouve, A contacter, Contacte, En discussion, Entretien, Termine) |
| 7 | Contacts | Liste filtrable par statut pipeline (9 filtres) |
| 8 | Tonalite visuelle | Violet/magenta sur fond clair, coins arrondis |
| 9 | Dark mode | Auto (systeme) / Clair / Sombre dans les parametres |
| 10 | i18n | Francais + Anglais, selectable a l'inscription et dans les parametres |
| 11 | Assistant IA | Bouton flottant violet en bas a droite sur toutes les pages |

---

## 1. Architecture d'information (Sitemap)

### Pages publiques
- `/login` — Connexion (email + mot de passe)
- `/register` — Inscription (nom, email, mot de passe, langue)
- `/forgot-password` — Mot de passe oublie
- `/reset-password` — Reinitialisation mot de passe
- `/verify-email` — Verification email

### Pages authentifiees
- `/` — Tableau de bord (dashboard)
- `/onboarding` — Wizard onboarding 3 etapes (premiere connexion ou profil incomplet)
- `/recherche` — Recherche automatisee de contacts
- `/contacts` — Liste des contacts
- `/contacts/:id` — Fiche detaillee d'un contact
- `/emails` — Gestion des emails generes par l'IA
- `/suivi` — Pipeline kanban
- `/profil` — Profil candidat (edition)
- `/profil/setup` — Configuration initiale du profil
- `/parametres` — Parametres generaux
- `/parametres/templates` — Templates d'emails
- `/parametres/presets` — Presets de generation IA
- `/parametres/blocages` — Contacts et entreprises bloques
- `/parametres/connexion-email` — Configuration IMAP/SMTP

### Pages admin
- `/admin/users` — Gestion des utilisateurs
- `/admin/ai-settings` — Configuration IA

### Navigation sidebar
```
+----------------------------+
|  ExpatHunter               |  <- Logo violet, titre magenta
+----------------------------+
|  [x] Tableau de bord       |  <- Actif : fond violet clair, texte violet
|  [ ] Trouver des contacts  |
|  [ ] Mes contacts          |
|  [ ] Mes emails            |
|  [ ] Suivi                 |
|                            |
|  [ ] Mon profil            |  <- Separe en bas
|  [ ] Parametres            |
+----------------------------+
|  Nom Utilisateur           |
|  email@example.com         |
|  [Se deconnecter]          |
+----------------------------+
```

---

## 2. User Flows

### Flow 1 : Inscription et connexion

```
1. L'utilisateur arrive sur /login
2. S'il n'a pas de compte : lien "Creer un compte" -> /register
3. Inscription : nom complet, email, mot de passe (min 8 car.), langue (FR/EN)
4. Apres inscription : redirection vers /onboarding
5. Connexion : email + mot de passe -> redirection vers /
6. Si profil incomplet : redirection automatique vers /onboarding
```

### Flow 2 : Onboarding (premiere connexion)

```
1. Redirection vers /onboarding
2. Stepper en haut : "1 / 3" avec barre de progression
3. Etape 1/3 : Informations de base
   - Nom complet (pre-rempli)
   - Pays cibles (multi-select avec recherche)
   - Secteurs (tags, entree libre, appui Entree/virgule pour ajouter)
   - Postes recherches (tags, entree libre)
   - Bouton "Suivant"
4. Etape 2/3 : Votre CV
   - Upload CV (drag & drop ou clic)
   - Parsing IA en arriere-plan
   - Competences detectees (tags editables)
   - Experience estimee (editable)
   - Boutons "Retour" / "Suivant"
5. Etape 3/3 : Experience et competences
   - Details manuels si pas de CV
   - Validation finale
   - Bouton "Terminer"
6. Profil cree -> redirection vers Dashboard
```

### Flow 3 : Recherche automatisee

```
1. L'utilisateur va dans "Trouver des contacts"
2. En haut : Snapshot du marche IA pour le pays cible
   - Tendance du marche
   - Meilleure periode
   - Offres estimees
   - Salaire moyen
   - Conseils d'expert (tips IA avec icones ampoule)
3. Formulaire "Nouvelle recherche" :
   - Pays cible (dropdown)
   - Secteur (champ texte libre)
   - Ville (champ texte libre)
   - Checkbox "Inclure les contacts RH / recruteurs"
   - Bouton "Lancer la recherche" (violet plein)
4. En bas : Historique des recherches
5. Apres lancement : progression en temps reel par source
6. Contacts trouves -> apparaissent dans /contacts
```

### Flow 4 : Gestion des contacts

```
1. L'utilisateur va dans "Mes contacts"
2. En-tete : titre + bouton "Analyser les contacts"
3. Filtres par statut pipeline (boutons pills colores) :
   - Tous (compteur) | Identifie | Analyse | A contacter |
   - Contacte | Repondu | Entretien | Offre | Rejete
4. Liste des contacts sous forme de tableau/cards
5. Clic sur un contact -> /contacts/:id (fiche detaillee)
6. Empty state : "Aucun contact trouve. Lancez un sourcing pour commencer."
```

### Flow 5 : Gestion des emails

```
1. L'utilisateur va dans "Mes emails"
2. En-tete : titre + bouton "Generer des emails"
3. Filtres par statut (boutons pills colores) :
   - Tous (compteur) | Brouillon | Approuve | Envoye | Ouvert | Repondu | Rejete
4. Liste des emails avec apercu
5. Clic sur un email -> edition/preview
6. Actions : approuver, modifier, rejeter
7. Empty state : "Aucun email. Generez des emails pour vos contacts recommandes."
```

### Flow 6 : Suivi pipeline

```
1. L'utilisateur va dans "Suivi"
2. En-tete : "Pipeline" + compteur total de contacts
3. Vue kanban avec 6 colonnes :
   - Trouve (contacts issus du sourcing)
   - A contacter (valides, email en preparation)
   - Contacte (email envoye)
   - En discussion (reponse recue)
   - Entretien (entretien programme)
   - Termine (offre ou rejete)
4. Chaque colonne affiche son compteur
5. Cards contact dans chaque colonne
6. Empty state par colonne : "Aucun contact"
```

---

## 3. Design System

### Couleurs

| Role | Couleur | Hex (approx) | Usage |
|------|---------|--------------|-------|
| Primary | Violet/Magenta | `#940d82` | Titres, boutons principaux, liens actifs, sidebar active |
| Primary Light | Rose clair | `#f5d0f0` | Fond sidebar active, fond conseil IA |
| Primary Hover | Violet fonce | `#7a0a6b` | Hover boutons |
| Secondary | Orange | `#f97316` | Accents |
| Background | Gris tres clair | `#f8fafc` | Fond de page |
| Surface | Blanc | `#ffffff` | Cartes, sidebar, formulaires |
| Text | Quasi noir | `#0f172a` | Texte principal |
| Text Muted | Gris ardoise | `#64748b` | Texte secondaire, descriptions |
| Text Subtle | Gris clair | `#94a3b8` | Texte tertiaire |
| Border | Gris clair | `#e2e8f0` | Bordures cartes, separateurs |
| Border Focus | Teal | `#0d9488` | Focus sur inputs |
| Success | Vert | `#22C55E` | Badge "Analyse", validations |
| Warning | Ambre | `#F59E0B` | Badge "A contacter" |
| Error | Rouge | `#EF4444` | Badge "Rejete", erreurs |
| Info | Bleu | `#3B82F6` | Badge "Envoye" |
| Entretien | Violet | `#8B5CF6` | Badge "Entretien" |
| Offre | Vert fonce | `#16A34A` | Badge "Offre" |

### Badges de statut contacts

| Statut | Couleur badge |
|--------|---------------|
| Tous | Primary (violet) fond plein |
| Identifie | Gris (outline) |
| Analyse | Vert (outline) |
| A contacter | Bleu (outline) |
| Contacte | Bleu (outline) |
| Repondu | Vert (outline) |
| Entretien | Violet (outline) |
| Offre | Vert fonce (outline) |
| Rejete | Rouge (outline) |

### Badges de statut emails

| Statut | Couleur badge |
|--------|---------------|
| Tous | Primary (violet) fond plein |
| Brouillon | Gris (outline) |
| Approuve | Vert (outline) |
| Envoye | Bleu (outline) |
| Ouvert | Ambre (outline) |
| Repondu | Vert (outline) |
| Rejete | Rouge (outline) |

### Dark mode

Le dark mode est active via la classe CSS `.dark` sur le `<html>`. Il est configurable dans les parametres (Auto/Clair/Sombre).

**Changement majeur** : la couleur primary passe de violet a teal en dark mode.

| Token | Light mode | Dark mode |
|-------|-----------|-----------|
| primary | `#940d82` (violet/magenta) | `#14b8a6` (teal) |
| primary-hover | `#7a0a6b` | `#0d9488` |
| primary-light | `#f5d0f0` | `#134e4a` |
| bg-light | `#f8fafc` (gris tres clair) | `#0f172a` (bleu tres fonce) |
| surface-light | `#ffffff` (blanc) | `#1e293b` (bleu fonce) |
| surface-raised | `#ffffff` | `#334155` |
| text-main | `#0f172a` (quasi noir) | `#f1f5f9` (quasi blanc) |
| text-muted | `#64748b` | `#94a3b8` |
| text-subtle | `#94a3b8` | `#64748b` |
| border | `#e2e8f0` | `#334155` |
| border-focus | `#0d9488` | `#14b8a6` |

**Implications design** :
- Les titres passent de violet a teal
- Les boutons primary passent de violet fond a teal fond
- La sidebar active passe de rose clair/violet a teal fonce/teal
- Les badges et pills gardent leurs couleurs semantiques (success, error, warning, info)
- Les ombres sont plus prononcees en dark mode
- Le fond general est bleu tres fonce (#0f172a), pas noir pur

### Typographie

| Role | Font | Size | Weight |
|------|------|------|--------|
| H1 page | Inter | 30px | 700 (Bold) — couleur primary |
| H2 section | Inter | 24px | 600 (Semibold) |
| H3 card | Inter | 18px | 600 (Semibold) |
| Body | Inter | 14px | 400 (Regular) |
| Small/Caption | Inter | 12px | 400 (Regular) |
| Button | Inter | 14px | 500 (Medium) |

### Boutons

| Type | Style |
|------|-------|
| Primary | Fond violet plein, texte blanc, coins arrondis lg |
| Secondary | Outline gris, texte gris fonce |
| Danger | Fond rouge, texte blanc |
| Filter active | Fond primary, texte blanc, pill shape |
| Filter inactive | Outline colore, texte colore, pill shape |

### Spacing
- Base unit: 4px
- Scale: xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px)

### Border radius
- Small: 6px — inputs, badges
- Medium: 8px — cards, boutons
- Large: 12px — conteneurs principaux
- Full: 9999px — pills de filtre, avatars

### Shadows
- Card: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Elevated: `0 4px 6px rgba(0,0,0,0.07)`

---

## 4. Specification des composants

### Composant: Sidebar

**Role**: Navigation principale fixe a gauche

**Wireframe** (mis à jour Phase 0.3-bis — menus collapsibles):
```
+----------------------------+
|  ExpatHunter               |  <- Texte magenta bold
|                            |
| [bg] Tableau de bord       |  <- Lien direct (pas de sous-menu)
|                            |
|  v  Prospection            |  <- Menu parent cliquable (chevron v = ouvert)
|     Q  Trouver des contacts|  <- Sous-item indenté (padding-left +16px)
|     Ppl Mes contacts       |
|     Env Mes emails  [11]   |  <- Badge compteur
|     Bar Suivi              |
|                            |
|  >  Offres d'emploi  [8]  |  <- Menu parent cliquable (chevron > = fermé)
|                            |     Badge sur le parent = somme nouvelles offres
|  --- séparateur ---        |
|  @   Mon profil            |  <- Liens directs (pas de sous-menu)
|                            |
|  >  Paramètres             |  <- Menu parent collapsible
|     Gear Général           |     /parametres
|     Doc  Templates         |     /parametres/templates
|     Slid Presets            |     /parametres/presets
|     Link Connexion email   |     /parametres/connexion-email
|     Ban  Blocages          |     /parametres/blocages
|                            |
|  >  Administration         |  <- Visible admin seulement
|     Gear Config. IA        |     /admin/ai-settings
|     Usr  Utilisateurs      |     /admin/users
|                            |
+----------------------------+
|  Nom Utilisateur           |  <- Texte noir bold
|  email@example.com         |  <- Texte gris small
|  [→ Se déconnecter]        |  <- Bouton outline
+----------------------------+
```

> Quand "Offres d'emploi" est ouvert :
```
|  v  Offres d'emploi  [8]  |  <- Chevron v = ouvert
|     Q  Recherche d'offres  |  <- /recherche-offres
|     Brf Mes offres         |  <- /offres
```

**Deux modes de sidebar** — toggle via bouton `«` / `»` en bas de la sidebar :

**Mode étendu (240px)** — menus collapsibles click-to-expand :
- Clic sur un menu parent → toggle ouvert/fermé (chevron `>` → `v`)
- Le menu contenant la page active est automatiquement ouvert
- Le chevron est à gauche du label, les sous-items sont indentés de 16px
- Le badge compteur apparaît sur le menu parent (visible même fermé)
- Animation : hauteur 150ms ease-in-out

**Mode rétracté (64px)** — icônes seules + flyout au survol :
- La sidebar ne montre que les icônes des menus parents
- Au survol d'une icône parent → un flyout (panneau 200px) apparaît à droite avec les sous-items
- Le flyout a un fond surface (#fff), ombre elevated, border-radius 8px
- Le flyout reste visible tant que la souris est sur l'icône OU le flyout (zone de sécurité triangulaire)
- Les badges compteurs apparaissent en mini (dot rouge) sur l'icône en mode rétracté
- Les liens directs (Tableau de bord, Mon profil) affichent un tooltip au survol au lieu d'un flyout

**Toggle** :
- Bouton `«` (rétracte) / `»` (étend) positionné en bas de la sidebar, au-dessus du bloc utilisateur
- État persisté en localStorage
- Transition largeur : 200ms ease-in-out
- Sur mobile (< 768px) : sidebar toujours rétractée, flyout remplacé par un drawer overlay

**Style menu parent** :
- Texte : semi-bold (600), couleur text, font-size 14px
- Hover : fond gris très clair (#f1f5f9)
- Chevron : icône 12px, couleur text-muted, transition rotate 150ms

**Style sous-item** :
- padding-left : 40px (icône parent 16px + indent 24px)
- Même style que les items actuels (gris inactif, violet actif avec barre gauche)
- La barre active (3px violet gauche) s'affiche sur le sous-item, pas le parent

**Style flyout (mode rétracté)** :
- Position : absolute, left 64px, top aligné à l'icône parent
- Fond : surface (#ffffff), ombre elevated, border 1px border
- Border-radius : 8px
- Padding : 8px 0
- Titre du groupe en semi-bold 13px en haut du flyout
- Items du flyout : même style que sous-items (font 13px, hover gris clair)

**Dimensions**: ~240px de large, hauteur 100vh, position fixed
**Fond**: Blanc (#FFFFFF) avec bordure droite gris clair

**Etats**:
- Default : icone + texte gris
- Active : fond rose clair, texte violet, barre laterale gauche 3px violet
- Hover : fond gris tres clair

### Composant: DashboardPage

**Role**: Page d'accueil apres connexion

**Wireframe**:
```
+----------------------------------------------------------+
|  Tableau de bord                                          |
|  Bienvenue, [Nom]                                        |
|                                                          |
|  +------------------------------------------------------+|
|  | [ampoule] Commencez par completer votre profil pour  ||
|  |           que l'IA puisse trouver les contacts les    ||
|  |           plus pertinents.                      [x]  ||
|  |           > Completer mon profil                      ||
|  +------------------------------------------------------+|
|                                                          |
|  Actions en attente (N)                                  |
|  +------------------------------------------------------+|
|  | [description action]                        [lien]   ||
|  +------------------------------------------------------+|
|  | ... ou "Aucune action en attente. Tout est a jour !" ||
|  |         > Lancer une recherche                        ||
|  +------------------------------------------------------+|
|                                                          |
|  Statistiques rapides                                    |
|  +----------+----------+----------+----------+----------+|
|  | Contacts | Emails   | Reponses | Taux de  | Entre-   ||
|  |    42    | envoyes  | recues   | reponse  | tiens    ||
|  |          |    23    |    3     |   13%    |    1     ||
|  +----------+----------+----------+----------+----------+|
+----------------------------------------------------------+
```

**Conseil IA**: Bandeau rose clair avec icone ampoule, texte de conseil, lien d'action, bouton fermer (x)

**Stats cards**: 5 cartes en ligne, chacune avec icone coloree, label, valeur grande

### Composant: RecherchePage

**Role**: Lancer des recherches automatisees de contacts

**Wireframe** (mis a jour sc-723):
```
+----------------------------------------------------------+
|  Recherche automatisee                                   |
|  Lancez une recherche et recuperez des contacts...       |
|                                                          |
|  +------------------------------------------------------+|
|  | Globe  Snapshot du marche -- [Pays]                   ||
|  |                                                      ||
|  | +----------+  +----------+  +----------+  +--------+ ||
|  | | Tendance |  | Meilleure|  | Offres   |  | Salaire| ||
|  | | Forte    |  | periode  |  | estimees |  | moyen  | ||
|  | | demande  |  | Fev-Avr  |  | ~1200    |  | 80-130k| ||
|  | +----------+  +----------+  +----------+  +--------+ ||
|  |                                                      ||
|  | Conseils d'expert                                    ||
|  | [ampoule] Visa principal : AEWV...                   ||
|  | [ampoule] CV NZ : max 2 pages...                     ||
|  | [ampoule] Culture : tutoiement...                    ||
|  | [ampoule] Negociation : salaires negociables...      ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Nouvelle recherche                                    ||
|  |                                                      ||
|  | Pays cible        Secteur           Ville            ||
|  | [NZ         v]    [____________]    [___________]    ||
|  |                                                      ||
|  | [ ] Inclure les contacts RH / recruteurs             ||
|  |                                                      ||
|  |                          [Lancer la recherche ->]    ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Historique des recherches                             ||
|  | (tableau ou "Aucune recherche effectuee")             ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

**Snapshot marche**: Carte avec fond blanc, 4 sous-cartes stats + section conseils

**Formulaire**: 3 champs en ligne (pays dropdown, secteur texte, ville texte), checkbox, bouton primary

> **Note sc-723** : Le bouton "+ Nouvelle recherche" en haut à droite prévu dans la spec originale
> n'est pas implémenté. La recherche se fait directement via le formulaire "Nouvelle recherche".

### Composant: ContactsPage

**Role**: Liste et gestion des contacts

**Wireframe** (mis a jour sc-723 — reflète l'implémentation actuelle):
```
+----------------------------------------------------------+
|  Contacts           [Analyser les contacts]  [N contacts  |
|  Gerez vos contacts et suivez votre pipeline.   en att. d'analyse]|
|                                                          |
|  [* Tres pertinent (9)] [. Pertinent (2)]               |  <- Ligne 1: pertinence
|  [? A verifier (28)] [x Non pertinent (61)]             |
|                                                          |
|  [Tous(110)] [Identifie] [Analyse] [A contacter]        |  <- Ligne 2: statut pipeline
|  [Contacte] [Repondu] [Entretien] [Offre] [Rejete]      |
|                                                          |
|  +------------------------------------------------------+|
|  | Tracey Banwell  [50%] [Analyse] [? 30]  [Analyse v] ||
|  | Service Manager                                       ||
|  | IHC · Auckland · Healthcare Services                 ||
|  | "Bien que Tracey ait un role... (raison IA italic)"   ||
|  | tracey.banwell@ihc.org.nz  Source: hunter_company    ||
|  | [A verifier]              [Ignorer]                  ||
|  +------------------------------------------------------+|
|  | Aarthy Kanakasabai [49%] [Analyse] [x 25] [Analyse v]||
|  | ...                                       [Ignorer]  ||
|  +------------------------------------------------------+|
|                                                          |
|  OU: "Aucun contact trouve. Lancez un sourcing."         |
+----------------------------------------------------------+
```

**Filtres ligne 1** (AJOUT — pertinence IA) :
- `* Très pertinent (N)` — fond étoile, couleur primaire
- `. Pertinent (N)` — fond cercle bleu
- `? À vérifier (N)` — fond question orange
- `x Non pertinent (N)` — fond croix rouge

**Filtres ligne 2** (statut pipeline) :
- Pills horizontales, actif = fond coloré + texte blanc, inactif = outline coloré
- Tous | Identifié | Analysé | À contacter | Contacté | Répondu | Entretien | Offre | Rejeté

**Cards contact** :
- Nom (bold) + score confiance (badge cercle coloré) + badge statut + badge pertinence (icône + score)
- Rôle
- Entreprise · Ville · Secteur
- Raison pertinence IA (italique, gris)
- Email, source
- Recommandation IA en lien (À vérifier / Contacter / Revoir / Ignorer)
- Dropdown statut pipeline en haut à droite

**Clic sur une card** → Ouvre le slide-over panel ContactDetail (voir section dédiée)

### Composant: EmailsPage

**Role**: Gestion des emails generes par l'IA

**Wireframe**:
```
+----------------------------------------------------------+
|  Emails                            [Generer des emails]   |
|  Gerez les emails generes par l'IA pour vos contacts.    |
|                                                          |
|  [Tous(7)] [Brouillon] [Approuve] [Envoye]              |
|  [Ouvert] [Repondu] [Rejete]                            |
|                                                          |
|  +------------------------------------------------------+|
|  | [v] John Smith -- Xero              [Tres pertinent] ||
|  |     Objet: Regarding your backend team at Xero       ||
|  |                                                      ||
|  | [v] Marie Dupont -- Datacom           [Pertinent]    ||
|  |     Objet: Your data engineering expertise...        ||
|  |                                                      ||
|  | Actions en masse : [Rejeter selection] [Approuver]   ||
|  +------------------------------------------------------+|
|                                                          |
|  OU: "Aucun email. Generez des emails pour vos contacts."||
+----------------------------------------------------------+
```

### Composant: PipelineBoard (page Suivi)

**Role**: Vue kanban du pipeline de contacts

**Wireframe** (mis a jour sc-723 — reflète l'implémentation actuelle):
```
+----------------------------------------------------------+
|  Pipeline                         N contacts au total     |
|  Visualisez et gerez votre pipeline de contacts.         |
|                                                          |
|  [A contacter: 11]  [Identifie: 67]  [Analyse: 89]      |  <- Pills résumé
|                                                          |
|  Trouve  | A contac.| Contacte | En disc. | Entretien| Termine |
|  (156)   | (11)     | (0)      | (0)      | (0)      | (0)     |
|  -----   | -----    | -----    | -----    | -----    | -----   |
|  +-----+ | +------+ |                                          |
|  |Trace| | |C...  | |   Aucun contact   ...                   |
|  |[NP] | | |[TP]  | |                                         |
|  |IHC  | | |IHC   | |                                         |
|  |[V?] | | |[V✓]  | |                                         |
|  |Hunt | | |Broul.| |                                         |
|  |~40% | | |~40%  | |                                         |
|  +-----+ | +------+ |                                         |
+----------------------------------------------------------+
```

**Colonnes**: Chacune avec bordure coloree en haut (simple, pas de gradient)

| Colonne | Couleur barre haut |
|---------|-------------------|
| Trouve | Gris |
| A contacter | Bleu (tirets) |
| Contacte | Vert (implementation actuelle — spec originale: Indigo) |
| En discussion | Violet |
| Entretien | Rose/Magenta |
| Termine | Vert (implementation actuelle — spec originale: Ambre/Dore) |

> **Note sc-723** : Contacté devrait être Indigo et Terminé devrait être Ambre/Doré selon le design system.
> L'implémentation actuelle utilise Vert pour ces deux colonnes. A corriger dans une future story.

**Cards contact** (implémentation actuelle — plus riches que le wireframe original) :
- Badge pertinence (Très pertinent / Pertinent / Non pertinent / À vérifier)
- Nom (peut être tronqué), rôle, entreprise · pays
- Badge visa (✓ Visa / ⚠ Visa ?)
- Email
- Badge source (Hunter)
- Score de probabilité (~Probable 40%)
- Badge statut email (Brouillon si email en cours)

**Pills résumé** (AJOUT non prévu dans spec originale) :
- "À contacter: N" — contacts avec email en brouillon prêt
- "Identifié: N" — contacts identifiés au total
- "Analysé: N" — contacts analysés par l'IA

**Empty state** : "Aucun contact" dans chaque colonne vide ✅

### Composant: OnboardingWizard

**Role**: Configuration initiale du profil en 3 etapes

**Wireframe etape 1/3**:
```
+----------------------------------------------------------+
|              Bienvenue sur ExpatHunter                    |
|     Configurez votre profil en 3 etapes pour des         |
|     resultats optimaux                                   |
|                                                          |
|     1 / 3                                                |
|     [====|-------|-------]                               |
|     Informations    Votre CV    Experience et            |
|     de base                     competences              |
|                                                          |
|  +------------------------------------------------------+|
|  | Informations de base                                 ||
|  |                                                      ||
|  | Nom complet                                          ||
|  | [E2E Test User_________________________]             ||
|  |                                                      ||
|  | Pays cibles                                          ||
|  | [Selectionner des pays...              v]            ||
|  |                                                      ||
|  | Secteurs                                             ||
|  | [Tech, Finance...________________________]           ||
|  | Appuyez sur Entree ou virgule pour ajouter           ||
|  |                                                      ||
|  | Postes recherches                                    ||
|  | [Backend Developer, CTO..._______________]           ||
|  | Appuyez sur Entree ou virgule pour ajouter           ||
|  |                                                      ||
|  |                                    [Suivant]         ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

**Pas de sidebar** pendant l'onboarding — pleine page centree

### Composant: ParametresPage

**Role**: Configuration du compte et des preferences

**Wireframe** (mis a jour sc-723 — reflète l'implémentation actuelle):
```
+----------------------------------------------------------+
|  Parametres                                              |
|  Configurez votre compte et vos preferences.             |
|                                                          |
|  +------------------------------------------------------+|
|  | Compte                                               ||
|  | Email : user@example.com                             ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Sequences de relance                    3 maximum    ||
|  | Definissez quand et combien de relances envoyer.     ||
|  |                                                      ||
|  | Relance 1    [2] [jour(s)   v]                       ||  <- défaut: 2 jours
|  | + Ajouter une relance                                ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Plages d'envoi autorisees                            ||
|  | Jours autorises                                      ||
|  | (Lun) (Mar) (Mer) (Jeu) (Ven) [Sam] [Dim]           ||
|  |  <- actifs en violet outline, inactifs en gris       ||
|  |                                                      ||
|  | Heures d'envoi                                       ||
|  | De [08:00 v]  A [18:00 v]                            ||
|  +------------------------------------------------------+|
|                                                          |
|  [Sauvegarder]                                           |
+----------------------------------------------------------+
```

> **Note sc-723 — Sections différées / manquantes** :
> Les sections suivantes de la spec originale n'ont PAS été implémentées dans `/parametres` :
> - **Fuseau horaire** : champ absent
> - **Langue** : non implémentée dans les paramètres (sélectionnée à l'inscription seulement)
> - **Mode sombre** : non implémenté dans les paramètres (suit le système)
> - **Personnalisation des emails** : les liens vers Templates / Presets / Blocages / Connexion email
>   ont été remplacés par des liens directs dans la sidebar
>
> Ces fonctionnalités sont à implémenter dans de futures stories si nécessaire.

### Composant: LoginPage

**Role**: Connexion au compte

**Wireframe**:
```
+----------------------------------------------------------+
|                                                          |
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Connectez-vous a votre    |              |
|              |  compte                    |              |
|              |                            |              |
|              |  Email                     |              |
|              |  [vous@exemple.com______]  |              |
|              |                            |              |
|              |  Mot de passe              |              |
|              |  [********************__]  |              |
|              |                            |              |
|              |  [== Se connecter ======]  |              |
|              |                            |              |
|              |  Mot de passe oublie ?     |              |
|              |                            |              |
|              |  Pas encore de compte ?    |              |
|              |  > Creer un compte         |              |
|              +----------------------------+              |
|                                                          |
|                                        [chat icon]       |
+----------------------------------------------------------+
```

**Card centree**: fond blanc, ombre subtile, coins arrondis large
**Titre**: "ExpatHunter" en magenta bold
**Bouton**: fond violet plein, texte blanc

### Composant: RegisterPage

**Role**: Creation de compte

**Wireframe**:
```
+----------------------------------------------------------+
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Creez votre compte        |              |
|              |                            |              |
|              |  Nom complet               |              |
|              |  [Jean Dupont___________]  |              |
|              |                            |              |
|              |  Email                     |              |
|              |  [vous@exemple.com______]  |              |
|              |                            |              |
|              |  Mot de passe              |              |
|              |  [Minimum 8 caracteres__]  |              |
|              |                            |              |
|              |  Langue                    |              |
|              |  [Francais           v  ]  |              |
|              |                            |              |
|              |  [== Creer mon compte ==]  |              |
|              |                            |              |
|              |  Deja un compte ?          |              |
|              |  > Se connecter            |              |
|              +----------------------------+              |
+----------------------------------------------------------+
```

### Composant: ForgotPasswordPage

**Role**: Demande de reinitialisation du mot de passe

**Wireframe (etat formulaire)**:
```
+----------------------------------------------------------+
|                                                          |
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Reinitialiser votre mot   |              |
|              |  de passe                  |              |
|              |                            |              |
|              |  Email                     |              |
|              |  [vous@exemple.com______]  |              |
|              |                            |              |
|              |  [== Envoyer le lien ===]  |              |
|              |                            |              |
|              |  > Retour a la connexion   |              |
|              +----------------------------+              |
|                                                          |
|                                        [chat icon]       |
+----------------------------------------------------------+
```

**Wireframe (etat succes)**:
```
+----------------------------------------------------------+
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Reinitialiser votre mot   |              |
|              |  de passe                  |              |
|              |                            |              |
|              |  +------------------------+|              |
|              |  | Si un compte existe    ||              |
|              |  | avec cet email, un     ||              |
|              |  | lien a ete envoye.     ||              |  <- Fond success/10, bordure success/30, texte success
|              |  +------------------------+|              |
|              |                            |              |
|              |  > Retour a la connexion   |              |
|              +----------------------------+              |
|                                                          |
|                                        [chat icon]       |
+----------------------------------------------------------+
```

**Card centree**: fond surface-light, bordure border, ombre subtile, coins arrondis large (12px)
**Titre**: "ExpatHunter" en primary bold
**Bouton**: fond primary plein, texte blanc
**Message succes**: fond `--color-success`/10, bordure `--color-success`/30, texte `--color-success`
**Lien retour**: texte primary, underline au hover
**Note securite**: la reponse est identique qu'un compte existe ou non (anti-enumeration)

---

### Composant: ResetPasswordPage

**Role**: Saisie du nouveau mot de passe via token recu par email

**Wireframe (etat invalide — pas de token dans l'URL)**:
```
+----------------------------------------------------------+
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Nouveau mot de passe      |              |
|              |                            |              |
|              |  Ce lien de               |              |
|              |  reinitialisation est      |              |
|              |  invalide.                 |              |  <- Texte color-error
|              |                            |              |
|              |  > Demander un nouveau     |              |
|              |    lien                    |              |
|              +----------------------------+              |
|                                                          |
|                                        [chat icon]       |
+----------------------------------------------------------+
```

**Wireframe (etat formulaire — token valide dans l'URL)**:
```
+----------------------------------------------------------+
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Nouveau mot de passe      |              |
|              |                            |              |
|              |  Nouveau mot de passe      |              |
|              |  [********************__]  |              |
|              |                            |              |
|              |  Confirmer le mot de passe |              |
|              |  [********************__]  |              |
|              |                            |              |
|              |  [=== Reinitialiser =====] |              |
|              +----------------------------+              |
|                                                          |
|                                        [chat icon]       |
+----------------------------------------------------------+
```

**Wireframe (etat erreur — token invalide ou expire)**:
```
+----------------------------------------------------------+
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Nouveau mot de passe      |              |
|              |                            |              |
|              |  +------------------------+|              |
|              |  | Lien invalide ou       ||              |
|              |  | expire. Veuillez       ||              |  <- Fond error/10, bordure error/30, texte error
|              |  | demander un nouveau    ||              |
|              |  | lien.                  ||              |
|              |  +------------------------+|              |
|              |                            |              |
|              |  [=== Reinitialiser =====] |              |  <- Toujours present mais disabled possible
|              +----------------------------+              |
|                                                          |
|                                        [chat icon]       |
+----------------------------------------------------------+
```

**Wireframe (etat succes)**:
```
+----------------------------------------------------------+
|                                                          |
|              +----------------------------+              |
|              |     ExpatHunter            |              |
|              |  Nouveau mot de passe      |              |
|              |                            |              |
|              |  +------------------------+|              |
|              |  | Votre mot de passe a   ||              |
|              |  | ete reinitialise. Vous ||              |  <- Fond success/10, bordure success/30, texte success
|              |  | pouvez maintenant vous ||              |
|              |  | connecter.             ||              |
|              |  +------------------------+|              |
|              |                            |              |
|              |  > Se connecter            |              |
|              +----------------------------+              |
|                                                          |
|                                        [chat icon]       |
+----------------------------------------------------------+
```

**Card centree**: fond surface-light, bordure border, ombre subtile, coins arrondis large (12px)
**Titre**: "ExpatHunter" en primary bold
**Subtitle**: "Nouveau mot de passe" en text-muted
**Inputs password**: coins arrondis 6px, bordure border, focus ring border-focus (teal)
**Bouton**: fond primary plein, texte blanc
**Message succes**: fond `--color-success`/10, bordure `--color-success`/30, texte `--color-success`
**Message erreur**: fond `--color-error`/10, bordure `--color-error`/30, texte `--color-error`
**Lien retour**: texte primary, underline au hover
**Validation**: mot de passe minimum 8 caracteres, les deux champs doivent correspondre
**Token**: transmis via query param `?token=<hex64>`, lu via `useSearchParams()`

---

### Composant: AssistantButton

**Role**: Bouton flottant pour ouvrir l'assistant IA

**Position**: Fixed, bas droite (bottom: 24px, right: 24px)
**Style**: Cercle violet ~56px, icone bulle de chat blanche, ombre elevee
**Present sur**: Toutes les pages (auth et non-auth)

---

## 5. Layouts des pages

### Layout authentifie (avec sidebar)

```
+----------+-------------------------------------------------+
|          |                                                 |
| Sidebar  |  Contenu principal                              |
| (240px)  |  (flex-1, padding 24-32px)                      |
|          |                                                 |
|          |                                                 |
+----------+-------------------------------------------------+
                                              [Assistant btn]
```

### Layout non-authentifie (sans sidebar)

```
+----------------------------------------------------------+
|                                                          |
|              [Card centree, max-width 480px]              |
|                                                          |
+----------------------------------------------------------+
                                              [Assistant btn]
```

### Layout onboarding (sans sidebar)

```
+----------------------------------------------------------+
|                                                          |
|  [Titre centre + stepper, max-width 640px]               |
|  [Card formulaire]                                       |
|                                                          |
+----------------------------------------------------------+
                                              [Assistant btn]
```

---

## 5bis. Pages manquantes et etats avec data

### Composant: ContactsPage (etat avec data)

**Wireframe avec contacts charges**:
```
+----------------------------------------------------------+
|  Contacts                          [Analyser les contacts]|
|  Gerez vos contacts et suivez votre pipeline.            |
|                                                          |
|  Stats analyse (si analysed > 0):                        |
|  [* Tres pertinent (5)] [. Pertinent (8)]                |
|  [? A verifier (3)] [x Non pertinent (2)]                |
|                                                          |
|  [Tous(42)] [Identifie] [Analyse] [A contacter] ...     |
|                                                          |
|  +------------------------------------------------------+|
|  | John Smith                 [85] [Identifie]  [* 92]  ||
|  | Engineering Manager                                   ||
|  | Xero . Auckland . Tech                                ||
|  | "Leader d'equipe backend, match fort avec profil"     ||
|  | john@xero.com   LinkedIn   Source: seek   [Contacter] ||
|  |                                [Statut: [Identifie v]]||
|  +------------------------------------------------------+|
|  | Marie Dupont               [72] [Analyse]   [. 75]   ||
|  | CTO                                                   ||
|  | Datacom . Wellington . Tech                           ||
|  | "Profil management, experience similaire"             ||
|  | marie@datacom.nz  LinkedIn  Source: matchstiq [Revoir]||
|  |                                [Statut: [Analyse   v]]||
|  +------------------------------------------------------+|
|                                                          |
|  [< Precedent]  1 / 3  [Suivant >]                      |
+----------------------------------------------------------+
```

**Elements par contact**:
- Nom (bold) + score de confiance (badge circulaire) + badge statut (pill coloree) + badge pertinence (icone + score)
- Role (semi-bold)
- Entreprise . Ville . Secteur
- Raison de pertinence IA (italic, gris)
- Email, lien LinkedIn, source, recommandation IA (contacter/revoir/ignorer)
- Dropdown changement de statut a droite

### Composant: EmailsPage (etat avec data)

**Wireframe avec emails charges** (mis a jour sc-723):
```
+----------------------------------------------------------+
|  Emails        [Tout approuver (11)]  [Generer des emails]|
|  Gerez les emails generes par l'IA pour vos contacts.    |
|                                                          |
|  [Tous(11)] [Brouillon] [Approuve] [Envoye] ...         |
|                                                          |
|  [ ] Selectionner les approuves                          |
|                                                          |
|  +------------------------------------------------------+|
|  |[ ]  [Brouillon]  initial                             ||
|  |     A: Culley Angus -- CTO @ IHC (culley@ihc.org.nz)||
|  |                        [Modifier] [Approuver] [Suppr]||
|  |     Exploring Frontend Opportunities at IHC          ||
|  |     Hi Culley, I'm Yannick...                        ||
|  +------------------------------------------------------+|
|  |[ ]  [Brouillon]  initial                             ||
|  |     A: Tabitha Flack -- Principal Consultant @...    ||
|  |                        [Modifier] [Approuver] [Suppr]||
|  |     Exploring Frontend Opportunities Together        ||
|  |     Hi Tabitha, I'm a Frontend Developer...          ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

> **Note sc-723** : Le bouton "Envoyer tous (N)" n'est pas implémenté (remplacé par "Tout approuver").
> La barre d'actions batch fixe en bas n'est pas implémentée (actions inline sur chaque card).
> La pagination n'est pas visible mais scroll infini possible.

**Email en mode edition** (inline):
```
  +------------------------------------------------------+
  | [input sujet editable____________________________]   |
  | [textarea body editable                          ]   |
  | [                                                ]   |
  |                          [Sauvegarder] [Annuler]     |
  +------------------------------------------------------+
```

### Composant: ContactDetailPanel (slide-over depuis /contacts)

> **Note sc-723 — CHANGEMENT MAJEUR** : Le détail contact n'est PAS une page séparée `/contacts/:id`.
> Il s'ouvre sous forme de **panneau slide-over** superposé à la page /contacts.

**Wireframe** (mis a jour sc-723 — implémentation actuelle):
```
+-- Contacts list (blurred) ---+-- Slide-over panel ----------+
|                              |  Tracey Banwell          [x] |
|  [list of contacts]          |                              |
|                              |  Service Manager             |
|                              |                              |
|                              |  [IHC icon] IHC              |
|                              |  [Visa ✓]                    |
|                              |  [Pin] Auckland, NZ          |
|                              |  [Globe] ihc.org.nz          |
|                              |  [Mail] tracey.banwell@ihc   |
|                              |                              |
|                              |  ANALYSE IA                  |
|                              |  [A examiner]                |
|                              |  "Bien que Tracey ait..."    |
|                              |                              |
|                              |  Score expat                 |
|                              |  [====30%=====...] 30/100    |
|                              |                              |
|                              |  HISTORIQUE DES EMAILS       |
|                              |  Aucun email envoyé          |
+------------------------------+------------------------------+
```

**Sections du panneau** :
1. Header : nom, rôle, bouton fermer [x]
2. Infos entreprise : icône entreprise + nom, badge visa, ville+pays, site web, email
3. ANALYSE IA : badge statut (À examiner / Pertinent / etc.), texte raison, barre "Score expat" (N/100)
4. HISTORIQUE DES EMAILS : liste des emails envoyés ou "Aucun email envoyé"

**Note** : La page `/contacts/:id` existe dans le routing mais redirige vers la liste.
Le slide-over remplace l'ancienne spec "page full avec onglets Informations / Fil de discussion".

### Composant: ProfilPage `/profil`

**Wireframe** (mis a jour sc-723):
```
+----------------------------------------------------------+
|  Mon profil                                              |
|  Mettez a jour vos informations pour ameliorer la        |
|  pertinence du sourcing.                                 |
|                                                          |
|  +------------------------------------------------------+|
|  | Completion du profil                          75%    ||
|  | [==========================--------]                 ||
|  | Completez votre profil pour de meilleurs resultats   ||
|  +------------------------------------------------------+|
|                                                          |
|  [Conseil IA contextuel si disponible]                   |
|                                                          |
|  +-- Formulaire (2/3 largeur) --+  +-- CV (1/3) ------+|
|  |                               |  |                   ||
|  | Competences                   |  | Mon CV            ||
|  | [TypeScript x] [React x] [+] |  | CV enregistre     ||
|  |                               |  | [Remplacer le CV] ||
|  | Annees d'experience           |  |                   ||
|  | [8]                           |  | Texte extrait     ||
|  |                               |  | (scrollable)      ||
|  | Pays cibles                   |  | "Senior dev..."   ||
|  | [NZ x] [AU x] [Rechercher..] |  |                   ||
|  |                               |  +-------------------+|
|  | Secteurs                      |                       |
|  | [Tech x] [SaaS x] [+]       |                       |
|  |                               |                       |
|  | Postes recherches             |                       |
|  | [Backend Dev x] [CTO x] [+] |                       |
|  |                               |                       |
|  | [Sauvegarder]                 |                       |
|  +-------------------------------+                       |
+----------------------------------------------------------+
```

### Composant: TemplatesPage `/parametres/templates`

> **Note sc-723** : Accessible directement depuis le lien sidebar "Templates" (pas sous Paramètres).

**Wireframe** (mis a jour sc-723):
```
+----------------------------------------------------------+
|  Mes templates d'emails            [+ Nouveau template]   |
|  Creez des modeles reutilisables pour vos emails de      |
|  prospection.                                            |
|                                                          |
|  [Formulaire inline si creation/edition active]          |
|  +------------------------------------------------------+|
|  | Creer un template / Modifier un template             ||
|  |                                                      ||
|  | Nom                                                  ||
|  | [Premier contact formel___________]                  ||
|  |                                                      ||
|  | Sujet                                                ||
|  | [Regarding {{role}} at {{company}}]                  ||
|  | Variables: {{name}}, {{role}}, {{company}}           ||
|  |                                                      ||
|  | Corps                                                ||
|  | [Hi {{name}},                              ]         ||
|  | [                                          ]         ||
|  | [I noticed {{company}} has been...         ]         ||
|  |                                                      ||
|  | [ ] Definir comme template par defaut                ||
|  |                                                      ||
|  | [Sauvegarder] [Annuler]                              ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Premier contact formel          [* Par defaut]       ||
|  | Sujet: Regarding {{role}} at {{company}}             ||
|  | Hi {{name}}, I noticed {{company}}...                ||
|  |                                    [Modifier] [Suppr]||
|  +------------------------------------------------------+|
|  | Relance amicale                                      ||
|  | Sujet: Following up — {{company}}                    ||
|  | Hi {{name}}, just wanted to follow...                ||
|  |                                    [Modifier] [Suppr]||
|  +------------------------------------------------------+|
|                                                          |
|  OU (si aucun template):                                 |
|  "Aucun template. Creez votre premier template."         |
|  [+ Creer un template]                                   |
+----------------------------------------------------------+
```

### Composant: PresetsPage `/parametres/presets`

> **Note sc-723** : Accessible directement depuis le lien sidebar "Presets" (pas sous Paramètres).

**Wireframe** (mis a jour sc-723):
```
+----------------------------------------------------------+
|  Mes presets de generation          [+ Nouveau preset]    |
|  Configurez le ton, le format et les instructions pour   |
|  la generation IA.                                       |
|                                                          |
|  [Formulaire inline si creation/edition active]          |
|  +------------------------------------------------------+|
|  | Creer un preset                                      ||
|  |                                                      ||
|  | Nom                                                  ||
|  | [Approche directe NZ_____________]                   ||
|  |                                                      ||
|  | Longueur            Langue                           ||
|  | [Court] [Moyen] [Long]    [Francais v]               ||
|  |                                                      ||
|  | Framework                                            ||
|  | [AIDA] [PAS] [BAB] [DIRECT]                          ||
|  | "Direct : message court et factuel"                  ||
|  |                                                      ||
|  | Ton (multi-select)                                   ||
|  | (Professionnel) (Amical) [Direct] [Enthousiaste]     ||
|  |                                                      ||
|  | Instructions personnalisees                          ||
|  | [Toujours mentionner le visa sponsorship...  ]       ||
|  |                                                      ||
|  | [ ] Definir comme preset par defaut                  ||
|  |                                                      ||
|  | [Sauvegarder] [Annuler]                              ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Approche directe NZ        [* Par defaut]            ||
|  | [Moyen] [DIRECT] [Professionnel, Direct] [FR]        ||
|  | "Mentionner visa sponsorship..."                     ||
|  |                                    [Modifier] [Suppr]||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

### Composant: BlocagesPage `/parametres/blocages`

**Wireframe**:
```
+----------------------------------------------------------+
|  Contacts et entreprises bloques                         |
|  Gerez les contacts et entreprises que vous avez bloques.|
|                                                          |
|  +------------------------------------------------------+|
|  | [Entreprise]  Acme Corp                              ||
|  | Raison: Pas de visa sponsorship                      ||
|  | Permanent                              [Debloquer]   ||
|  +------------------------------------------------------+|
|  | [Contact]  spam@company.com                          ||
|  | Raison: Doublon                                      ||
|  | Jusqu'au: 15/06/2025                   [Debloquer]   ||
|  +------------------------------------------------------+|
|                                                          |
|  OU: "Aucun blocage. Vous n'avez bloque aucun contact." |
+----------------------------------------------------------+
```

**Badges type**: "Entreprise" (violet) ou "Contact" (gris)

### Composant: ConnexionEmailPage `/parametres/connexion-email`

**Wireframe**:
```
+----------------------------------------------------------+
|  Connexion email                                         |
|  Configurez IMAP/SMTP pour recevoir les reponses.        |
|                                                          |
|  +------------------------------------------------------+|
|  | Guide de configuration                               ||
|  | Gmail : activez l'acces IMAP et utilisez un mot...   ||
|  | Outlook : activez POP/IMAP dans les parametres...    ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Fournisseur                                          ||
|  | [Gmail] [Outlook] [Yahoo] [Autre]                    ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | IMAP (reception)                                     ||
|  | Serveur            Port                              ||
|  | [imap.gmail.com]   [993]                             ||
|  |                                                      ||
|  | Utilisateur                                          ||
|  | [you@gmail.com]                                      ||
|  |                                                      ||
|  | Mot de passe                                         ||
|  | [**********]                                         ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | SMTP (envoi)                                         ||
|  | Serveur            Port                              ||
|  | [smtp.gmail.com]   [587]                             ||
|  |                                                      ||
|  | Utilisateur                                          ||
|  | [you@gmail.com]                                      ||
|  |                                                      ||
|  | Mot de passe                                         ||
|  | [**********]                                         ||
|  +------------------------------------------------------+|
|                                                          |
|  [Tester la connexion] [Sauvegarder] [Supprimer]        |
+----------------------------------------------------------+
```

### Composant: AdminUsersPage `/admin/users`

**Wireframe** (mis a jour sc-723 — reflète l'implémentation actuelle):
```
+----------------------------------------------------------+
|  Gestion des utilisateurs                                |
|  Gerez les roles et les plans des utilisateurs.          |
|                                                          |
|  [Tous (4)]  [Gratuits (2)]  [Premium (2)]               |  <- Filtres plan
|                                                          |
|  +------------------------------------------------------+|
|  | Nom             | Email               | Plan | Role ||  |
|  |-----------------|---------------------|------|------|  |
|  | Profile Unit User| profile-unit@...   |Gratu | Util |  |
|  | Yannick B.      | ya.b.net@gmail.com  |Premi | Adm. |  |
|  | E2E Test User   | e2e-test@...        |Premi | Util |  |
|  | E2E Reset User  | e2e-reset@...       |Gratu | Util |  |
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

**Colonnes** : Nom, Email, Plan (badge Gratuit/Premium), Rôle (badge Admin/Utilisateur), Inscription (date)
**Filtres plan** : Tous, Gratuits, Premium

### Composant: AdminAiSettingsPage `/admin/ai-settings`

**Wireframe** (mis a jour sc-723 — reflète l'implémentation actuelle):
```
+----------------------------------------------------------+
|  Configuration IA                                        |
|  Configurez les modeles IA par fonctionnalite.           |
|                                                          |
|  +------------------------------------------------------+|
|  | Par defaut                          [Configurer]     ||
|  | Non configure (utilise les valeurs par defaut)        ||
|  +------------------------------------------------------+|
|  | Extraction CV                       [Configurer]     ||
|  | Non configure (utilise les valeurs par defaut)        ||
|  +------------------------------------------------------+|
|  | Analyse de pertinence               [Configurer]     ||
|  | Non configure (utilise les valeurs par defaut)        ||
|  +------------------------------------------------------+|
|  | Generation d'emails                 [Configurer]     ||
|  | Non configure (utilise les valeurs par defaut)        ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Parametres d'envoi d'emails                          ||
|  | Nombre max. de relances    [3]                       ||
|  | Delai minimum entre relances [1] [jours v]           ||
|  | [Sauvegarder]                                        ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

> **Note sc-723** : La section "Cache IA" (total, expirés, purger) prévue dans la spec originale
> n'a pas été implémentée. À créer dans une future story si nécessaire.

### Composant: SearchProgressModal

**Wireframe** (modal overlay):
```
+----------------------------------------------------------+
|                                                          |
|  +--------------------------------------------------+   |
|  |                                                  |   |
|  |              [Spinner anime]                     |   |
|  |                                                  |   |
|  |  Recherche en cours -- NZ, Tech                  |   |
|  |  [=============================------] 75%       |   |
|  |                                                  |   |
|  |  [v] Scraping        12 contacts trouves         |   |
|  |  [v] Enrichissement  10 emails trouves           |   |
|  |  [~] Analyse IA      En cours...                 |   |
|  |  [ ] Generation       En attente                 |   |
|  |                                                  |   |
|  |  12 contacts . 8 pertinents . 0 emails generes   |   |
|  |  (2 contacts exclus - contactes recemment)       |   |
|  |                                                  |   |
|  +--------------------------------------------------+   |
|                                                          |
+----------------------------------------------------------+

Etat termine:
+--------------------------------------------------+
|              [Icone check vert]                   |
|                                                  |
|  Recherche terminee !                            |
|  12 contacts . 8 pertinents . 6 emails generes   |
|                                                  |
|  [Voir les emails]                [Fermer]       |
+--------------------------------------------------+
```

### Composant: ChatPanel (assistant IA)

**Wireframe** (panneau lateral droit):
```
+-------------------------------+
| Assistant IA            [x]   |
|-------------------------------|
|                               |
| Suggestions:                  |
| [Meilleurs secteurs en NZ ?]  |
| [Salaires en tech a Auckland?]|
| [Comment optimiser ma rech?]  |
|                               |
| [Mode: Support] [Expert]      |
|                               |
| +---------------------------+ |
| | User: Comment contacter   | |
| | ce profil ?                | |
| +---------------------------+ |
| | IA: Je vous suggere de... | |
| | **points cles**:          | |
| | - Mentionner le visa...   | |
| +---------------------------+ |
|                               |
| [Effacer]                     |
|                               |
| [Votre message...______] [>] |
+-------------------------------+
```

**Suggestions contextuelles** par page :
- emails: "Ameliorer le ton", "Meilleur moment pour envoyer", "Personnaliser relances"
- suivi: "Preparer entretien", "Relancer apres silence", "Apres une offre"
- contacts: "Info sur entreprise", "Sponsorise visas ?", "Comment contacter"
- recherche: "Meilleurs secteurs", "Salaires", "Optimiser recherche"
- defaut: "Lancer recherche", "Envoyer emails", "Fonctionnement kanban"

---

## 6. Guidelines d'accessibilite

### WCAG 2.1 AA

1. **Skip link** : "Aller au contenu principal" en premier element focusable (deja implemente)
2. **Contraste** : ratio minimum 4.5:1 pour le texte, 3:1 pour les elements UI
3. **Navigation clavier** : tous les elements interactifs accessibles via Tab
4. **Labels de formulaire** : chaque input a un label explicite au-dessus
5. **Badges de statut** : texte toujours visible (pas de couleur seule)
6. **Focus visible** : outline sur tous les elements focusables
7. **Annonces dynamiques** : aria-live pour les mises a jour (recherche, emails)
8. **Alternatives drag & drop** : menu contextuel pour deplacer les contacts dans le pipeline
9. **Dark mode** : contrastes respectes dans les deux modes
10. **Alert role** : element alert present pour les messages de feedback

### Responsive breakpoints
| Breakpoint | Largeur | Adaptation |
|------------|---------|------------|
| Mobile | < 768px | Sidebar cachee (hamburger), cards empilees |
| Tablet | 768-1024px | Sidebar collapsible, kanban scroll horizontal |
| Desktop | > 1024px | Sidebar fixe, layout complet |

---

## Job Offers Pipeline — UX Extension (Phase 0.3-bis)

> This section extends the existing UX spec with the Job Offers feature set.
> It follows all established design system rules (colors, typography, spacing, radius, shadows).
> All French UI labels are consistent with the existing application.
> Do NOT modify any section above this separator.

---

### UX Decisions — Job Offers

| # | Question | Reponse |
|---|----------|---------|
| 12 | Navigation offres | Deux nouveaux liens dans la sidebar : "Recherche d'offres" et "Offres d'emploi" |
| 13 | Page offres | 3 onglets : Nouvelles / Postulees / Archivees — meme pattern que les filtres pills existants |
| 14 | Evaluation IA | Score de pertinence (%) + resume match + raison de selection + conseils modifiables |
| 15 | Exclusion | Modal avec categorie structuree + raison libre — injectee dans les prochaines evaluations IA |
| 16 | Workspace candidature | Page dediee split gauche/droite : CV a gauche, lettre de motivation a droite |
| 17 | Methode CV | Google Docs (recommande, badge "Meilleurs resultats") vs template local (alternative) |
| 18 | Email candidature | Corps court 3-4 lignes genere par l'IA, modifiable avant envoi, ton adapte au pays |
| 19 | Langue generation | Deduite du pays cible, modifiable via selecteur discret avant generation |
| 20 | Contact recrutement | Contacts distincts des leads — ajoutes au fil du process sur la fiche offre |
| 21 | Expiration | Silencieuse, visible dans onglet Archivees — pas de notification |
| 22 | Signal croise | Badge "Vous avez un contact chez cette entreprise" sur card offre + badge reciproque sur contact |

---

## 7. Sitemap — Ajout pages offres d'emploi

Les pages suivantes s'ajoutent aux pages authentifiees existantes :

- `/offres` — Page principale des offres d'emploi (3 onglets)
- `/offres/:id` — Fiche detail d'une offre
- `/offres/:id/candidature` — Espace de travail candidature (CV + LM + envoi)
- `/recherche-offres` — Configuration de la recherche d'offres

---

## 8. Sidebar — Menus collapsibles

La sidebar est réorganisée avec des **menus parents collapsibles** regroupant les liens par pipeline :

```
+----------------------------+
|  ExpatHunter               |
+----------------------------+
|  [ ] Tableau de bord       |  <- Lien direct
|                            |
|  v  Prospection            |  <- Menu parent (ouvert)
|     [ ] Trouver des contacts|
|     [ ] Mes contacts       |
|     [ ] Mes emails  [11]   |
|     [ ] Suivi              |
|                            |
|  v  Offres d'emploi  [8]  |  <- Menu parent (ouvert) + badge nouvelles
|     [ ] Recherche d'offres |  <- NOUVEAU
|     [ ] Mes offres         |  <- NOUVEAU (/offres)
|                            |
|  --- séparateur ---        |
|  [ ] Mon profil            |  <- Lien direct
|                            |
|  >  Paramètres             |  <- Menu parent (fermé)
|     [ ] Général            |
|     [ ] Templates          |
|     [ ] Presets            |
|     [ ] Connexion email    |
|     [ ] Blocages           |
|                            |
|  >  Administration         |  <- Menu parent (fermé, admin seulement)
|     [ ] Config. IA         |
|     [ ] Utilisateurs       |
|                            |
+----------------------------+
|  Nom Utilisateur           |
|  email@example.com         |
|  [→ Se déconnecter]        |
+----------------------------+
```

**Comportement collapsible** :
- Clic sur un menu parent → toggle ouvert/fermé (chevron `>` → `v`)
- Le menu contenant la page active est automatiquement ouvert au chargement
- Animation collapse/expand : hauteur 150ms ease-in-out
- État persisté en localStorage
- Les badges compteurs sont visibles sur le parent même quand fermé

**Nouvelles entrées (sous "Offres d'emploi")** :
- "Recherche d'offres" — route `/recherche-offres` — icône loupe/briefcase
- "Mes offres" — route `/offres` — icône briefcase
- Le badge [8] sur le parent indique le nombre de nouvelles offres non vues

---

## 9. User Flows — Offres d'emploi

### Flow 7 : Configuration de la recherche d'offres

```
1. L'utilisateur clique sur "Recherche d'offres" dans la sidebar
2. Il arrive sur /recherche-offres
3. S'il n'a pas de recherche active : formulaire de creation affiche directement
4. Il remplit les criteres :
   - Postes recherches (multi-select tags, ex: "Senior Frontend", "Fullstack")
   - Pays cibles (multi-select dropdown, avec cities optionnelles)
   - Plateformes (checkboxes : Seek, LinkedIn, BuiltIn, Zeil)
   - Seniorite (radio : Junior / Intermediaire / Senior / Lead / Indifferent)
   - Secteur (champ libre, optionnel)
   - Competences additionnelles (tags)
   - Frequence (free : hebdo fixe grise ; premium : dropdown Daily/Bihebdo/Hebdo)
5. Il clique "Sauvegarder et lancer"
6. Confirmation : "Recherche lancee ! Les premieres offres apparaitront dans quelques minutes."
7. Redirection vers /offres

### Etats speciaux
- Empty state : formulaire de creation visible directement (pas de liste)
- Loading state (lancement) : spinner sur le bouton + message "Recherche en cours..."
- Error state : inline sous le formulaire (ex: "Veuillez selectionner au moins un poste")
- Quota depasse (free) : bandeau ambre "Vous avez deja 1 recherche active. Passez en premium pour en creer 3."
```

### Flow 8 : Parcourir et evaluer les offres

```
1. L'utilisateur clique sur "Offres d'emploi" dans la sidebar
2. Il arrive sur /offres — onglet "Nouvelles" actif par defaut
3. Il voit la liste des offres avec cards (voir JobOfferCard)
4. Il peut filtrer par recherche (si plusieurs recherches actives)
5. Pour chaque offre, il peut :
   a. Changer le statut via le dropdown (Nouvelle > Interessee > Postule...)
   b. Cliquer "Voir les details" -> /offres/:id
   c. Cliquer "Exclure" -> ouvre ExclusionModal
   d. Cliquer sur le lien plateforme -> ouvre l'annonce dans un nouvel onglet
6. Les offres "Postulees" et "Archivees" sont dans leurs onglets respectifs
7. Les offres expirees sont dans l'onglet "Archivees" avec badge "Expiree"

### Etats speciaux
- Empty state Nouvelles : illustration + "Aucune nouvelle offre. Votre recherche tourne en arriere-plan."
  Lien : "Configurer ma recherche"
- Empty state Postulees : "Aucune candidature envoyee pour l'instant."
- Empty state Archivees : "Aucune offre archivee."
- Loading state : skeleton cards (3 cards placeholder avec animation pulse)
- Error state : "Impossible de charger les offres. [Reessayer]"
```

### Flow 9 : Detail d'une offre et preparation

```
1. L'utilisateur clique sur une offre depuis /offres
2. Il arrive sur /offres/:id
3. Il voit le detail complet (voir JobOfferDetailPage) :
   - Informations offre (titre, entreprise, salaire, date, lien(s))
   - Evaluation IA complete (score, resume, raison, conseils)
   - Panneau entreprise (enrichissement : type, secteur, taille, accréditation)
   - Contacts de recrutement (liste + bouton ajouter)
4. Il peut :
   a. Modifier les conseils de candidature IA (zone editable)
   b. Ajouter/modifier un contact de recrutement
   c. Cliquer "Adapter mon CV" -> /offres/:id/candidature (section CV active)
   d. Cliquer "Generer une lettre" -> /offres/:id/candidature (section LM active)
   e. Cliquer "Postuler" -> /offres/:id/candidature (section email active)
   f. Cliquer "Exclure" -> ExclusionModal
5. Le bouton "Postuler" est desactive tant que CV ou LM n'est pas genere

### Etats speciaux
- Loading : skeleton full-page
- Offre expiree : bandeau warning en haut "Cette offre est expiree. [Reactivation manuelle]"
- Offre exclue : bandeau gris "Vous avez exclu cette offre : [raison]. [Annuler l'exclusion]"
```

### Flow 10 : Generer le CV et la lettre de motivation

```
1. L'utilisateur arrive sur /offres/:id/candidature
2. La page est divisee en deux colonnes :
   - Gauche : CV adapte
   - Droite : Lettre de motivation
3. En haut de chaque colonne : selecteur de langue (deduit automatiquement, modifiable)
4. Section CV (gauche) :
   a. Choix de methode : [Google Docs (recommande)] [Template local]
   b. Si Google Docs :
      - Bouton "Adapter mon CV" (avec badge "Meilleurs resultats")
      - Apres generation : liste des remplacements IA (max 7) avec avant/apres
      - Champ "Instructions supplementaires" (optionnel, avant ou apres generation)
      - Bouton "Regenerer avec ces instructions"
      - Bouton "Modifier manuellement" (bascule vers textarea editable)
      - Bouton "Exporter en PDF"
   c. Si template local : meme flow avec upload DOCX si pas de template
5. Section Lettre (droite) :
   a. Bouton "Generer la lettre"
   b. Apres generation : apercu de la lettre (scrollable)
   c. Champ "Instructions supplementaires"
   d. Bouton "Regenerer"
   e. Bouton "Modifier manuellement"
   f. Bouton "Exporter en PDF"
6. En bas : section email
   a. Apercu email (corps 3-4 lignes, genere a partir du CV+LM)
   b. Zone editable
   c. Indicateur de ton (ex: [Professionnel] [Adapte NZ])
   d. Destinataire (contact de recrutement ou email offre)
   e. Pieces jointes : CV.pdf + Lettre.pdf (auto-attachees)
   f. Bouton "Envoyer la candidature" (desactive si CV ou LM pas genere)

### Etats speciaux
- Loading generation CV : spinner + "L'IA adapte votre CV..."
- Loading generation LM : spinner + "L'IA redige votre lettre..."
- Error generation : "La generation a echoue. [Reessayer]" inline
- Quota depasse (free) : message + lien upgrade
- Succes envoi : toast + redirection /offres avec statut offre passe a "Postulée"
```

### Flow 11 : Gestion des contacts de recrutement

```
1. Depuis /offres/:id, l'utilisateur clique "Ajouter un contact"
2. Un formulaire inline apparait :
   - Nom (requis)
   - Role / Poste (optionnel)
   - Email (optionnel)
   - LinkedIn (optionnel)
   - Notes (optionnel)
3. Il sauvegarde -> le contact apparait dans la liste
4. Pour emailing d'un contact recrutement : bouton "Envoyer un email"
   -> ouvre un composer AI-assisted (pas de cold email logic)
5. Si ce contact est deja un lead dans le pipeline :
   - Badge "Lead existant" sur le contact
   - Message : "Ce contact sera retire du pipeline lead pendant ce process"
```

---

## 10. Design System — Ajout statuts offres d'emploi

### Badges de statut offres

| Statut | Hex | Badge style | Semantique |
|--------|-----|-------------|------------|
| Nouvelle | `#3B82F6` (Info/Bleu) | Outline bleu | Offre recue, pas encore vue |
| Interessee | `#8B5CF6` (Violet) | Outline violet | Utilisateur interesse, pas encore postule |
| Postulée | `#940d82` (Primary) | Fond plein primary | Candidature envoyee |
| Entretien | `#0d9488` (Teal) | Fond plein teal | Entretien programme |
| Proposition | `#F59E0B` (Warning/Ambre) | Outline ambre | Offre d'emploi recue |
| Acceptee | `#22C55E` (Success) | Fond plein vert | Offre acceptee |
| Rejetee | `#EF4444` (Error) | Outline rouge | Refus (leur cote) |
| Exclue | `#94a3b8` (Gris) | Fond plein gris | Exclu par l'utilisateur |
| Expiree | `#64748b` (Text Muted) | Outline gris sombre | Offre expiree automatiquement |

**Dark mode** : Postulée utilise teal (`#14b8a6`) au lieu du primary violet — meme regle que pour tous les elements primary.

### Badges croisees pipeline

| Badge | Apparait sur | Style |
|-------|-------------|-------|
| "Contact chez [Entreprise]" | Card offre d'emploi | Fond primary-light, texte primary, icone personne, pill shape |
| "Offre chez [Entreprise]" | Card contact lead | Fond info/10, texte info, icone briefcase, pill shape |

### Badges enrichissement entreprise

| Badge | Condition | Style |
|-------|-----------|-------|
| "Accreditee immigration" | accreditation_status = accredited | Fond success/10, texte success, icone checkmark |
| "Agence recrutement" | company_type = recruitment_agency | Fond warning/10, texte warning, icone briefcase |
| "A verifier" | accreditation_status = unknown | Fond border, texte muted, icone question |

### Indicateur republication

Visible sur card offre quand l'offre a ete detectee plusieurs fois :
```
[Republiee le 12 jan] <- pill ambre, icone refresh, tooltip avec dates precedentes
```

---

## 11. Specification des composants — Offres d'emploi

### Composant: JobSearchConfigPage `/recherche-offres`

**Role**: Formulaire de configuration de la recherche d'offres

**Wireframe**:
```
+----------------------------------------------------------+
|  Recherche d'offres                                      |
|  Configurez les criteres de votre recherche automatique. |
|                                                          |
|  +------------------------------------------------------+|
|  | [!] Vous n'avez pas de recherche active.             ||
|  |     Configurez vos criteres pour commencer.          ||
|  +------------------------------------------------------+|
|                    OU (si recherche existante)            |
|  +------------------------------------------------------+|
|  | Ma recherche active      [Modifier] [Supprimer]      ||
|  | Senior Frontend, Fullstack . NZ, AU . Seek, LinkedIn ||
|  | Derniere execution : il y a 2h . 12 offres trouvees  ||
|  | Frequence : Hebdomadaire                             ||
|  |                      [Lancer maintenant]              ||
|  +------------------------------------------------------+|
|                                                          |
|  +-- Formulaire (creation / edition) -----------------+  |
|  |                                                    |  |
|  | Postes recherches                                  |  |
|  | [Senior Frontend x] [Fullstack x] [Ajouter... +]  |  |
|  |                                                    |  |
|  | Pays cibles            Villes (optionnel)          |  |
|  | [NZ x] [AU x] [+]     [Auckland x] [Ajouter +]   |  |
|  |                                                    |  |
|  | Plateformes                                        |  |
|  | [v] Seek  [v] LinkedIn  [ ] BuiltIn  [ ] Zeil     |  |
|  |                                                    |  |
|  | Seniorite                                          |  |
|  | (Junior) (Intermediaire) (* Senior) (Lead) (Indif.)|  |
|  |                                                    |  |
|  | Secteur (optionnel)     Competences cles           |  |
|  | [Tech / SaaS________]   [React x] [Node x] [+]   |  |
|  |                                                    |  |
|  | Frequence de recherche                             |  |
|  | [Hebdomadaire (gratuit)]  <- free : grisee         |  |
|  | [Quotidienne v]           <- premium seulement     |  |
|  |  [i] Passez en premium pour configurer            |  |
|  |      la frequence                                  |  |
|  |                                                    |  |
|  |              [Annuler]  [Sauvegarder et lancer ->] |  |
|  +----------------------------------------------------+  |
+----------------------------------------------------------+
```

**Props / Donnees** :
- `activeSearch`: JobSearch | null — recherche existante
- `userPlan`: 'free' | 'premium' — pour les quotas
- `suggestedPlatforms`: Platform[] — selon pays selectionne

**Etats** :
- Empty (pas de recherche) : formulaire seul, pas de section "recherche active"
- Has search : section "recherche active" au-dessus + formulaire cache par defaut
- Editing : formulaire pre-rempli avec donnees existantes
- Loading save : bouton avec spinner, inputs disabled
- Error : messages inline sous chaque champ invalide
- Quota free : bandeau ambre, selecteur frequence grise

**Interactions** :
- Tags postes/competences : Entree ou virgule pour ajouter, [x] pour retirer
- Pays multi-select : dropdown avec recherche
- Plateformes : checkboxes en ligne
- "Lancer maintenant" : POST /api/job-searches/:id/run avec feedback

**Responsive** :
- Mobile (< 768px) : champs empiles, plateformes en 2 colonnes
- Tablet (768-1024px) : layout 2 colonnes pour certains champs
- Desktop (> 1024px) : layout 3 colonnes pour pays/villes/frequence

**Accessibilite** :
- fieldset + legend pour groupes de champs (Plateformes, Seniorite)
- aria-required sur postes et pays
- aria-disabled + tooltip sur selecteur frequence (free)
- role="status" sur messages de feedback

**data-testid** :
- `job-search-config-form`
- `job-search-roles-input`
- `job-search-countries-select`
- `job-search-platforms-seek`, `job-search-platforms-linkedin`
- `job-search-seniority-{value}`
- `job-search-frequency-select`
- `job-search-save-button`
- `job-search-active-card`
- `job-search-run-now-button`

---

### Composant: JobOffersPage `/offres`

**Role**: Page principale des offres d'emploi avec 3 onglets

**Wireframe**:
```
+----------------------------------------------------------+
|  Offres d'emploi                                         |
|  Gerer vos offres d'emploi et suivez vos candidatures.  |
|                                                          |
|  [Nouvelles (8)] [Postulees (3)] [Archivees (12)]        |
|                                           <- tabs pills   |
|                                                          |
|  Recherche: [Toutes mes recherches v]                    |
|  Tri : [Plus recent v]                                   |
|                                                          |
|  +------------------------------------------------------+|
|  | [JobOfferCard] <- voir composant dedie               ||
|  +------------------------------------------------------+|
|  | [JobOfferCard]                                       ||
|  +------------------------------------------------------+|
|  | ...                                                  ||
|  +------------------------------------------------------+|
|                                                          |
|  [< Precedent]  1 / 4  [Suivant >]                       |
+----------------------------------------------------------+
```

**Onglets** :
- "Nouvelles" — statuts: `new`, `interested`
- "Postulees" — statuts: `applied`, `interview`, `offer_received`, `accepted`, `rejected`
- "Archivees" — statuts: `excluded`, `expired`

**Filtres** :
- Multi-recherche (si > 1 recherche active) : dropdown "Toutes mes recherches"
- Tri : Plus recent / Score decroissant / Date de cloture

**Etats** :
- Empty Nouvelles : illustration + "Aucune nouvelle offre. Votre recherche d'offres tourne en arriere-plan."
  Sous-texte : "Les offres apparaitront ici apres la prochaine execution." + lien "Configurer ma recherche"
- Empty Postulees : "Aucune candidature pour l'instant. Postulent depuis l'onglet Nouvelles."
- Empty Archivees : "Aucune offre archivee."
- Loading : 3 skeleton cards (animation pulse, hauteur ~140px)
- Error : "Impossible de charger les offres." + bouton "Reessayer"

**Responsive** :
- Mobile (< 768px) : cards full width, onglets scrollables si tres longs
- Tablet (768-1024px) : cards full width, filtres en ligne
- Desktop (> 1024px) : cards full width avec max-width 900px, filtres en ligne

**Accessibilite** :
- role="tablist" sur les onglets, role="tab" sur chaque onglet
- aria-selected sur l'onglet actif
- aria-live="polite" sur le container de cards (annonce changement d'onglet)

**data-testid** :
- `job-offers-page`
- `job-offers-tab-new`
- `job-offers-tab-applied`
- `job-offers-tab-archived`
- `job-offers-list`
- `job-offers-search-filter`
- `job-offers-empty-state`

---

### Composant: JobOfferCard (reutilisable)

**Role**: Card d'offre d'emploi dans la liste — dense et scannable

**Wireframe**:
```
+------------------------------------------------------+
|  [Score: 87%]  Senior Frontend Engineer     [Statut v]|
|                                                      |
|  [Acme Corp] [Accreditee immigration]                |
|  Auckland, NZ . Tech / SaaS . Publie le 08 jan 2025  |
|  [Seek] [LinkedIn]                 [Republiee le 12j] |
|                                                      |
|  "Correspond bien a votre profil React/Node. Xero    |
|  recherche un senior avec votre experience..."       |
|  Raison : Expertise React + 8 ans exp. correspondent.|
|                                                      |
|  $120k - $140k NZD                                   |
|                                                      |
|  [* Vous avez un contact chez Acme Corp]             |
|                                                      |
|  [Voir les details]  [Postuler]  [Exclure]           |
+------------------------------------------------------+
```

**Props / Donnees** :
- `id`: string
- `title`: string
- `company`: { name, type, accreditation_status, sector }
- `location`: { city, country }
- `published_at`: Date
- `closing_date`: Date | null
- `salary`: string | null
- `relevance_score`: number (0-100)
- `match_summary`: string — resume IA du match
- `selection_reason`: string — raison courte de selection
- `status`: JobOfferStatus
- `links`: { platform, url }[]
- `republication_dates`: Date[] — vide si jamais republiee
- `has_cross_contact`: boolean — l'utilisateur a un lead chez cette entreprise

**Layout elements** :
1. Ligne header : score (badge colore selon valeur) + titre (bold, truncate 1 ligne) + dropdown statut
2. Ligne entreprise : nom entreprise (semi-bold) + badge accreditation/agence + ville, pays, secteur + date publication + liens plateformes + indicateur republication (si applicable)
3. Bloc IA : match_summary (2 lignes max, italic gris) + selection_reason (1 ligne, texte muted)
4. Salaire : si disponible, texte vert bold
5. Badge croise : si has_cross_contact (pill primary-light)
6. Actions : [Voir les details] (secondary) + [Postuler] (primary, visible si statut le permet) + [Exclure] (texte rouge)

**Score color mapping** :
- 80-100% : `#22C55E` (success vert)
- 60-79% : `#F59E0B` (ambre)
- 40-59% : `#3B82F6` (bleu info)
- < 40% : `#64748b` (gris muted)

**Etats** :
- Default : fond surface-light, ombre card
- Hover : ombre elevated, bordure primary/30
- Active (clique) : fond primary/5
- Expiree : opacite 60%, badge "Expiree" en haut a droite
- Exclue : fond gris tres clair, badge "Exclue" en haut a droite

**Interactions** :
- Clic card (hors boutons) : navigation vers /offres/:id
- Dropdown statut : PATCH /api/job-offers/:id/status, mise a jour optimiste
- Bouton "Postuler" : navigation vers /offres/:id/candidature
- Bouton "Exclure" : ouvre ExclusionModal
- Lien plateforme : target="_blank", rel="noopener"

**Responsive** :
- Mobile (< 768px) : actions sur une ligne en bas, salaire et badge croise sur la meme ligne
- Tablet et Desktop : layout identique

**Accessibilite** :
- role="article" sur la card
- aria-label="[titre] chez [entreprise]"
- Le dropdown statut a un label "Changer le statut de [titre]"
- Les liens plateformes ont aria-label="Voir l'annonce sur [plateforme]"

**data-testid** :
- `job-offer-card-{id}`
- `job-offer-card-title`
- `job-offer-card-score`
- `job-offer-card-company`
- `job-offer-card-status-select`
- `job-offer-card-apply-button`
- `job-offer-card-exclude-button`
- `job-offer-card-cross-contact-badge`
- `job-offer-card-republication-badge`

---

### Composant: JobOfferDetailPage `/offres/:id`

**Role**: Fiche complete d'une offre avec evaluation IA et gestion du process

**Wireframe**:
```
+----------------------------------------------------------+
|  [< Retour aux offres]                                   |
|                                                          |
|  Senior Frontend Engineer                [Statut v]      |
|  Publie le 08 jan 2025 . Fermeture : 31 jan 2025        |
|                                                          |
|  [Voir sur Seek ->] [Voir sur LinkedIn ->]               |
|                                                          |
|  +----- Informations offre (2/3) ----+  +-- Entreprise -+|
|  |                                   |  |               ||
|  | $120k - $140k NZD                 |  | Acme Corp     ||
|  |                                   |  | [Accreditee]  ||
|  | Description complete de l'offre   |  | Tech . SaaS   ||
|  | (scrollable, formatage markdown   |  | 50-200 pers.  ||
|  | conserve)                         |  |               ||
|  |                                   |  | acmecorp.nz   ||
|  | ...                               |  | linkedin.com/ ||
|  |                                   |  | company/acme  ||
|  |                                   |  |               ||
|  +-----------------------------------+  +---------------+|
|                                                          |
|  +-- Evaluation IA ----------------------------------------+|
|  |                                                        ||
|  | Score de pertinence      [87%]  [======-------]       ||
|  |                                                        ||
|  | Resume du match                                        ||
|  | "Votre experience React (8 ans) et votre background   ||
|  |  SaaS correspond bien au poste. Les technologies      ||
|  |  mentionnees (TypeScript, Node.js) sont dans votre    ||
|  |  profil. Entreprise accreditee pour visa sponsorship." ||
|  |                                                        ||
|  | Raison de selection                                    ||
|  | "Expertise React + experience SaaS + matching pays"   ||
|  |                                                        ||
|  | Conseils de candidature         [Modifier]            ||
|  | +-----------------------------------------------------+||
|  | | Mettre en avant les projets SaaS et l'experience   |||
|  | | de leadership technique. Mentionner le visa...     |||
|  | | [zone editable si Modifier clique]                 |||
|  | +-----------------------------------------------------+||
|  |                                    [Sauvegarder] (si edit)||
|  +----------------------------------------------------------+|
|                                                          |
|  +-- Contacts de recrutement ----------------------------+|
|  |                                                       ||
|  | [+ Ajouter un contact]                                ||
|  |                                                       ||
|  | +-- RecruitmentContactCard (voir composant) ---------+||
|  | +-- RecruitmentContactCard                          -+||
|  |                                                       ||
|  | OU: "Aucun contact de recrutement pour l'instant."    ||
|  +-------------------------------------------------------+|
|                                                          |
|  [Adapter mon CV]  [Generer une lettre]  [Postuler]      |
|  [Exclure cette offre]                                   |
+----------------------------------------------------------+
```

**Zones** :
1. Header : titre + statut dropdown + liens plateformes + breadcrumb retour
2. Split 2/3 - 1/3 : description offre | enrichissement entreprise
3. Evaluation IA : score barre de progression + resume + raison + conseils editables
4. Contacts recrutement : liste + formulaire ajout inline
5. Actions barre en bas (sticky sur mobile)

**Actions footer** :
- [Adapter mon CV] → `/offres/:id/candidature?section=cv` (primary si LM pas genere, secondary sinon)
- [Generer une lettre] → `/offres/:id/candidature?section=cover-letter`
- [Postuler] → `/offres/:id/candidature?section=email` (desactive si CV et LM pas generes)
- [Exclure cette offre] → ExclusionModal (texte rouge, tout a droite)

**Etats** :
- Loading : skeleton full-page avec 3 zones
- Offre expiree : bandeau warning "Offre expiree" + bouton "Reactiver manuellement"
- Offre exclue : bandeau gris + raison + bouton "Annuler l'exclusion"
- Conseils edit : textarea remplace le texte, bouton Sauvegarder apparait
- Sauvegarde conseils : spinner, puis toast "Conseils sauvegardes"

**Responsive** :
- Mobile (< 768px) : colonnes empilees, actions en barre sticky en bas
- Tablet (768-1024px) : split maintenu si > 900px sinon empilement
- Desktop (> 1024px) : layout 2/3 - 1/3 standard

**Accessibilite** :
- heading h1 sur le titre de l'offre
- Section "Evaluation IA" avec role="region" et aria-label
- Le champ conseils a un label explicite
- Barre de score : role="progressbar" aria-valuenow aria-valuemax

**data-testid** :
- `job-offer-detail-page`
- `job-offer-detail-title`
- `job-offer-detail-status-select`
- `job-offer-detail-score`
- `job-offer-detail-match-summary`
- `job-offer-detail-advice`
- `job-offer-detail-advice-edit-button`
- `job-offer-detail-advice-save-button`
- `job-offer-detail-company-panel`
- `job-offer-detail-recruitment-contacts`
- `job-offer-detail-add-contact-button`
- `job-offer-detail-adapt-cv-button`
- `job-offer-detail-generate-letter-button`
- `job-offer-detail-apply-button`
- `job-offer-detail-exclude-button`

---

### Composant: ApplicationWorkspacePage `/offres/:id/candidature`

**Role**: Espace de travail complet : adaptation CV + lettre de motivation + envoi email

C'est la page la plus complexe du pipeline offres. Elle est divisee en trois sections verticales dans un layout en deux colonnes plus un footer.

**Wireframe general**:
```
+----------------------------------------------------------+
|  [< Retour a l'offre]  Candidature : Senior Frontend @ Acme |
|                                                          |
|  +-- CV adapte (gauche, 50%) -----+  +-- Lettre (droite, 50%) -+
|  |                                |  |                          |
|  | [Google Docs] [Template local] |  | Lettre de motivation     |
|  |  ^ bouton actif                |  |                          |
|  | [i] Google Docs : meilleurs    |  | Langue : [Anglais v]     |
|  |     resultats                  |  |                          |
|  |                                |  | [Generer la lettre]      |
|  | Langue : [Anglais v]           |  |  OU apres generation :   |
|  |                                |  |                          |
|  | Instructions (optionnel)       |  | +----------------------+ |
|  | [Mettre en avant leadership__] |  | | Dear Hiring Manager, | |
|  |                                |  | |                      | |
|  | [Adapter mon CV]               |  | | I am writing to...   | |
|  |  OU apres generation :         |  | |                      | |
|  |                                |  | | [scrollable]         | |
|  | Remplacements IA (7 max):      |  | +----------------------+ |
|  | Avant: "5 ans d'exp."          |  |                          |
|  | Apres: "8 ans d'exp. React"    |  | Instructions :           |
|  | [v]  [v]  [v]  [v]  [v]       |  | [Ton plus formel___]     |
|  |                                |  |                          |
|  | Instructions (post-gen)        |  | [Regenerer]  [Modifier]  |
|  | [Insister sur TypeScript___]   |  |                          |
|  |                                |  | [Exporter en PDF]        |
|  | [Regenerer]  [Modifier manu.]  |  |                          |
|  |                                |  +-------------------------+|
|  | [Exporter en PDF]              |                            |
|  |                                |                            |
|  +--------------------------------+                            |
|                                                              |
|  +-- Email d'accompagnement (footer) ----------------------------+
|  |                                                              |
|  | Destinataire : [john@acmecorp.nz v]  (ou champ libre)       |
|  |                                                              |
|  | Sujet : [Application for Senior Frontend Engineer at Acme]   |
|  |                                                              |
|  | Corps :                                                      |
|  | +----------------------------------------------------------+ |
|  | | Dear [hiring team / contact name],                       | |
|  | |                                                          | |
|  | | Please find attached my CV and cover letter for the      | |
|  | | Senior Frontend Engineer position at Acme Corp...        | |
|  | |                                                          | |
|  | | [editable textarea]                                      | |
|  | +----------------------------------------------------------+ |
|  |                                                              |
|  | Ton : [Professionnel] [Adapte NZ]                           |
|  |                                                              |
|  | Pieces jointes : [CV.pdf x] [LettreMotivation.pdf x]        |
|  |                                                              |
|  |                        [Envoyer la candidature ->]           |
|  |  (desactive si CV ou LM pas encore genere)                  |
|  +--------------------------------------------------------------+
+----------------------------------------------------------+
```

**Props / Donnees** :
- `offerId`: string
- `offer`: JobOffer (titre, entreprise, pays cible)
- `cvGeneration`: CvGenerationState — methode choisie, remplacements, statut
- `coverLetter`: CoverLetterState — contenu, statut
- `applicationEmail`: EmailState — corps, destinataire, statut envoi
- `recruitmentContacts`: RecruitmentContact[] — pour le selecteur destinataire
- `userCvMethod`: 'google_docs' | 'local' | null
- `quotaRemaining`: number | null (null = illimite premium)

**Section CV — etats detailles** :

| Etat | Affichage |
|------|-----------|
| Initial | Selecteur methode + champ instructions + bouton "Adapter mon CV" |
| Generating | Spinner + "L'IA adapte votre CV..." + bouton disabled |
| Generated | Liste remplacements (avant/apres) + champ post-gen instructions + boutons Regenerer / Modifier / Exporter PDF |
| Editing | Textarea full-height editable (rempli avec texte CV adapte) + boutons Sauvegarder / Annuler |
| Exporting | Spinner + "Generation du PDF..." |
| Error | Message erreur inline + bouton Reessayer |
| Quota full | Bandeau ambre "Quota hebdo atteint. [Passer premium]" + boutons disabled |

**Section Lettre — etats detailles** :

| Etat | Affichage |
|------|-----------|
| Initial | Selecteur langue + bouton "Generer la lettre" |
| Generating | Spinner + "L'IA redige votre lettre..." |
| Generated | Apercu scrollable + champ instructions + boutons Regenerer / Modifier / Exporter PDF |
| Editing | Textarea full-height |
| Error | Message erreur inline + Reessayer |

**Section Email — etats detailles** :

| Etat | Affichage |
|------|-----------|
| Initial (avant CV+LM) | Corps placeholder grise, bouton Envoyer disabled, tooltip "Generez d'abord votre CV et votre lettre" |
| Pret | Corps editable, bouton Envoyer actif |
| Sending | Spinner + "Envoi en cours..." |
| Sent | Toast succes + redirection offres/:id avec statut "Postulée" |
| Error | Message erreur inline + Reessayer |

**Selecteur langue** :
- Apparait discretement au-dessus du bouton de generation (petite taille, pas prominent)
- Label : "Langue du document"
- Options : Anglais (EN) / Francais (FR) — par defaut selon pays offre
- Meme selecteur pour CV et LM (partage l'etat mais modifiable independamment)

**Methode CV — indicateur** :
- [Google Docs (recommande)] : badge vert "Meilleurs resultats" a cote du label
- [Template local] : libelle simple, pas de badge
- Le choix est persisté dans les preferences utilisateur

**Interactions clavier** :
- Tab entre les deux colonnes
- Esc pour annuler l'edition manuelle
- Ctrl+S pour sauvegarder en mode edition

**Responsive** :
- Mobile (< 768px) : colonnes empilees (CV en premier, LM en second, email en dernier), sticky footer pour le bouton Envoyer
- Tablet (768-1024px) : colonnes cote a cote si > 768px, email en dessous
- Desktop (> 1024px) : layout complet 50/50 + footer email

**Accessibilite** :
- Chaque section a un role="region" avec aria-labelledby
- Les boutons generer/regenerer indiquent leur etat via aria-busy
- Le bouton Envoyer desactive a aria-disabled + aria-describedby sur le tooltip
- Les remplacements IA forment une liste (role="list") avec avant/apres en dl/dt/dd
- Toast succes : role="alert"

**data-testid** :
- `application-workspace-page`
- `cv-method-google-docs`
- `cv-method-local`
- `cv-language-select`
- `cv-instructions-input`
- `cv-generate-button`
- `cv-regenerate-button`
- `cv-edit-button`
- `cv-export-pdf-button`
- `cv-replacements-list`
- `cover-letter-language-select`
- `cover-letter-generate-button`
- `cover-letter-regenerate-button`
- `cover-letter-edit-button`
- `cover-letter-export-pdf-button`
- `email-recipient-select`
- `email-subject-input`
- `email-body-textarea`
- `email-send-button`
- `email-attachments-list`

---

### Composant: ExclusionModal

**Role**: Modal de confirmation d'exclusion d'une offre avec raison structuree

**Wireframe**:
```
+------------------------------------------+
|  Exclure cette offre              [x]     |
|                                          |
|  Pourquoi excluez-vous cette offre ?     |
|  (Cela aide l'IA a affiner ses           |
|  prochaines evaluations)                 |
|                                          |
|  Categorie                               |
|  [Remuneration trop basse       v]       |
|                                          |
|  Options dans le dropdown :              |
|  - Remuneration trop basse               |
|  - Secteur ne correspond pas             |
|  - Niveau de seniorite inadequat         |
|  - Type d'entreprise non voulu           |
|  - Localisation trop eloignee            |
|  - Poste ne correspond pas               |
|  - Autre                                 |
|                                          |
|  Raison (optionnel)                      |
|  [En dessous de 120k NZD________]        |
|                                          |
|  [Annuler]          [Confirmer l'exclusion]|
+------------------------------------------+
```

**Props / Donnees** :
- `offerId`: string
- `offerTitle`: string — affiche dans le titre "Exclure [titre]..."
- `onConfirm`: (category, reason) => void
- `onCancel`: () => void

**Categorie (enum)** :
- `salary` — "Remuneration trop basse"
- `sector` — "Secteur ne correspond pas"
- `seniority` — "Niveau de seniorite inadequat"
- `company_type` — "Type d'entreprise non voulu"
- `location` — "Localisation trop eloignee"
- `role_mismatch` — "Poste ne correspond pas"
- `other` — "Autre"

**Etats** :
- Default : formulaire vierge, bouton Confirmer active
- Loading (apres confirm) : spinner sur bouton, overlay disabled
- Error : message inline sous le formulaire

**Accessibilite** :
- role="dialog", aria-modal="true", aria-labelledby
- Focus trap dans la modal
- Esc ferme la modal (= Annuler)
- Focus initial sur le dropdown categorie

**data-testid** :
- `exclusion-modal`
- `exclusion-category-select`
- `exclusion-reason-input`
- `exclusion-confirm-button`
- `exclusion-cancel-button`

---

### Composant: RecruitmentContactCard

**Role**: Card d'un contact de recrutement dans la fiche offre

**Wireframe**:
```
+----------------------------------------------+
|  John Doe                      [Envoyer email]|
|  Engineering Manager                          |
|  john.doe@acmecorp.nz                         |
|  linkedin.com/in/johndoe                      |
|                                               |
|  [Lead existant]  <- badge si cross-pipeline  |
|                                               |
|  Notes : "Contacte directement apres..."      |
|                                               |
|                           [Modifier] [Retirer]|
+----------------------------------------------+
```

**Props / Donnees** :
- `id`: string
- `name`: string
- `role`: string | null
- `email`: string | null
- `linkedin`: string | null
- `notes`: string | null
- `isExistingLead`: boolean — vrai si ce contact existe dans le pipeline leads

**Formulaire ajout inline** :
```
+----------------------------------------------+
|  Ajouter un contact de recrutement           |
|                                              |
|  Nom *                Role                   |
|  [John Doe_________]  [Eng. Manager_______]  |
|                                              |
|  Email                LinkedIn               |
|  [john@acme.com___]   [linkedin.com/in/__]   |
|                                              |
|  Notes                                       |
|  [Premier contact apres entretien phone___]  |
|                                              |
|                     [Annuler]  [Ajouter]     |
+----------------------------------------------+
```

**Etats** :
- Default : affichage compact
- Edit : formulaire inline (remplace la card)
- Loading add/edit : spinner sur bouton
- Has cross-lead : badge "Lead existant" visible + tooltip "Ce contact est dans votre pipeline leads. Il sera marque 'En process' pendant cette candidature."

**Interactions** :
- "Envoyer email" : ouvre composer email AI-assisted (flow follow-up, pas cold email)
- "Modifier" : bascule en mode edit inline
- "Retirer" : confirmation simple (toast avec undo 5s)

**Accessibilite** :
- role="listitem" quand dans une liste
- Le bouton "Retirer" a aria-label="Retirer [nom] de cette offre"

**data-testid** :
- `recruitment-contact-card-{id}`
- `recruitment-contact-name`
- `recruitment-contact-email-button`
- `recruitment-contact-edit-button`
- `recruitment-contact-remove-button`
- `recruitment-contact-cross-lead-badge`
- `recruitment-contact-add-form`
- `recruitment-contact-add-name-input`
- `recruitment-contact-add-submit-button`

---

## 12. Cross-pipeline indicators

### Badge sur card offre -> contact lead

Quand `has_cross_contact: true` sur une offre, la JobOfferCard affiche :

```
[* Vous avez un contact chez Acme Corp]
```

- Style : pill, fond `#f5d0f0` (primary-light), texte `#940d82` (primary), icone personne
- Dark mode : fond `#134e4a` (primary-light dark), texte `#14b8a6` (teal)
- Clic : ouvre la fiche contact dans un slide-over lateral (sans quitter /offres)
- Tooltip : "John Smith - Engineering Manager chez Acme Corp (contact lead)"

### Badge sur card contact -> offre

Quand une offre active existe pour l'entreprise du contact, la ContactCard dans `/contacts` affiche :

```
[Offre chez Acme Corp]
```

- Style : pill, fond `#eff6ff` (bleu tres clair), texte `#3B82F6` (info bleu), icone briefcase
- Clic : navigation vers `/offres` filtre sur cette entreprise
- Visible uniquement si l'offre est en statut `new` ou `interested` (pas encore postulees ou archivees)

---

## 13. Responsive et accessibilite — specifique offres

### Responsive breakpoints supplementaires

| Page | Mobile (< 768px) | Tablet (768-1024px) | Desktop (> 1024px) |
|------|-----------------|--------------------|--------------------|
| /recherche-offres | Formulaire single-column | 2 colonnes pour champs | 3 colonnes pour champs |
| /offres | Cards full-width, onglets scrollables | Cards full-width | Cards max-width 900px |
| /offres/:id | Single-column, sticky action bar | Split possible > 900px | Split 2/3 + 1/3 |
| /offres/:id/candidature | Sections empilees, sticky "Envoyer" | Split si > 900px | Split 50/50 + footer |

### Gestion du focus — ApplicationWorkspacePage

Sur mobile, quand l'utilisateur clique "Adapter mon CV" :
1. Scroll automatique vers la section CV
2. Focus deplace sur le spinner / premiere zone interactive apres generation
3. Annonce aria-live : "Adaptation du CV en cours..."
4. Apres generation : focus sur le premier remplacement IA

### Empty states visuels

Chaque empty state suit le pattern existant (illustration + texte + CTA) :

| Page / Section | Illustration | Texte principal | CTA |
|----------------|-------------|-----------------|-----|
| /offres onglet Nouvelles | Briefcase avec loupe | "Aucune nouvelle offre" | "Configurer ma recherche" |
| /offres onglet Postulees | Enveloppe envoyee | "Aucune candidature" | null |
| /offres onglet Archivees | Archive box | "Aucune offre archivee" | null |
| Contacts recrutement | Personne + + | "Aucun contact de recrutement" | "Ajouter un contact" |

### Skeleton screens (loading)

Tous les etats de chargement utilisent des skeleton screens (meme pattern que l'existant) plutot que des spinners centraux :

| Composant | Skeleton |
|-----------|----------|
| JobOfferCard | 3 lignes texte + 2 badges + barre score |
| JobOfferDetailPage | Header + bloc 2/3+1/3 + bloc evaluation |
| ApplicationWorkspacePage | Deux colonnes avec barres horizontales |

---

## 14. Suggestions assistant IA — pages offres

Le ChatPanel (composant existant) recoit des suggestions contextuelles specifiques aux pages offres :

| Page | Suggestions |
|------|------------|
| /recherche-offres | "Quels postes sont en forte demande en NZ ?", "Quelles plateformes pour la tech a Auckland ?", "Comment affiner mes criteres ?" |
| /offres | "Comment ameliorer mon score de pertinence ?", "Quand relancer apres une candidature ?", "Que signifie ce badge accréditation ?" |
| /offres/:id | "Comment adapter mon CV pour ce poste ?", "Conseils pour cette entreprise", "Comment contacter sans email ?" |
| /offres/:id/candidature | "Ton conseille pour ce pays ?", "Quoi mettre en avant dans cette lettre ?", "Longueur ideale du CV en NZ ?" |
