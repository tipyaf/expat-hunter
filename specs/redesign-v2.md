# ExpatHunter — Document de cadrage : Redesign V2

**Date** : 2026-03-21
**Auteur** : Product Owner
**Version** : 1.0
**Statut** : Draft

---

## 1. Persona

### Marie, 29 ans — Expatriée en devenir

**Situation** : Marie est développeuse front-end avec 5 ans d'expérience, basée en France. Elle rêve de travailler à l'étranger (Australie, Canada) mais ne sait pas par où commencer pour trouver des contacts pertinents dans ces pays.

**Profil type** :
- 25-40 ans, profil qualifié (tech, finance, marketing, ingénierie)
- Parle français, anglais professionnel
- Pas forcément à l'aise avec les outils de prospection ou le cold emailing
- Motivée mais peu de temps disponible en dehors de son job actuel
- Ne connaît pas le jargon "sourcing", "pipeline", "outreach"

**Besoins** :
- Trouver des contacts pertinents dans ses pays cibles sans y passer des heures
- Envoyer des emails personnalisés et professionnels sans être spécialiste en copywriting
- Suivre ses démarches sans tableur Excel ou outils compliqués
- Avoir confiance que l'IA fait un travail de qualité (pertinence, personnalisation)

**Frustrations actuelles** :
- Trop d'étapes manuelles dans l'app actuelle
- Des termes techniques qui ne parlent pas ("Sourcing", "Pipeline")
- Doit valider les emails un par un : fastidieux quand il y en a 30+
- Pas de visibilité claire sur l'avancement global de sa recherche

**Critère de succès pour Marie** : "J'ouvre l'app, je lance une recherche, l'IA me trouve des contacts et prépare les emails. Je relis vite fait, j'envoie tout, je suis mes réponses. Simple."

---

## 2. Nouveau flow simplifié

### Principe directeur

L'utilisateur ne devrait avoir que **3 actions principales** dans sa session type :
1. **Lancer** une recherche de contacts
2. **Valider** les emails générés (en masse)
3. **Suivre** les réponses

Tout le reste est automatisé par l'IA.

### Parcours utilisateur complet

#### Etape 0 — Onboarding (premiere connexion uniquement)

```
1. Inscription / Connexion
2. Wizard en 3 etapes :
   a. Infos de base : nom, pays actuel, pays cible(s), secteur(s)
   b. Upload CV → l'IA extrait competences et experience
   c. Affinage conversationnel (2-3 questions IA)
3. Profil cree → redirection Dashboard
```

**Automatisation** : le CV est parse automatiquement, l'IA propose les competences detectees. L'utilisateur valide ou corrige, mais ne saisit rien manuellement.

#### Etape 1 — Lancer une recherche (page "Trouver des contacts")

```
1. L'utilisateur clique "Nouvelle recherche"
2. L'IA pre-remplit tous les parametres depuis le profil :
   - Pays, secteurs, type de roles, sources
3. L'utilisateur ajuste si besoin (optionnel) et valide en 1 clic
4. Le scraping se lance en arriere-plan
5. L'analyse IA de pertinence se declenche AUTOMATIQUEMENT
   des que des contacts sont trouves (pas de bouton "Analyser")
6. La generation d'emails se declenche AUTOMATIQUEMENT
   pour tous les contacts juges pertinents
7. Notification : "42 contacts trouves, 28 pertinents, 28 emails prets"
```

**Changement cle vs V1** : les etapes scraping → analyse → generation d'emails sont chainées automatiquement. L'utilisateur lance UNE action et recupere des emails prets a envoyer.

#### Etape 2 — Valider et envoyer les emails (page "Mes emails")

```
1. L'utilisateur arrive sur la page emails
2. Vue par defaut : liste de tous les brouillons avec preview rapide
3. Actions en masse disponibles immediatement :
   - "Tout selectionner" → "Approuver la selection"
   - Selection manuelle par checkbox
   - Filtres : par pays, par pertinence, par entreprise
4. Possibilite d'ouvrir un email pour le modifier individuellement
5. Les 3 premiers emails d'une nouvelle campagne sont
   presentes un par un pour "eduquer" l'utilisateur au format
6. Bouton "Envoyer les emails approuves" → confirmation → envoi en masse
```

**Changement cle vs V1** : envoi en masse par defaut. La validation un-par-un reste possible mais n'est plus le mode principal.

#### Etape 3 — Suivre ses demarches (page "Suivi")

```
1. Vue kanban avec 5 colonnes :
   - Trouve → A contacter → Contacte → En discussion → Termine
2. Les cartes bougent automatiquement :
   - Email envoye → la carte passe en "Contacte"
   - Reponse recue → la carte passe en "En discussion"
3. L'utilisateur peut manuellement deplacer une carte
4. Clic sur une carte → fiche contact avec historique complet
```

**Changement cle vs V1** : les mouvements dans le kanban sont automatiques. L'utilisateur n'a rien a faire sauf suivre.

#### Dashboard — Hub central

```
1. Resume en un coup d'oeil :
   - Recherches en cours / terminees
   - Emails en attente de validation (avec CTA direct)
   - Reponses recues (avec CTA vers le suivi)
   - Stats globales : contacts, emails envoyes, taux de reponse
2. Actions rapides :
   - "Lancer une nouvelle recherche"
   - "X emails a valider" → lien direct
   - "X reponses non lues" → lien direct
```

