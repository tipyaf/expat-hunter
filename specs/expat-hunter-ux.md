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

**Wireframe**:
```
+----------------------------+
|  ExpatHunter               |  <- Texte magenta bold
|                            |
| [bg] Tableau de bord       |  <- Actif : fond rose clair, texte violet, barre gauche 3px
|  Q   Trouver des contacts  |  <- Icone + texte, gris quand inactif
|  Ppl Mes contacts          |
|  Env Mes emails            |
|  Bar Suivi                 |
|                            |
|  --- separateur ---        |
|  @   Mon profil            |
|  Gear Parametres           |
|                            |
+----------------------------+
|  Nom Utilisateur           |  <- Texte noir bold
|  email@example.com         |  <- Texte gris small
|  [-> Se deconnecter]       |  <- Bouton outline
+----------------------------+
```

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

**Wireframe**:
```
+----------------------------------------------------------+
|  Recherche automatisee                 [+ Nouvelle rech.] |
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

### Composant: ContactsPage

**Role**: Liste et gestion des contacts

**Wireframe**:
```
+----------------------------------------------------------+
|  Contacts                          [Analyser les contacts]|
|  Gerez vos contacts et suivez votre pipeline.            |
|                                                          |
|  [Tous(42)] [Identifie] [Analyse] [A contacter]         |
|  [Contacte] [Repondu] [Entretien] [Offre] [Rejete]      |
|                                                          |
|  +------------------------------------------------------+|
|  | Nom    | Role    | Entreprise | Pertinence | Statut  ||
|  |--------|---------|------------|------------|---------|
|  | J.Smith| Eng Mgr | Xero       | [Tres pert]| Contacte||
|  | M.Dupt | CTO     | Datacom    | [Pertinent]| A cont. ||
|  | ...    | ...     | ...        | ...        | ...     ||
|  +------------------------------------------------------+|
|                                                          |
|  OU: "Aucun contact trouve. Lancez un sourcing."         |
+----------------------------------------------------------+
```

**Filtres**: Pills horizontales, actif = fond colore + texte blanc, inactif = outline colore

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

**Wireframe**:
```
+----------------------------------------------------------+
|  Pipeline                         N contacts au total     |
|  Visualisez et gerez votre pipeline de contacts.         |
|                                                          |
|  Trouve  | A contac.| Contacte | En disc. | Entretien| Termine |
|  (18)    | (7)      | (5)      | (2)      | (1)      | (1)     |
|  -----   | -----    | -----    | -----    | -----    | -----   |
|  +-----+ | +------+ | +------+ | +------+ | +------+ | +-----+ |
|  |Smith| | |Dupont| | |Brown | | |Lee   | | |Wong  | | |Chen | |
|  |EngMg| | |CTO   | | |VP Eng| | |TmLead| | |DirEng| | |PM   | |
|  |Xero | | |Datcm | | |Spark | | |Trade | | |Rocket| | |Fish | |
|  |[Tre]| | |[Pert]| | |[Cont]| | |[Disc]| | |[Entr]| | |[Off]| |
|  +-----+ | +------+ | +------+ | +------+ | +------+ | +-----+ |
|           |          |          |          |          |         |
+----------------------------------------------------------+
```

**Colonnes**: Chacune avec en-tete colore (gradient subtil haut de colonne), compteur, cards

| Colonne | Couleur barre haut |
|---------|-------------------|
| Trouve | Gris |
| A contacter | Bleu |
| Contacte | Indigo |
| En discussion | Violet |
| Entretien | Rose/Magenta |
| Termine | Ambre/Dore |

**Cards contact**: Nom, role, entreprise, badge statut

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

**Wireframe**:
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
|  | Relance 1    [7] [jour(s)   v]                       ||
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
|  |                                                      ||
|  | Fuseau horaire                                       ||
|  | [Europe/Paris v]                                     ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Personnalisation des emails                          ||
|  |                                                      ||
|  | > Mes templates                                  [>] ||
|  |   Creez et gerez vos modeles d'emails                ||
|  |                                                      ||
|  | > Mes presets de generation                      [>] ||
|  |   Configurez le ton, le format et les instructions   ||
|  |                                                      ||
|  | > Contacts et entreprises bloques                [>] ||
|  |   Gerez les contacts et entreprises bloques          ||
|  |                                                      ||
|  | > Connexion email                                [>] ||
|  |   Configurez IMAP/SMTP pour recevoir les reponses    ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Langue                                               ||
|  | [Francais v]                                         ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Mode sombre                                          ||
|  | [Automatique] [Clair] [Sombre]                       ||
|  +------------------------------------------------------+|
|                                                          |
|  [Sauvegarder]                                           |
+----------------------------------------------------------+
```

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

**Wireframe avec emails charges**:
```
+----------------------------------------------------------+
|  Emails                [Approuver tout (5)] [Envoyer     ||
|  Gerez les emails...   tous (3)] [Generer des emails]    |
|                                                          |
|  [message de feedback si present]                        |
|                                                          |
|  [Barre de progression envoi si en cours]                |
|  [============================] 8/12                     |
|                                                          |
|  [Tous(12)] [Brouillon] [Approuve] [Envoye] ...         |
|                                                          |
|  [ ] Selectionner tous les approuves                     |
|                                                          |
|  +------------------------------------------------------+|
|  |[v]  [Brouillon]  initial                             ||
|  |     A: John Smith -- Eng Manager @ Xero (john@xero)  ||
|  |     [Regenerer] [Modifier] [Approuver] [Rejeter]     ||
|  |                                                      ||
|  |     Regarding your backend team at Xero              ||
|  |     Hi John, I noticed Xero's engineering team...    ||
|  +------------------------------------------------------+|
|  |[ ]  [Approuve]  initial                              ||
|  |     A: Marie Dupont -- CTO @ Datacom (marie@dat)     ||
|  |                                                      ||
|  |     Your data engineering expertise at Datacom       ||
|  |     Hi Marie, I noticed Datacom has been growing...  ||
|  +------------------------------------------------------+|
|                                                          |
|  [< Precedent]  1 / 2  [Suivant >]                      |
|                                                          |
|  +======================================================+|
|  ||  3 email(s) selectionne(s)                          |||
|  ||            [Approuver selection] [Envoyer (2)] [x]  |||
|  +======================================================+|
+----------------------------------------------------------+
```

