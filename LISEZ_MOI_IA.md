# Document de Reprise IA - Monaco Care

Ce document contient tout le contexte nécessaire pour qu'une autre intelligence artificielle (comme une nouvelle instance d'Antigravity ou un autre LLM) puisse reprendre le développement de l'application **Monaco Care** exactement là où nous nous sommes arrêtés.

## 📌 Présentation du Projet
**Monaco Care** est une application web (démo front-end) conçue pour une tablette ou un mobile. Elle simule une plateforme métier pour le personnel médical, paramédical, et la famille autour d'un patient (Jean-Pierre DUBOIS).

### 🚀 Fonctionnalités Actuelles :
1. **Simulation de Rôles :** Possibilité de changer de vue (Kiné, Médecin, Auxiliaire, Fille du patient) avec des permissions dynamiques gérées en JavaScript.
2. **Flux Monaco :** Un fil d'actualité permettant de partager des informations rapides, avec un système de tags (Public, Équipe, Médical Uniquement) et des boutons d'actions rapides (shortcuts) personnalisables.
3. **Coffre Médical Sécurisé :** Vue protégée (simulation biométrique) affichant les constantes vitales (Tension, Rythme cardiaque) et un suivi de la douleur, matérialisés par des graphiques interactifs (via Chart.js). Permet aussi de saisir des notes cliniques (clavier ou dictée vocale simulée).
4. **Chat Pro / Discussions :** Système de messagerie métier pour discuter avec différentes équipes ou déclencher de nouvelles conversations.

## 📂 Architecture des Fichiers
L'application repose sur 3 fichiers standards fonctionnant entièrement côté client (sans base de données backend pour la démo) :
- `index.html` : Structure de l'application, les différentes vues (flux, vault, chat), et l'inclusion de `Chart.js` via CDN.
- `styles.css` : Design complet avec variables CSS, thèmes de couleurs (Silver, Red), mise en page responsive et effets visuels (modales, bulles de chat).
- `app.js` : Logique métier de la démo (gestion des fausses données, routage interne entre les onglets, modales, graphiques Chart.js dynamiques, logs médicaux).

## 🤖 Instructions pour la Nouvelle IA
Si vous êtes une nouvelle IA assignée à la suite de ce projet, veuillez suivre ces étapes :

1. Prenez connaissance des fichiers `index.html`, `styles.css`, et `app.js` situés dans le même dossier que ce fichier.
2. Sachez que le projet fonctionne actuellement parfaitement. Tout ajout de fonctionnalité devra être fait de manière incrémentale en conservant le style visuel et la logique de rôles établie dans `app.js`.
3. Le code utilise les icônes FontAwesome (`fa-solid`, `fa-regular`) et la police Google *Inter*.
4. **Action Attendue :** Demandez à l'utilisateur quelle est la prochaine fonctionnalité à développer ou le bug à corriger, et basez-vous sur ces 3 fichiers pour lui proposer une mise à jour.
