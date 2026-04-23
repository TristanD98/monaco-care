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