**Barre d'actions batch**: Fixed en bas, fond sombre, texte clair, avec compteur + actions + bouton fermer

**Email en mode edition** (inline):
```
  +------------------------------------------------------+
  | [input sujet editable____________________________]   |
  | [textarea body editable                          ]   |
  | [                                                ]   |
  | [                                                ]   |
  |                          [Sauvegarder] [Annuler]     |
  +------------------------------------------------------+
```

### Composant: ContactDetailPage `/contacts/:id`

**Wireframe**:
```
+----------------------------------------------------------+
|  John Smith                          [Identifie]          |
|  Engineering Manager . Xero . Auckland                    |
|  john.smith@xero.com                                     |
|                                                          |
|  [Informations]  [Fil de discussion]                     |
|  ────────────────────────────────────                    |
|                                                          |
|  == Onglet Informations ==                               |
|  +------------------------------------------------------+|
|  | Informations du contact                              ||
|  | Email        john.smith@xero.com                     ||
|  | Entreprise   Xero                                    ||
|  | Secteur      Tech                                    ||
|  | Pays         NZ                                      ||
|  +------------------------------------------------------+|
|                                                          |
|  == Onglet Fil de discussion (ThreadView) ==             |
|  +------------------------------------------------------+|
|  | Fil de discussion              [Synchroniser]        ||
|  +------------------------------------------------------+|
|  | Resume IA (si disponible)                            ||
|  | "Contact interesse, a demande plus de details sur..." ||
|  +------------------------------------------------------+|
|  |                                                      ||
|  | [NON LU] john@xero.com   [Entretien]   15 mars 2025 ||
|  | Re: Regarding your backend team                      ||
|  | Thanks for reaching out! I'd be happy to...          ||
|  | [Voir plus]                                          ||
|  | [Suggerer une reponse]                               ||
|  |                                                      ||
|  | +--------------------------------------------------+ ||
|  | | Reponse suggeree par l'IA                        | ||
|  | | Thank you for your interest, John. I would...    | ||
|  | +--------------------------------------------------+ ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

**Onglets**: "Informations" et "Fil de discussion" avec underline active primary
**Replies**: Card avec bordure gauche primary si non lu, badge event (Entretien/Rejet/Offre/Demande info), bouton "Suggerer une reponse"

### Composant: ProfilPage `/profil`

**Wireframe**:
```
+----------------------------------------------------------+
|  Mon profil                                              |
|  Gerez vos informations et votre CV.                     |
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

**Wireframe**:
```
+----------------------------------------------------------+
|  Mes templates                     [+ Nouveau template]   |
|  Creez et gerez vos modeles d'emails.                    |
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

**Wireframe**:
```
+----------------------------------------------------------+
|  Presets de generation              [+ Nouveau preset]    |
|  Configurez le ton, le format et les instructions IA.    |
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

**Wireframe**:
```
+----------------------------------------------------------+
|  Gestion des utilisateurs                                |
|  Gerez les comptes et les roles.                         |
|                                                          |
|  +------------------------------------------------------+|
|  | Nom             | Email                  | Admin     ||
|  |-----------------|------------------------|-----------|
|  | Yannick B.      | yannick@example.com    | [Admin]   ||
|  | E2E Test User   | e2e@expathunter.test   | [User]    ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

**Toggle admin**: Clic sur le badge bascule le role (disabled sur soi-meme)

### Composant: AdminAiSettingsPage `/admin/ai-settings`

**Wireframe**:
```
+----------------------------------------------------------+
|  Configuration IA                                        |
|  Gerez les modeles et parametres d'intelligence artif.   |
|                                                          |
|  +------------------------------------------------------+|
|  | Defaut                              [Configurer]     ||
|  | Modele: openai/gpt-4o-mini                           ||
|  | Temperature: 0.3 | Max tokens: 1024                  ||
|  | Active                                               ||
|  +------------------------------------------------------+|
|  | Extraction CV                       [Configurer]     ||
|  | Non configure                                        ||
|  +------------------------------------------------------+|
|  | Analyse de pertinence               [Configurer]     ||
|  | Modele: openai/gpt-4o                                ||
|  | Temperature: 0.1 | Max tokens: 2048                  ||
|  +------------------------------------------------------+|
|  | Generation d'emails                 [Configurer]     ||
|  | ...                                                  ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Cache IA                              [Purger]       ||
|  | +----------+  +----------+                           ||
|  | | Total    |  | Expires  |                           ||
|  | |   245    |  |    12    |                           ||
|  | +----------+  +----------+                           ||
|  | Par type: relevance (120, ~3j), email (80, ~5j)      ||
|  +------------------------------------------------------+|
|                                                          |
|  +------------------------------------------------------+|
|  | Limites d'envoi email                                ||
|  | Max relances      [3]                                ||
|  | Delai min relance [1] [jours v]                      ||
|  | [Sauvegarder]                                        ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

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
