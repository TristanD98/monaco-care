# Conducteur de Projet — Monaco Care
*Historique de suivi des développements et évolutions de l'application.*

### 23 Avril 2026 à 19:25 — SPRINT 2 : Phase 1 (Le Flux d'Actualité)
- **Ce que l'on cherchait à accomplir :** 
  Faire en sorte que le panneau central de l'application (le fameux "Flux", là où tout le monde poste des nouvelles du patient) arrête d'être une simple démo vide. Il fallait que les messages s'enregistrent pour de vrai sur Internet dans notre coffre-fort de données sécurisé (Google Firebase).
- **Comment on a fait, étape par étape :**
  1. **L'envoi et la Sauvegarde** : Quand un kiné, une infirmière ou la famille écrit un message et appuie sur « Envoyer », l'application prend ce texte, rajoute la date avec précision, et l'envoie voler directement sur les serveurs sécurisés de Firebase dans un tiroir appelé "posts".
  2. **La Magie du Temps Réel** : Plutôt que de forcer les gens à "rafraîchir" la page pour voir s'il y a un nouveau message, j'ai mis en place un écouteur automatique. C'est comme un radar : dès qu'un message arrive dans le serveur Firebase, tous les téléphones et ordinateurs connectés au patient se mettent à jour d'un seul coup, sans que tu aies besoin de cliquer sur quoi que ce soit.
  3. **Protection des secrets médicaux** : Quand on écrit un message, on choisit une "catégorie" (Public, Médical, Médical et Famille, ou juste Famille). J'ai configuré la base de données pour qu'elle retienne cette étiquette. De plus, on s'est assuré que la famille ne voie jamais un message tagué "Réservé au corps médical", pour garder le secret médical.

### 23 Avril 2026 à 19:43 — SPRINT 2 : Phase 2 (Le Chat Privé)
- **Ce que l'on cherchait à accomplir :** 
  Créer la fonctionnalité "SMS" de l'application. Il fallait que si un kiné veut discuter en tête-à-tête avec la fille du patient, il puisse le faire sans que tout le monde ne lise la conversation, un peu comme WhatsApp.
- **Comment on a fait, étape par étape :**
  1. **Qui est dans la boucle ?** : Avant, la liste des gens dans l'onglet Chat était fausse (c'était toujours Marc, Sarah, etc.). J'ai connecté l'onglet à la Base de Données. Maintenant, quand tu vas sur "Chat", l'application demande au serveur : *"Donne-moi le listing exact de TOUS les professionnels et membres de la famille qui ont été embauchés pour s'occuper de CE patient précisément."*
  2. **Création des Salons Secrets** : Quand tu cliques sur le nom de quelqu'un, ça t'ouvre la discussion. L'application vérifie ton identité, regarde avec qui tu veux parler, et crée une clé unique (la "Room") dans le serveur Firebase.
  3. **Discours en Temps Réel** : Comme pour le flux, dès que tu envoies *"Bonjour, comment va la jambe aujourd'hui ?"*, le SMS part sur Firebase, et est instantanément renvoyé sur l'écran du destinataire, avec l'heure d'envoi.

### 23 Avril 2026 à 19:48 — SPRINT 2 : Phase 3 (Le Coffre Fort Médical)
- **Ce que l'on cherchait à accomplir :** 
  Concrétiser le "dossier médical numérique" protégé par l'empreinte digitale ou FaceID. Remplacer les fausses courbes de tension par les vraies constantes du patient.
- **Comment on a fait, étape par étape :**
  1. **Sauvegarde des Constantes Vitales** : J'ai créé de nouveaux tiroirs dédiés dans Firebase pour la Tension, le Pouls et la Température. Désormais, quand on clique sur "Saisir", tout est expédié dans le cloud.
  2. **Surveillance Intelligente (Alertes)** : L'application analyse ce que tu as tapé ! Si tu tapes "39" de température, le système comprend qu'il s'agit de fièvre, teinte la petite carte de température en rouge, et met le statut "À surveiller".
  3. **L'échelle de Douleur** : Idem, tu peux désormais dicter la localisation d'une douleur et mettre une note de 1 à 10. Le programme calcule le danger et met une couleur correspondante. 
  4. **Traçabilité stricte (La main courante)** : C'est très important en médecine de savoir qui a fait quoi. J'ai programmé une fonction automatique : chaque fois qu'un rythme cardiaque, une tension ou une douleur est enregistrée, l'application écrit silencieusement un "compte-rendu" dans l'historique des *Notes Cliniques* (par exemple : "Le kiné a pris la tension à 14h12 : Résultat 120/80").
  5. **Dernier Verrou de sécurité** : Même si le Coffre Fort a été déverrouillé, si la personne navigue en tant que "Famille", le système efface complètement la section des "Notes Cliniques" de l'écran, les gardant strictement inaccessibles.

