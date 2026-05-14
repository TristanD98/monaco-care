# Guide de Configuration Firebase - Monaco Care

Ce guide explique pas à pas comment configurer la base de données Firebase pour réparer l'interface de l'application et y ajouter notre patient de démo : Charles Leclerc.

## Étape 1 : Créer le patient Charles Leclerc
Firebase a besoin d'un "document" qui représente ce patient pour pouvoir s'y attacher.

1. Rends-toi sur la [Console Firebase](https://console.firebase.google.com/) et clique sur le projet **Monaco Care**.
2. Dans le menu de gauche, clique sur **Firestore Database**.
3. Tu verras probablement 3 colonnes. Dans la première (Collections), clique sur le bouton **Commencer une collection** (ou Ajouter une collection).
4. **ID de la collection** : tape `patients` puis clique sur Suivant.
5. **ID du document** : tape exactement `patient-demo` (c'est l'ID qu'on a configuré dans notre code).
6. Ajoute ensuite ces champs pour que le profil soit complet (en cliquant sur "Ajouter un champ") :
   - Champ : `firstName`, Type : `string`, Valeur : `Charles`
   - Champ : `lastName`, Type : `string`, Valeur : `Leclerc`
   - Champ : `birthDate`, Type : `string`, Valeur : `16/10/1997` (ou la date que tu veux)
7. Clique sur **Enregistrer**. Ton patient officiel Charles Leclerc existe maintenant !

---

## Étape 2 : Créer les Index (POUR RÉPARER LES BOUTONS)
C'est l'étape la plus critique. Sans cela, Firebase bloquera le flux de messages (ce qui fige l'application).

1. Toujours dans **Firestore Database**, regarde en haut au centre de l'écran, tu as des onglets : *Données*, *Règles*, *Index*, *Utilisation*. Clique sur **Index**.
2. Clique sur le bouton bleu **Créer un index composite**.
3. Remplis le formulaire exactement comme ceci pour le flux principal :
   - **ID de la collection** : `posts`
   - **Champ à indexer 1** : `patientId` (Choisis l'ordre **Croissant** / Ascending)
   - **Champ à indexer 2** : `createdAt` (Choisis l'ordre **Décroissant** / Descending)
   - **Portée de la requête** : Collection
4. Clique sur **Créer**. 

L'état va passer à "En cours de création". **Cela prend généralement de 2 à 5 minutes.**
*Pour que ton coffre fort médical complet fonctionne, tu devras répéter exactement cette Étape 2 avec les ID de collections : `medical_vitals`, `medical_pain` et `medical_notes` (les champs `patientId` et `createdAt` restent les mêmes).*

---

## Conclusion
Une fois les index construits (statut "Activé" au lieu de "En cours" dans la console Firebase), tu pourras re-tester tes boutons d'actions rapides sur ton application Vercel. Tout s'affichera instantanément !