---

## 3. Nouvelle navigation

### Sidebar (barre laterale fixe a gauche)

| Icone | Label actuel (V1) | Nouveau label (V2) | Route | Justification |
|-------|-------------------|---------------------|-------|---------------|
| Home | Dashboard | **Tableau de bord** | `/` | Plus naturel en francais |
| User | Profile | **Mon profil** | `/profil` | Possessif = plus personnel |
| Search | Sourcing | **Trouver des contacts** | `/recherche` | Action concrete, comprehensible par tous |
| Users | Contacts | **Mes contacts** | `/contacts` | Possessif = cohérence |
| Mail | Emails | **Mes emails** | `/emails` | Possessif = cohérence |
| Kanban | Pipeline | **Suivi** | `/suivi` | Terme simple, pas de jargon |
| Settings | Settings | **Parametres** | `/parametres` | Francais standard |

### Principes de la navigation

1. **Labels en francais courant** : aucun jargon technique
2. **Possessif ("Mon", "Mes")** : l'utilisateur se sent proprietaire de ses donnees
3. **Verbe d'action pour le sourcing** : "Trouver des contacts" dit exactement ce que ca fait
4. **"Suivi" au lieu de "Pipeline"** : tout le monde comprend "suivi"
5. **Position du menu** : sidebar fixe a gauche, parametres en bas (convention etablie)

### Badge de notification dans la sidebar

- **Mes emails** : badge avec le nombre de brouillons en attente de validation
- **Suivi** : badge avec le nombre de reponses non lues

---

## 4. User stories

### Feature 1 : Navigation et labels user-friendly

**Priorite** : Must-have

#### US-1.1 : Renommage de la navigation
> En tant qu'utilisateur, je veux voir des labels clairs et en francais dans la navigation, afin de comprendre immediatement ou aller.

**Criteres d'acceptation** :
- [ ] La sidebar affiche les labels V2 (Tableau de bord, Mon profil, Trouver des contacts, Mes contacts, Mes emails, Suivi, Parametres)
- [ ] Les routes sont mises a jour (`/sourcing` → `/recherche`, `/pipeline` → `/suivi`, etc.)
- [ ] Les anciennes routes redirigent vers les nouvelles (redirect 301)
- [ ] Les breadcrumbs et titres de pages suivent les nouveaux labels

#### US-1.2 : Badges de notification dans la sidebar
> En tant qu'utilisateur, je veux voir des badges de notification a cote de "Mes emails" et "Suivi" pour savoir quand une action m'attend.

**Criteres d'acceptation** :
- [ ] Badge numerique sur "Mes emails" = nombre de brouillons a valider
- [ ] Badge numerique sur "Suivi" = nombre de reponses non lues
- [ ] Les badges disparaissent quand il n'y a rien en attente
- [ ] Les compteurs se mettent a jour en temps reel (ou au changement de page)

---

### Feature 2 : Automatisation du flow recherche → emails

**Priorite** : Must-have

#### US-2.1 : Chainement automatique scraping → analyse → generation
> En tant qu'utilisateur, je veux que lancer une recherche declenche automatiquement l'analyse IA et la generation d'emails, afin de ne pas avoir a cliquer sur 3 boutons differents.

**Criteres d'acceptation** :
- [ ] Apres le scraping, l'analyse IA se lance automatiquement sans intervention
- [ ] Apres l'analyse, la generation d'emails se lance automatiquement pour les contacts pertinents
- [ ] L'utilisateur voit une barre de progression unifiee (scraping → analyse → generation)
- [ ] En cas d'erreur sur une etape, les etapes precedentes restent valides
- [ ] Une notification est envoyee quand tout est termine : "X contacts, Y pertinents, Z emails prets"

#### US-2.2 : Pre-remplissage intelligent des parametres de recherche
> En tant qu'utilisateur, je veux que les parametres de ma recherche soient pre-remplis depuis mon profil, afin de lancer une recherche en 1 clic.

**Criteres d'acceptation** :
- [ ] Pays, secteurs, roles sont pre-remplis depuis le profil utilisateur
- [ ] Les sources de scraping sont cochees automatiquement selon le pays selectionne
- [ ] L'utilisateur peut modifier tous les parametres avant de valider
- [ ] Un bouton "Lancer" suffit pour demarrer (pas de navigation multi-etapes)

---

### Feature 3 : Envoi d'emails en masse

**Priorite** : Must-have

#### US-3.1 : Selection et approbation en masse
> En tant qu'utilisateur, je veux pouvoir selectionner et approuver plusieurs emails d'un coup, afin de ne pas passer 30 minutes a valider un par un.

**Criteres d'acceptation** :
- [ ] Checkbox "Tout selectionner" en haut de la liste
- [ ] Selection individuelle par checkbox sur chaque email
- [ ] Bouton "Approuver la selection" visible des qu'au moins 1 email est selectionne
- [ ] Bouton "Rejeter la selection" egalement disponible
- [ ] Preview rapide (sujet + 2 premieres lignes) visible dans la liste sans ouvrir l'email
- [ ] Compteur dynamique : "X/Y emails selectionnes"