### 23 Avril 2026 à 20:10 — SPRINT 2 : Phase 4 (Gestion Multi-Patients & Système de Consentement)
- **Ce que l'on cherchait à accomplir :**
  Mettre en place la navigation entre plusieurs dossiers médicaux et un système d'invitation sécurisé pour qu'un professionnel puisse être relié à un patient, avec l'accord de la famille.
- **Comment on a fait, étape par étape :**
  1. **Menu de Navigation :** Séparation claire entre la "navigation" (passer d'un patient à l'autre via le menu "3 petits points" en haut à droite) et "l'administration" (gérer les demandes dans la roue crantée).
  2. **Anonymat et Invitations Croisées :** Aucun nom entier ou numéro de sécurité sociale visible. Les demandes se font via un identifiant (Nom de famille + code identifiant unique généré).
  3. **Boîte de Réception Sécurisée :** Quand une demande est faite, elle apparaît dans la modale Paramètres (roue crantée) du receveur. Il peut alors "Accepter" ou "Refuser". Cette interaction est synchronisée en temps réel pour tous les appareils via Firebase.
  4. **Basculement Temps Réel (`switchPatient`) :** Une fois le patient validé, choisir un patient depuis le menu recharge instantanément tous ses modules personnels (Flux, Coffre, Chat) en gardant les données cloisonnées et sécurisées.

### 24 Avril 2026 à 02:30 — HOTFIX : Correction bug critique navigation multi-patients
- **Le problème signalé :**
  Après avoir cliqué sur un patient dans "Choisir un patient", plus rien ne fonctionnait : les enregistrements rapides, le menu "3 points" et le chat ne répondaient plus.
- **La cause racine identifiée :**
  `switchPatient` sauvegardait la nouvelle session dans `sessionStorage`, mais si une ancienne session existait dans `localStorage`, celle-ci prenait la priorité au rechargement. L'application revenait à l'ANCIEN patient, créant un état incohérent qui faisait planter les initialisations JavaScript.
- **Ce qu'on a corrigé :**
  1. **`setSession` corrigée :** Nettoyage explicite de `localStorage` quand la session est en `sessionStorage` pour éviter les conflits.
  2. **`switchPatient` renforcée :** Écriture dans les DEUX storages avant rechargement, garantissant une lecture cohérente de la session.
  3. **Navigation propre :** `window.location.reload()` → `window.location.replace(pathname)` pour un rechargement sans paramètres d'URL obsolètes.
  4. **Cache busting :** `app.js?v=3` pour forcer le rechargement du script chez les utilisateurs.
- **Commit :** `bc18391` — Déployé sur GitHub → Vercel.

### 14 Mai 2026 à 00:30 — Centralisation & Stabilisation (Sprint Actuel)
- **Centralisation des développements (Compilation de nos différentes fenêtres de discussion) :**
  1. **Personnalisation UI & Améliorations :** Ajout de la couleur rouge pour le nom du bénéficiaire, mise en place d'un filtre pour le flux de messages, et création de la modale des paramètres (gestion des patients, pros et abonnements).
  2. **Débogage du Chat :** Correction des problèmes empêchant de démarrer de nouvelles discussions.
  3. **Outils Avancés :** Installation réussie des "Stitch Agent Skills" (outils MCP) pour étendre les capacités de développement.
  4. **Stabilité de l'Infrastructure :**
     - Déblocage et nettoyage des processus fantômes de Docker Desktop.
     - Mise à jour d'urgence des règles de sécurité de Firebase Firestore pour rétablir les requêtes clients en mode test.
- **Décision Importante :** Le renommage complet du projet et des dossiers de "Monaco Care" vers "Monacare" est reporté à plus tard afin de ne pas casser les liaisons actuelles avec Firebase et Vercel.

### 16 Mai 2026 à 21:00 — HOTFIX : Flux vide + erreur envoi message Famille
- **Problèmes :**
  1. Historique du flux toujours vide : `loadRealtimeFeed` utilisait `orderBy('createdAt', 'desc')` qui nécessite un index composite Firestore inexistant → listener silencieusement mort
  2. Erreur "réseau impossible de poster" pour la Famille : `publishToFeed` lisait `authorName`/`authorRole` depuis le widget roleSelect (démo) au lieu de la session réelle
