# 📖 Manuel de Fonctionnement — Monaco Care

Ce document explique en détail le parcours de chaque type d'utilisateur sur la plateforme Monaco Care. 

L'architecture repose sur un principe fondamental : **La sécurité avant tout.** Ainsi, personne ne peut s'inscrire et accéder aux dossiers médicaux de manière autonome. Chaque accès est contrôlé, validé ou distribué par l'équipe administrateur.

---

## 👨‍👩‍👧‍👦 1. Profil Famille (ex: l'enfant du patient)

La famille **ne se crée pas de compte** avec un e-mail et un mot de passe classique. Elle utilise un système de "Code d'Accès Unique". 

### A. D'où vient ce code ?
C'est le professionnel de santé (ou l'administrateur) qui, au moment où la prise en charge commence, génère ce code (ex: `ABCD-1234`) depuis son interface, et le transmet directement à la famille (par SMS, email, ou de vive voix).

### B. Comment se connecter ?
1. Le membre de la famille se rend sur la page d'accueil de l'application (le lien Vercel).
2. Il clique sur le gros bouton **"Particulier / Famille"**.
3. Il saisit le code à 8 caractères qu'on lui a fourni.
4. Il coche la case d'acceptation de gestion des données (RGPD).
5. Il clique sur **Accéder au dossier**.

### C. Que peut voir la famille ?
Une fois connectée, la famille a une **vue restreinte et simplifiée** :
- Le **Flux (Fil d'actualité)** : Elle voit les messages postés par l'équipe soignante (ex: *"La douche s'est bien passée ce matin"*).
- **L'équipe soignante** : La liste des professionnels assignés à sa mère/père, avec la possibilité de les appeler.
- **Le Coffre Médical (Nouveauté)** : La famille peut désormais rentrer de nouvelles constantes (fièvre, pouls) au domicile et partager ça avec les médecins.
- **Gérer les Accès Réciproques** : Dans ses "Paramètres", la famille peut voir un onglet de "Demandes d'Accès". Si un médecin veut le dossier du patient parent, il envoie une demande et la famille l'approuve d'un clic !

---

## 👩‍⚕️ 2. Profil Professionnel de Santé (Infirmier, Kiné, Auxiliaire...)

Le professionnel a un accès complet (Flux, Coffre Médical, Chat). L'accès est hyper-sécurisé. 

### A. Demande d'accès (Inscription)
1. Le professionnel va sur la page d'accueil et clique sur **"Professionnel de santé"**.
2. Il va dans l'onglet **"S'inscrire"**.
3. Il remplit son Nom, Prénom, Profession, et e-mail, puis valide.
4. **Il ne peut pas se connecter immédiatement.** Un message lui indique que sa demande a été envoyée à l'administrateur pour validation.

### B. Comment récupérer ses identifiants ?
Une fois la demande validée par l'administrateur (voir partie 3 ci-dessous), le professionnel recevra ses accès :
- Un identifiant officiel (ex: `PRO-002`)
- Un code secret / mot de passe temporaire (ex: `KINE2026`)

### C. Connexion au quotidien
1. Il retourne sur la page de connexion, onglet **"Connexion"**.
2. Il saisit `PRO-002` et son code secret.
3. Il accède alors à **tous les patients qui lui sont assignés**, peut rentrer des constantes vitales dans le Coffre, et écrire dans le flux des familles.

### D. Cas du 3ème Profil : L'Accompagnant (Non-Médical)
Si l'intervenant choisit un profil non médical à l'inscription (Aide à Domicile, Nettoyage, etc.), son parcours sera similaire, mais ses droits et accès seront **bloqués au niveau du Coffre Médical**. Il ne verra QUE le Flux pour reporter ses heures ou anecdotes ("*Le repas a été pris*"), garantissant ainsi le secret médical.

---

## 👑 3. Profil Administrateur (C'est toi !)

En tant qu'administrateur, tu as une "supervision totale", divisée en deux espaces pour cette version de lancement.

### A. Le panneau de contrôle métier (Console Admin)
Accessible via le petit lien gris tout en bas de la page d'accueil : **"Console d'administration"**.
* **Connexion** : `admin@monacocare.mc` / mot de passe configuré.
* **Ce que tu y fais** :
   - Voir toutes les demandes d'inscription "En attente" des professionnels.
   - En cliquant sur "Valider" pour un professionnel, le système génère son identifiant `PRO-XXX` et son code PIN de départ.
   - Tu peux générer des nouveaux codes "Familles" (Délai : 30 jours, 90 jours...) et les attribuer à un dossier patient.
   - Tu transmets ensuite les identifiants décidés au pro et à la famille.

### B. Le panneau de sécurité technique (Console Firebase)
Pour valider **réellement** le droit de connexion d'un Professionnel (point bloquant légalement sans Cloud propre autorisé), tu dois déclarer la personne chez Google Firebase.

**Le processus pour valider un nouveau membre (Exemple: Le Dr Martin s'inscrit) :**

1. Tu vois sa demande dans ta **Console Admin** Monaco Care. Tu l'approuves. Le système te dit qu'il s'appellera `PRO-002` et a le code secret `XYZ89`.
2. Tu ouvres le vrai site sécurisé **Firebase Google** (`console.firebase.google.com`).
3. Tu vas dans `Authentication` -> `Users` -> `Add user`.
4. Tu obéis à la règle stricte de la plateforme : tu crées l'adresse e-mail technique `pro-002@monacocare.mc` et tu mets le mot de passe généré `XYZ89`.
5. C'est fait ! La route est ouverte côté Cloud. Tu peux appeler le médecin et lui dire *"C'est bon, tu peux te connecter avec PRO-002 et XYZ89"*.

### Pourquoi ce "Double Check" via Firebase pour cet outil Bêta ?
Dans une application classique comme Netflix, n'importe qui clique sur S'inscrire, le système Firebase lui crée un profil et le laisse rentrer. 
Mais dans le domaine de la **santé à domicile**, on ne veut **SURTOUT PAS** que quelqu'un puisse usurper une identité logicielle sans une intervention humaine du gérant de la clinique. Le fait que toi (Administrateur) ailles taper son profil dans Firebase garantit qu'**aucune connexion sauvage n'aura jamais lieu dans ta base**. 