#### US-3.2 : Envoi en masse des emails approuves
> En tant qu'utilisateur, je veux envoyer tous mes emails approuves en un clic, afin d'etre efficace.

**Criteres d'acceptation** :
- [ ] Bouton "Envoyer les emails approuves (X)" bien visible
- [ ] Modale de confirmation avant envoi : "Vous allez envoyer X emails. Confirmer ?"
- [ ] Envoi en arriere-plan avec barre de progression
- [ ] Notification de fin : "X emails envoyes avec succes"
- [ ] En cas d'echec partiel : liste des emails en erreur avec raison

#### US-3.3 : Filtres sur la liste d'emails
> En tant qu'utilisateur, je veux filtrer mes emails par pays, pertinence ou statut, afin de traiter les lots qui m'interessent.

**Criteres d'acceptation** :
- [ ] Filtre par pays du contact
- [ ] Filtre par score de pertinence (tres pertinent, pertinent, peu pertinent)
- [ ] Filtre par statut (brouillon, approuve, envoye, erreur)
- [ ] Les filtres sont combinables
- [ ] Le compteur de selection se met a jour selon les filtres actifs

---

### Feature 4 : Dashboard repense

**Priorite** : Must-have

#### US-4.1 : Actions en attente sur le dashboard
> En tant qu'utilisateur, je veux voir immediatement mes actions en attente quand j'ouvre l'app, afin de savoir quoi faire.

**Criteres d'acceptation** :
- [ ] Section "Actions en attente" en haut du dashboard
- [ ] Affiche : nombre d'emails a valider (lien vers Mes emails)
- [ ] Affiche : nombre de reponses non lues (lien vers Suivi)
- [ ] Affiche : recherches en cours avec progression
- [ ] Chaque action est cliquable et mene a la page correspondante
- [ ] Si aucune action en attente : message encourageant + CTA "Lancer une recherche"

#### US-4.2 : Stats globales sur le dashboard
> En tant qu'utilisateur, je veux voir mes statistiques globales pour mesurer mes progres.

**Criteres d'acceptation** :
- [ ] Nombre total de contacts trouves
- [ ] Nombre d'emails envoyes
- [ ] Taux de reponse (%)
- [ ] Nombre d'entretiens obtenus
- [ ] Les stats couvrent toutes les campagnes (pas seulement la derniere)

---

### Feature 5 : Mouvement automatique dans le kanban

**Priorite** : Must-have