- **Corrections :**
  1. `app.js` : `orderBy` supprimé du flux, tri effectué en JS après réception du snapshot
  2. `app.js` : `publishToFeed` utilise `session.displayName` et `session.role` en priorité (fallback roleSelect en mode démo sans session)

### 16 Mai 2026 à 20:15 — HOTFIX : Firestore incohérent — doublon patient, notes cliniques bloquées
- **Problèmes identifiés via captures Firestore :**
  1. `patient-leclerc` existait encore dans Firestore → la requête retournait deux patients, et cliquer sur "Charles LECLERC" pointait vers un dossier vide (toutes les données étaient sous `patient-demo`)
  2. `patient-demo` avait encore les données de Jean-Pierre DUBOIS (seed précédent en `merge:true` n'écrasait pas les vieux champs)
  3. Notes cliniques : la requête `orderBy('createdAt', 'desc')` exigeait un index composite Firestore inexistant → erreur silencieuse
- **Corrections :**
  1. `firebase-config.js` : `batch.delete(patient-leclerc)` + remplacement complet de `patient-demo` sans `merge` (force l'écrasement)
  2. `app.js` : tri des notes cliniques en JS après le snapshot, suppression du `orderBy` Firestore
  3. `patients.html` : filtre `patient-leclerc` des résultats pour éviter l'affichage du doublon pendant la transition

### 16 Mai 2026 à 18:30 — Refonte navigation multi-rôles & unification patient Charles LECLERC
- **Ce que l'on cherchait à accomplir :**
  - Supprimer définitivement Jean-Pierre DUBOIS (patient fictif de test) et n'avoir qu'un seul patient de démo : **Charles LECLERC** (ID `patient-demo` conservé pour ne pas perdre l'historique des messages/constantes)
  - Faire passer la **Famille par la page de sélection patient** (comme les Pros et Intervenants) au lieu d'atterrir directement sur le flux
  - Restaurer l'historique des messages (les anciens posts étaient stockés sous `patient-demo` → Charles Leclerc hérite de tout l'historique automatiquement)
- **Comment on a fait :**
  1. `firebase-config.js` : seed renomme `patient-demo` en Charles LECLERC, supprime `patient-leclerc` en double
  2. `login.html` : connexion Famille → `patients.html` (plus `index.html` directement), session sans `patientId` présélectionné
  3. `patients.html` : Famille filtrée par `assignedFamilyCodes`, Jean-Pierre supprimé, redirection famille supprimée
  4. `index.html` : si session sans `patientId` → redirection automatique vers `patients.html`
  5. Labels corrigés partout : `patient-demo` = Charles LECLERC
- **Règle de suivi ajoutée :** Toute modification doit être consignée ici avec date + heure.

### 14 Mai 2026 à 00:57 — HOTFIX : Interface complètement bloquée (Boutons, Coffre, Menu)
- **Le problème signalé :**
  Tous les éléments interactifs de l'application (les boutons d'action rapide, le bouton "Déverrouiller" du coffre médical et le menu à trois points) ne réagissaient plus au clic, donnant l'impression que l'interface était gelée, bien que la page s'affichait.
- **La cause racine identifiée :**
  Lors de l'initialisation du DOM (`DOMContentLoaded`), la fonction `updateRoleUI` tentait d'appeler `loadRealtimeFeed` pour afficher le flux de messages. Or, cette dernière faisait référence à la variable `fluxListener` qui n'était déclarée (avec le mot-clé `let`) que beaucoup plus bas dans le script. En JavaScript, cela déclenchait une "Temporal Dead Zone" (ReferenceError), provoquant le crash immédiat de la suite du script de démarrage (`app.js`). Tous les événements (clics) programmés *après* cette ligne n'étaient jamais activés.
- **Ce qu'on a corrigé :**
  Déplacement des déclarations `let fluxListener = null;` et `let currentChatListener = null;` au tout début du fichier `app.js` (dans les variables globales), rendant ces références accessibles instantanément à toutes les fonctions d'initialisation.
- **Résultat :**
  Le crash silencieux est réparé. L'interface, les événements tactiles, le coffre et les menus s'initialisent correctement. Déployé sur GitHub et Vercel.