#### US-5.1 : Detection IA automatique des evenements dans les emails
> En tant qu'utilisateur, je veux que l'IA analyse automatiquement les reponses recues et detecte les evenements importants (entretien propose, refus, offre, demande d'infos), afin que le kanban se mette a jour sans que j'aie a intervenir.

**Criteres d'acceptation** :
- [ ] Email envoye → contact passe automatiquement de "A contacter" a "Contacte"
- [ ] Reponse recue → l'IA analyse le contenu et detecte l'evenement :
  - Demande d'informations → reste "En discussion"
  - Entretien propose → passe en "Entretien"
  - Refus → passe en "Termine (refuse)"
  - Offre → passe en "Termine (offre)"
  - Reponse positive sans entretien → reste "En discussion"
- [ ] A chaque mouvement automatique, une notification informe l'utilisateur :
  "Marie Dupont (TechCorp) vous propose un entretien. [Voir] [Corriger]"
- [ ] L'utilisateur peut corriger la detection en un clic (dropdown de statut)
- [ ] L'utilisateur peut toujours deplacer manuellement une carte (drag & drop)
- [ ] Un historique des mouvements (automatiques et manuels) est visible sur la fiche contact

#### US-5.2 : Vue kanban enrichie avec labels user-friendly
> En tant qu'utilisateur, je veux que les colonnes du kanban reflètent les étapes réelles de ma recherche d'emploi.

**Criteres d'acceptation** :
- [ ] 6 colonnes : Trouve / A contacter / Contacte / En discussion / Entretien / Termine
- [ ] Sous-statuts de "Termine" : Offre recue, Refuse, Abandon
- [ ] Chaque colonne affiche un compteur de cartes
- [ ] Les cartes affichent : nom, role, entreprise, badge pertinence, indicateur "non lu" si reponse
- [ ] Filtres disponibles : par source, par pertinence, par campagne, par entreprise
- [ ] Les cartes dans "Entretien" affichent la date de l'entretien si detectee par l'IA

#### US-5.3 : Blocage contact ou entreprise apres un refus
> En tant qu'utilisateur, je veux pouvoir bloquer un contact ou une entreprise entiere apres un refus, afin de ne pas recontacter des gens qui m'ont deja dit non.

**Criteres d'acceptation** :
- [ ] Quand un contact passe en "Termine → Refuse" (automatiquement ou manuellement), une modale s'affiche :
  - Option 1 : "Bloquer ce contact uniquement" (on peut encore contacter d'autres personnes dans l'entreprise)
  - Option 2 : "Bloquer toute l'entreprise [nom]" (plus aucun contact de cette entreprise ne sera inclus)
  - Choix de la duree : 6 mois / 12 mois / 2 ans / Definitivement
- [ ] Les contacts/entreprises bloques sont exclus automatiquement du flow d'envoi en masse
- [ ] Les contacts/entreprises bloques sont signales visuellement si retrouves lors d'une nouvelle recherche
- [ ] Une section "Blocages" dans les Parametres permet de gerer la liste (debloquer, modifier la duree)
- [ ] Quand le blocage expire, le contact redevient "relancable" (meme logique que le cooldown F7)

---

### Feature 6 : Gestion des reponses et conversations

**Priorite** : Must-have

#### US-6.1 : Visualisation des reponses recues
> En tant qu'utilisateur, je veux voir les reponses a mes emails directement dans l'app, afin de ne pas devoir basculer sur Gmail/Outlook.

**Criteres d'acceptation** :
- [ ] Les reponses recues sont recuperees automatiquement (IMAP polling ou webhook)
- [ ] Dans le Suivi (kanban), les cartes "En discussion" affichent un indicateur "reponse non lue"
- [ ] Clic sur la carte → fiche contact avec le thread complet (mes emails + ses reponses)
- [ ] Badge "reponses non lues" dans la sidebar sur "Suivi"
- [ ] Notification toast quand une nouvelle reponse arrive

#### US-6.2 : Resume IA des echanges
> En tant qu'utilisateur, je veux un resume rapide de mes echanges avec chaque contact, afin de savoir en 5 secondes ou en est la conversation.

**Criteres d'acceptation** :
- [ ] La fiche contact affiche un resume IA de la conversation (2-3 lignes)
- [ ] Le resume est mis a jour automatiquement a chaque nouvel echange
- [ ] Le resume inclut : sujet principal, ton de la reponse (positif/neutre/negatif), prochaine action suggeree
- [ ] Dans "Mes contacts", un indicateur visuel montre les contacts avec echanges en cours

#### US-6.3 : Generation IA de reponses
> En tant qu'utilisateur, je veux que l'IA me propose une reponse adaptee quand je recois un message, afin de repondre vite et bien.

**Criteres d'acceptation** :
- [ ] Quand une reponse est recue, l'IA genere automatiquement une suggestion de reponse
- [ ] La suggestion prend en compte : le contexte de la conversation, le profil utilisateur, le ton du contact
- [ ] L'utilisateur peut : valider tel quel, modifier, regenerer avec des instructions, ou ecrire manuellement
- [ ] L'historique complet de la conversation est utilise comme contexte pour la generation
- [ ] Le ton et le style respectent les parametres de generation de l'utilisateur

---

### Feature 7 : Protection anti-doublon et cooldown de recontact

**Priorite** : Must-have

#### US-7.1 : Detection des contacts deja contactes
> En tant qu'utilisateur, je veux que l'app m'empeche de recontacter quelqu'un comme si c'etait la premiere fois, afin d'eviter de paraitre non professionnel.

**Criteres d'acceptation** :
- [ ] Lors d'une nouvelle recherche, les contacts deja contactes sont identifies et marques visuellement
- [ ] Un contact deja contacte ne peut PAS etre ajoute au flow d'envoi de premier contact
- [ ] L'utilisateur voit un badge "Deja contacte le [date]" sur les contacts concernes
- [ ] Un message explicatif informe l'utilisateur : "Ce contact a deja ete contacte. Vous pourrez le relancer apres [date selon cooldown]."

#### US-7.2 : Cooldown de recontact configurable
> En tant qu'utilisateur, je veux definir un delai minimum avant de pouvoir relancer un contact, afin de respecter les usages professionnels.

**Criteres d'acceptation** :
- [ ] Parametre configurable dans les Parametres : delai de recontact (3 mois, 6 mois, 1 an, personnalise)
- [ ] Valeur par defaut : 6 mois
- [ ] Apres expiration du cooldown, le contact devient "relancable" mais pas "nouveau"
- [ ] L'email de relance est genere differemment : il fait reference au premier contact ("Je vous avais contacte il y a quelques mois...")
- [ ] L'IA a acces a l'historique des echanges precedents pour adapter le contenu

---

### Feature 8 : Templates et parametres de generation d'emails

**Priorite** : Must-have

#### US-8.1 : Templates d'emails personnalisables
> En tant qu'utilisateur, je veux creer mes propres templates d'emails, afin que l'IA genere des emails dans le style qui me convient.

**Criteres d'acceptation** :
- [ ] L'utilisateur peut creer, modifier, supprimer des templates
- [ ] Un template contient : nom, sujet type, corps avec placeholders ({{prenom}}, {{entreprise}}, {{poste}}, etc.)
- [ ] Templates par defaut fournis : "Premier contact", "Relance", "Reponse a une offre"
- [ ] L'IA utilise le template comme base et le personnalise pour chaque contact
- [ ] L'utilisateur peut choisir quel template utiliser lors du lancement d'une recherche

#### US-8.2 : Parametres avances de generation (style Hunter)
> En tant qu'utilisateur, je veux ajuster le ton, la longueur et le style de mes emails, afin d'adapter ma communication a ma strategie.

**Criteres d'acceptation** :
- [ ] Slider de longueur : Court ←→ Long (3 a 5 niveaux)
- [ ] Choix du framework : AIDA, PAS, BAB, direct (avec tooltip explicatif pour chaque)
- [ ] Choix de la langue : automatique (selon pays du contact) ou forcee (FR, EN, etc.)
- [ ] Ton : professionnel, decontracte, enthousiaste (ou curseur)
- [ ] Instructions personnalisees libres (textarea) : ex. "Mentionne toujours mon experience en startup"
- [ ] Ces parametres sont sauvegardables en tant que "preset" reutilisable
- [ ] Les parametres s'appliquent a la generation en masse ET a la generation individuelle
- [ ] Preview en temps reel : un email exemple se met a jour quand on change les parametres

---

### Feature 9 : Onboarding guide (premiere connexion)

**Priorite** : Should-have

#### US-9.1 : Wizard onboarding en 3 etapes
> En tant que nouvel utilisateur, je veux etre guide pas a pas pour configurer mon profil, afin de ne pas etre perdu.

**Criteres d'acceptation** :
- [ ] Indicateur de progression (etape 1/3, 2/3, 3/3)
- [ ] Etape 1 : pays actuel, pays cible(s), secteur(s)
- [ ] Etape 2 : upload CV avec parsing IA automatique
- [ ] Etape 3 : affinage conversationnel IA (2-3 questions)
- [ ] A la fin : redirection vers le dashboard avec message de bienvenue
- [ ] Le dashboard propose immediatement de lancer la premiere recherche

#### US-9.2 : Education progressive sur les emails
> En tant que nouvel utilisateur, je veux voir les 3 premiers emails un par un avant de passer au mode masse, afin de comprendre le format et la qualite.

**Criteres d'acceptation** :
- [ ] Lors de la premiere campagne, les 3 premiers emails sont presentes en mode "guided review"
- [ ] Chaque email est affiche en plein ecran avec les infos du contact
- [ ] Actions : Approuver / Modifier / Rejeter
- [ ] Apres le 3eme, transition vers la vue liste avec message explicatif
- [ ] Ce mode ne se declenche qu'une fois (premiere campagne)

---

### Feature 10 : Page "Mon profil" amelioree

**Priorite** : Should-have

#### US-10.1 : Edition du profil simplifiee
> En tant qu'utilisateur, je veux modifier mon profil facilement pour ajuster mes recherches.

**Criteres d'acceptation** :
- [ ] Sections claires : informations personnelles, competences, experience, cibles
- [ ] Edition inline (pas de formulaire separe)
- [ ] Re-upload de CV possible a tout moment
- [ ] Les modifications du profil impactent les pre-remplissages des prochaines recherches
- [ ] Indication visuelle de la completude du profil (%)

---

### Feature 11 : Adaptation culturelle des emails

**Priorite** : Should-have

#### US-11.1 : Emails adaptes a la culture du pays cible
> En tant qu'utilisateur, je veux que les emails generes soient adaptes aux conventions du pays du destinataire, afin d'augmenter mon taux de reponse.

**Criteres d'acceptation** :
- [ ] L'IA prend en compte le pays du contact pour adapter le ton et le format
- [ ] Les conventions de salutation/conclusion suivent les normes locales
- [ ] La langue de l'email est adaptee au pays (anglais pour Australie, francais pour Quebec, etc.)
- [ ] L'utilisateur peut ajouter des instructions personnalisees pour la generation

---

### Feature 12 : Notifications et feedback temps reel

**Priorite** : Could-have

#### US-12.1 : Notifications in-app pour les evenements importants
> En tant qu'utilisateur, je veux etre notifie quand quelque chose d'important se passe (recherche terminee, reponse recue), meme si je suis sur une autre page.

**Criteres d'acceptation** :
- [ ] Toast notification quand une recherche se termine
- [ ] Toast notification quand une reponse est recue
- [ ] Les notifications sont non intrusives (coin inferieur droit, disparaissent apres 5s)
- [ ] Clic sur la notification mene a la page concernee

#### US-12.2 : Barre de progression temps reel
> En tant qu'utilisateur, je veux voir la progression de mes taches en cours en temps reel.

**Criteres d'acceptation** :
- [ ] Barre de progression pour le scraping (par source)
- [ ] Barre de progression pour l'analyse IA (X/Y contacts analyses)
- [ ] Barre de progression pour la generation d'emails (X/Y generes)
- [ ] Barre de progression pour l'envoi en masse (X/Y envoyes)
- [ ] Les barres se mettent a jour via WebSocket ou SSE

---

### Feature 13 : Parametres simplifies

**Priorite** : Could-have

#### US-13.1 : Page parametres reorganisee
> En tant qu'utilisateur, je veux une page parametres claire et organisee.

**Criteres d'acceptation** :
- [ ] Section "Compte" : email, mot de passe
- [ ] Section "Preferences" : langue (FR/EN), theme (clair/sombre/systeme)
- [ ] Section "Connexion email" : configuration SMTP ou OAuth pour l'envoi
- [ ] Section "IA" : choix du modele, instructions personnalisees pour les emails
- [ ] Chaque section est independante (sauvegarde individuelle)

---

### Feature 14 : Positionnement expert et assistant IA

**Priorite** : Must-have

#### Vision
ExpatHunter n'est pas un simple outil d'emailing — c'est un **expert en recherche d'emploi a l'etranger** qui accompagne l'utilisateur a chaque etape. L'utilisateur doit sentir qu'il a un conseiller personnel a ses cotes, pas qu'il utilise un logiciel. L'objectif : que l'utilisateur recommande l'app en disant "c'est comme avoir un expert en expatriation pro qui fait tout pour toi".

#### Principes de design du positionnement expert
1. **Omnipresent mais discret** — l'expertise est partout mais ne bloque jamais le flow
2. **Contextuel** — chaque conseil est lie a ce que l'utilisateur fait ICI et MAINTENANT
3. **Credible** — chaque info cite sa source et sa date. Pas de "je pense que...", mais "d'apres les donnees Seek du 15 mars..."
4. **Actionnable** — chaque conseil mene a une action concrete ("Envoyez mardi 9h NZST" plutot que "choisissez le bon moment")
5. **Personnalise** — les conseils prennent en compte le profil, l'historique, les resultats passes de l'utilisateur

#### US-14.1 : Snapshot marche sur la page recherche
> En tant qu'utilisateur, je veux voir un resume du marche de l'emploi dans mon pays/secteur cible quand je lance une recherche, afin de me sentir informe et confiant.

**Priorite** : Must-have

**Criteres d'acceptation** :
- [ ] En haut de la page "Trouver des contacts", un encart affiche un snapshot du marche :
  - Tendance du secteur dans le pays (en croissance / stable / en baisse)
  - Meilleure periode pour postuler
  - Nombre d'offres actives estimees
  - Salaire moyen pour le type de poste cible
- [ ] Le snapshot est mis a jour depuis le cache (pas de requete a chaque visite)
- [ ] Ton expert : "Le secteur tech en Nouvelle-Zelande affiche +12% d'embauches en 2025. Les startups d'Auckland recrutent activement des frontend developers. Fevrier-avril est la meilleure periode."
- [ ] Le snapshot change dynamiquement quand l'utilisateur modifie le pays ou le secteur

#### US-14.2 : Micro-conseils contextuels (bulles expert)
> En tant qu'utilisateur, je veux recevoir des conseils d'expert a des moments cles de mon parcours, afin de maximiser mes chances sans avoir a chercher l'information.

**Priorite** : Must-have

**Criteres d'acceptation** :
- [ ] Les conseils apparaissent sous forme de petites bulles/bandeaux discrets aux endroits strategiques :
  - **Page emails** — timing optimal d'envoi : "Meilleur moment pour envoyer en NZ : mardi 9h NZST (lundi 21h Paris)"
  - **Page emails** — qualite du mail : "Conseil : les recruteurs kiwis preferent un ton decontracte et direct"
  - **Fiche contact** — insight entreprise : "TechCorp : 250 employes, levee de fonds 2025, sponsor visa confirme"
  - **Kanban → Entretien** — preparation : "En NZ, preparez-vous aux questions sur le 'cultural fit'. 3 conseils..."
  - **Kanban → Refuse** — encouragement + conseil : "Un refus chez TechCorp ne bloque pas les autres services. 4 autres contacts disponibles."
  - **Dashboard** — stats comparatives : "Votre taux de reponse : 18% — Moyenne ExpatHunter NZ tech : 15%. Vous etes au-dessus !"
  - **Profil** — positionnement : "Avec 9 ans d'experience React, vous etes dans le top 10% des profils ciblant la NZ tech."
  - **Apres envoi** — do's & don'ts culturels : "En NZ, ne relancez pas avant 5-7 jours ouvres."
- [ ] Chaque bulle est fermable individuellement
- [ ] L'utilisateur peut desactiver un type de conseil ("Ne plus afficher les conseils timing")
- [ ] Les conseils ne s'affichent qu'une fois par session sauf s'ils changent (pas de repetition)
- [ ] Maximum 1 conseil visible a la fois par page (pas de surcharge)

#### US-14.3 : Score de confiance sur les contacts
> En tant qu'utilisateur, je veux voir un score de confiance explique sur chaque contact, afin de prioriser mes efforts.

**Priorite** : Must-have

**Criteres d'acceptation** :
- [ ] Chaque contact affiche un score de confiance (ex: 92%) avec une explication courte
- [ ] L'explication cite les facteurs positifs : "Poste ouvert, entreprise en croissance, sponsor visa confirme"
- [ ] Et les facteurs de risque : "Pas d'email direct trouve, contenu LinkedIn limite"
- [ ] Le score influence l'ordre de presentation dans la liste des contacts et des emails
- [ ] Le score est visible sur la carte kanban, la liste contacts, et la fiche contact

#### US-14.4 : Chat dual (support + expert)
> En tant qu'utilisateur, je veux un seul chat pour poser des questions sur l'app OU sur ma recherche d'emploi, afin d'avoir un point d'entree unique.

**Priorite** : Must-have

**Criteres d'acceptation** :
- [ ] Bouton flottant (coin inferieur droit) accessible depuis toutes les pages
- [ ] Panneau chat lateral qui s'ouvre sans quitter la page en cours
- [ ] Le chat repond a deux types de questions avec routing automatique :
  - **Support app** : "Comment lancer une recherche ?" → reponse avec lien vers la page + etapes
  - **Expert metier** : "Quel visa pour la NZ ?" → reponse experte avec sources et dates
  - **Mixte** : "Comment ameliorer mes emails pour la NZ ?" → conseils expert + lien vers les parametres de generation
- [ ] L'assistant a le contexte de la page courante (contact, email, recherche...)
- [ ] Suggestions de questions rapides basees sur le contexte :
  - Sur la page emails : "Ameliorer le ton de cet email", "Quel est le meilleur moment pour envoyer ?"
  - Sur la fiche contact : "Que sais-tu sur TechCorp ?", "Cette entreprise sponsorise-t-elle les visas ?"
  - Sur le kanban : "Conseils pour preparer mon entretien", "Pourquoi ce contact est en discussion ?"
- [ ] L'assistant peut executer des actions : "Regenere cet email plus court", "Passe ce contact en priorite"
- [ ] L'historique de conversation est conserve pendant la session
- [ ] Ton de l'assistant : expert bienveillant, pas robot. Utilise "je vous recommande" pas "veuillez"

#### US-14.5 : Expert marche cible (pays + secteur)
> En tant qu'utilisateur, je veux des informations detaillees sur le marche de l'emploi du pays que je cible.

**Priorite** : Should-have

**Criteres d'acceptation** :
- [ ] Donnees marche alimentees par sources externes (web search, donnees publiques) et cachees localement
- [ ] Contexte injecte automatiquement dans la generation d'emails
- [ ] Informations disponibles : tendances embauche, entreprises qui recrutent, salaires, culture d'entreprise
- [ ] Mise a jour periodique (cache 7 jours — voir F15)

#### US-14.6 : Expert visa et immigration
> En tant qu'utilisateur, je veux des informations sur les visas de travail du pays que je cible.

**Priorite** : Should-have

**Criteres d'acceptation** :
- [ ] Types de visas disponibles selon le pays cible et le profil utilisateur
- [ ] Conditions d'eligibilite, duree, demarches principales
- [ ] Liens vers les sources officielles (sites gouvernementaux)
- [ ] Conseil proactif si pertinent : "TechCorp sponsorise les visas de travail"
- [ ] Donnees cachees (TTL 90 jours — voir F15)

#### US-14.7 : Coach carriere
> En tant qu'utilisateur, je veux des conseils sur mon CV et mon positionnement.

**Priorite** : Could-have

**Criteres d'acceptation** :
- [ ] Analyse du CV avec suggestions d'amelioration
- [ ] Conseils de positionnement selon le pays/secteur cible
- [ ] Suggestions de competences a mettre en avant selon les offres du marche
- [ ] Accessible via le panneau assistant

---

### Feature 15 : Cache d'intelligence et enrichissement

**Priorite** : Must-have (cache), Should-have (enrichissement avance)

#### Principe
Chaque information recuperee depuis des sources externes (Apify, Hunter, Perplexity, Google, APIs publiques) est cachee en base de donnees avec une date d'expiration. Cela evite de depenser des tokens/credits inutilement et accelere l'app.

**⚠ Note pour l'architecte** : l'enrichissement des donnees contacts/entreprises est un chantier majeur prevu pour apres le redesign V2. L'architecture du cache doit etre concue pour supporter un enrichissement progressif (nouvelles sources, nouvelles donnees) sans refonte.

#### US-15.1 : Cache des donnees externes
> En tant que systeme, je veux cacher les donnees recuperees depuis des sources externes, afin de ne pas relancer des requetes couteuses inutilement.

**Priorite** : Must-have

**Criteres d'acceptation** :
- [ ] Chaque donnee externe est stockee en base avec : source, date de recuperation, date d'expiration, donnees brutes
- [ ] Avant toute requete externe, le cache est consulte. Si les donnees sont fraiches → pas de requete
- [ ] Durees d'expiration configurables par type de donnee :
  - Infos entreprise : 30 jours
  - Infos contact (email, poste) : 14 jours
  - Donnees marche/pays : 7 jours
  - Infos visa : 90 jours
- [ ] Un contact retrouve lors d'une nouvelle recherche reutilise les donnees cachees (pas de re-scraping)
- [ ] Dashboard admin : vue sur le cache (taille, taux de hit, economies estimees en tokens/credits)

#### US-15.2 : Enrichissement progressif des contacts et entreprises
> En tant que systeme, je veux enrichir progressivement les fiches contacts et entreprises avec des donnees provenant de multiples sources.

**Priorite** : Should-have (architecture maintenant, sources supplementaires plus tard)

**Criteres d'acceptation** :
- [ ] Architecture extensible : chaque source d'enrichissement est un "provider" independant
- [ ] Providers prevus (a implementer progressivement) :
  - Scraper (Apify) : donnees de base (nom, role, entreprise)
  - Hunter.io : email verifie
  - Recherche web (Perplexity/Google) : infos entreprise, actualites, taille, secteur
  - LinkedIn (futur) : profil detaille
  - Sites gouvernementaux : infos visa par pays
- [ ] Chaque provider ecrit dans le cache avec sa source et sa fraicheur
- [ ] Les donnees de multiples providers sont fusionnees dans une fiche contact/entreprise unifiee
- [ ] La fiche affiche la source et la date de chaque information ("via Hunter, il y a 3 jours")
- [ ] Les providers ne sont appeles que si les donnees cachees sont expirees ou absentes

#### US-15.3 : Contexte enrichi pour la generation IA
> En tant que systeme, je veux fournir un maximum de contexte enrichi a l'IA lors de la generation d'emails et de conseils, afin d'augmenter la pertinence.

**Priorite** : Must-have

**Criteres d'acceptation** :
- [ ] Lors de la generation d'un email, le prompt IA recoit :
  - Profil complet de l'utilisateur (CV, competences, experience)
  - Fiche contact enrichie (nom, poste, anciennete, historique d'echanges)
  - Fiche entreprise enrichie (taille, secteur, actualites, programmes visa)
  - Contexte marche du pays cible (tendances, culture, periode de recrutement)
  - Template et parametres de generation choisis par l'utilisateur
  - Historique des echanges precedents avec ce contact (si relance)
- [ ] Le contexte est assemble depuis le cache — pas de requetes externes au moment de la generation
- [ ] Les tokens sont optimises : le contexte est resume/tronque intelligemment pour rester dans les limites du modele

---

## 5. Recapitulatif des priorites (MoSCoW)

| Priorite | Features |
|----------|----------|
| **Must-have** | F1 Navigation, F2 Automatisation flow, F3 Envoi en masse, F4 Dashboard, F5 Kanban intelligent, F6 Gestion reponses, F7 Anti-doublon/cooldown, F8 Templates/parametres generation, F14 Positionnement expert (snapshot marche, micro-conseils, score confiance, chat dual), F15 Cache d'intelligence (cache + contexte enrichi) |
| **Should-have** | F9 Onboarding, F10 Profil, F11 Adaptation culturelle, F14.5 Expert marche, F14.6 Expert visa, F15.2 Enrichissement progressif |
| **Could-have** | F12 Notifications temps reel, F13 Parametres simplifies, F14.7 Coach carriere |
| **Won't-have** | Voir section Hors-scope |

---

## 6. Hors-scope

Les elements suivants ne seront **pas** traites dans ce redesign V2 :

| Element | Raison |
|---------|--------|
| Application mobile native | Le redesign concerne le web. L'architecture reste compatible mobile (design system partage) mais pas de dev mobile dans ce scope. |
| Multi-utilisateur / equipes | L'app reste mono-utilisateur pour cette version. Pas de partage de contacts ou de collaboration. |
| Nouveaux scrapers / nouvelles sources | Le redesign est un chantier UX/frontend. L'ajout de scrapers (LinkedIn global, Europe, Ameriques) est un chantier backend separe. |
| CRM avance | Le kanban "Suivi" reste simple (5 colonnes). Pas de gestion de taches, rappels, calendrier, ou integration CRM externe. |
| Relances automatiques | Les relances (follow-up sequences) ne sont pas automatisees dans ce redesign. L'utilisateur peut relancer manuellement via la generation IA de reponses (F6). Les sequences de relance automatiques sont prevues pour une version ulterieure. |
| Facturation / abonnement | Pas de systeme de paiement ou de plans dans ce scope. |
| Analytics avances | Les stats du dashboard restent basiques. Pas de graphiques temporels, d'export CSV, ou de rapports detailles. |
| Internationalisation complete | L'app reste en francais et anglais. Pas d'ajout de nouvelles langues dans ce scope (mais l'architecture i18n est preservee). |
| Refonte backend / API | Le redesign est essentiellement un chantier frontend et UX. L'API backend est adaptee a la marge (nouveaux endpoints pour le chainement automatique et l'envoi en masse) mais pas de refonte architecturale. |
| Tests A/B ou personnalisation UI | Pas de mecanisme de tests A/B ou de personnalisation de l'interface par utilisateur. |

---

## Annexe : Mapping ancien → nouveau

| Concept V1 | Concept V2 | Impact technique |
|------------|------------|------------------|
| Sourcing (page) | Trouver des contacts | Rename route + label |
| Pipeline (page) | Suivi | Rename route + label |
| Bouton "Analyser tout" (Contacts) | Supprime — automatique | Chainement dans le job queue |
| Validation email un par un | Validation en masse (defaut) | Nouveau composant liste + actions batch |
| 3 actions separees (scraper → analyser → generer) | 1 action unique "Lancer" | Orchestration backend (job chain) |
| Settings en anglais | Parametres en francais | i18n labels |
| Dashboard generique | Dashboard avec actions en attente | Nouveau layout + queries backend |
| Pas de gestion des reponses | Thread complet + resume IA + reponse suggeree | IMAP polling, parsing thread, generation IA contextuelle |
| Pas de deduplication contacts | Anti-doublon + cooldown configurable | Flag "deja contacte" en DB, parametres utilisateur |
| Pas de templates | Templates + parametres de generation (longueur, ton, framework) | CRUD templates, presets, preview temps reel |
| Email envoye = fin du flow | Email envoye = debut de la conversation | Boucle complete : envoi → reception → resume → reponse suggeree |
| Pas d'assistant IA | Assistant multi-expert unifie (recrutement, marche, visa) | Panneau chat + conseils proactifs contextuels, routing automatique entre expertises |
| Pas de cache donnees | Cache d'intelligence avec expiration par type | Table cache en DB, providers extensibles, contexte enrichi pour generation IA |
| Requetes externes a chaque action | Cache-first : requete externe uniquement si cache expire | Economies tokens/credits, architecture provider extensible |
