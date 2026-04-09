# 📘 Guide Complet Monaco Care
### Pour que tu puisses tout utiliser de A à Z, même si tu pars de zéro

---

## 🗂️ Sommaire

1. [Comprendre comment ça marche (vue d'ensemble)](#1-comprendre-comment-ça-marche)
2. [Tes identifiants — tout ce dont tu as besoin](#2-tes-identifiants)
3. [La Console Administrateur — comment y accéder et quoi faire](#3-la-console-administrateur)
4. [Ajouter un professionnel de santé](#4-ajouter-un-professionnel)
5. [Ajouter un patient](#5-ajouter-un-patient)
6. [Donner accès à la famille](#6-donner-accès-à-la-famille)
7. [Comment se connecte chaque type d'utilisateur](#7-comment-se-connecte-chaque-utilisateur)
8. [Firebase — le "cerveau" de l'application](#8-firebase--le-cerveau-de-lapplication)
9. [Gérer Firebase directement (pour les cas avancés)](#9-gérer-firebase-directement)
10. [Ce qui est démo aujourd'hui vs ce qui sera réel demain](#10-démo-vs-production)

---

## 1. Comprendre comment ça marche

Imagine Monaco Care comme un **classeur médical partagé sécurisé**.

```
┌─────────────────────────────────────────────┐
│               MONACO CARE                   │
│                                             │
│  👨‍⚕️ Professionnels    👵 Le patient          │
│     (toi, le kiné,         (Jean-Pierre     │
│      le médecin...)         Dubois...)      │
│              ↘           ↙                  │
│           📱 Application                    │
│              ↕                              │
│        🔥 Firebase                          │
│    (base de données en ligne)               │
└─────────────────────────────────────────────┘
```

**Firebase**, c'est le "coffre-fort" en ligne où toutes les données sont stockées. Tu ne vois pas Firebase directement dans l'appli — c'est lui qui travaille en arrière-plan.

**La Console Admin**, c'est ton tableau de bord de contrôle. C'est là que tu crées les comptes, attribues les codes, valides les demandes.

---

## 2. Tes identifiants

### 🟢 TON COMPTE PROFESSIONNEL (pour utiliser l'appli comme kiné)

| | |
|---|---|
| **Identifiant** | `PRO-001` |
| **Code d'accès (PIN)** | `1234` |
| **Ton rôle affiché** | Tristan — Kinésithérapeute |

👉 Tu entres ça sur la page de connexion, onglet **"Professionnel de santé"**.

> ⚠️ **À FAIRE** : Change le code `1234` par quelque chose de plus sécurisé une fois Firebase connecté. Pour l'instant c'est le code de démo.

---

### 🔴 CONSOLE ADMINISTRATEUR (pour gérer toute l'application)

| | |
|---|---|
| **URL** | `https://monaco-care.vercel.app/admin.html` |
| **E-mail** | `admin@monacocare.mc` |
| **Mot de passe** | `Monaco2026!` |

> ⚠️ **À FAIRE** : Change ce mot de passe dès que tu passes en production. Ne le partage avec personne.

---

### 🟡 CODES FAMILLE / VISITEUR (pour les proches du patient)

Ces codes permettent aux familles d'accéder à l'appli sans compte :

| Code | Pour qui |
|---|---|
| `DEMO-2026` | Test général (accès famille démo) |
| `FAM-001` | Code famille démo |
| `FAM-002` | Deuxième proche autorisé |
| `MC-1234` | Visiteur externe (accès limité) |

---

## 3. La Console Administrateur

### Comment y accéder

1. Va sur **`https://monaco-care.vercel.app/admin.html`**
2. Saisis l'e-mail : `admin@monacocare.mc`
3. Saisis le mot de passe : `Monaco2026!`
4. Clique **"Accéder à la console"**

### Ce que tu peux faire dans la console

La console a plusieurs onglets dans la barre de gauche :

#### 📊 Tableau de bord
Vue d'ensemble : nombre de patients, de pros, alertes urgentes.

#### 👴 Patients
- Voir tous les patients enregistrés
- Cliquer sur un patient pour voir ses détails
- Voir les pros assignés à ce patient, les codes famille générés

#### 👨‍⚕️ Professionnels
- Liste de tous les pros inscrits
- **Valider ou refuser** les demandes d'inscription
- Voir leur identifiant (PRO-001, PRO-002, etc.)

#### 🔑 Codes Démo
- Voir les codes famille actifs
- Générer de nouveaux codes
- Désactiver un code si quelqu'un ne doit plus avoir accès

#### ⚙️ Paramètres
- Gérer les informations globales de l'application

---

## 4. Ajouter un professionnel

### En mode démo (maintenant, sans Firebase)

Actuellement, les pros sont définis dans le code. La liste des comptes démo est :

| Identifiant | Code | Qui |
|---|---|---|
| `PRO-001` | `1234` | **Toi (Kiné)** |
| `PRO-002` | `1234` | Dr. Sarah Martin (Médecin) |
| `PRO-003` | `1234` | Sophie Laurent (Auxiliaire) |

Pour ajouter un vrai professionnel maintenant, tu peux me le dire et j'ajoute son compte dans la liste démo.

### En mode réel (avec Firebase connecté)

Le pro suit cette procédure :
1. Il va sur `login.html`
2. Il clique **"S'inscrire"** (onglet inscription professionnelle)
3. Il remplit son nom, prénom, profession, e-mail
4. Sa demande arrive dans **la console admin** → onglet **"Professionnels"**
5. Toi (l'admin), tu vois la demande et tu cliques **"Valider"**
6. Firebase lui attribue automatiquement un identifiant `PRO-XXX` et un code d'accès
7. Tu lui communiques son identifiant et son code (par téléphone ou e-mail sécurisé)

---

## 5. Ajouter un patient

### Comment ça marche

Un patient n'a PAS de compte. Il est representé par un **dossier** dans l'application. Les pros et la famille accèdent à CE dossier avec leurs propres comptes.

### Procédure (côté professionnel)

1. Un pro se connecte à l'application
2. Il va sur la page **"Mes Patients"**
3. Il clique **"+ Ajouter un patient"**
4. Il entre le **numéro de patient** (ex: `45987301`) — c'est le numéro qu'on lui a communiqué
5. Une demande est envoyée → tu l'acceptes ou refuses dans la console

### Procédure (côté admin / toi)

Dans la **console admin** → onglet **"Patients"** :
1. Clique **"Créer un nouveau dossier"**
2. Remplis : nom, prénom, date de naissance, numéro de patient
3. Assigne les pros qui vont travailler avec ce patient (PRO-001, PRO-002, etc.)
4. Firebase crée le dossier et génère un ID patient unique

> 💡 **Le numéro de patient** : c'est un identifiant que TU définis. Ça peut être le numéro de sécu, un numéro interne, ou un numéro généré automatiquement. C'est ce numéro que les pros rentrent pour trouver le patient.

---

## 6. Donner accès à la famille

La famille n'a pas d'identifiant ni de mot de passe. Elle se connecte avec un **code temporaire** que toi (l'admin) tu génères.

### Générer un code famille

Dans la **console admin** → onglet **"Codes Démo"** (ou "Accès Famille" en production) :

1. Sélectionne le patient concerné (ex: Jean-Pierre Dubois)
2. Clique **"Générer un code d'accès"**
3. L'appli génère un code du type `FAM-4829`
4. Tu communiques ce code au membre de la famille (WhatsApp, SMS, e-mail)
5. La famille va sur `login.html`, clique **"Particulier / Famille"**, entre le code → accès accordé

### Ce que voit la famille

- ✅ Le flux d'actualité (les messages de l'équipe soignante)
- ✅ Les ordonnances et constantes vitales
- ❌ Les notes cliniques détaillées (réservées aux pros)
- ❌ Elle ne peut PAS écrire dans le coffre

### Désactiver un accès famille

Dans la console admin → trouve le code → clique **"Désactiver"**. Le code ne fonctionnera plus.

---

## 7. Comment se connecte chaque utilisateur

### 👨‍⚕️ Professionnel de santé

**Où :** `login.html` → onglet "Professionnel de santé"

**Ce qu'il entre :**
- Son **identifiant** (ex: `PRO-001`)
- Son **code d'accès / PIN** (ex: `1234`)

**Ce qu'il voit après :**
- La liste de SES patients
- Pour chaque patient : le Flux, le Coffre complet, le Chat de l'équipe

---

### 👨‍👩‍👧 Famille / Proche

**Où :** `login.html` → onglet "Particulier / Famille"

**Ce qu'il entre :**
- Un **code d'accès** (ex: `FAM-001` ou `DEMO-2026`)
- Il coche la case "J'accepte les conditions"

**Ce qu'il voit après :**
- Le dossier du patient lié à son code
- Flux, constantes, ordonnances
- PAS les notes cliniques

---

### 🔧 Administrateur (toi)

**Où :** `admin.html`

**Ce qu'il entre :**
- E-mail : `admin@monacocare.mc`
- Mot de passe : `Monaco2026!`

**Ce qu'il peut faire :**
- Tout gérer : patients, pros, codes, accès

---

## 8. Firebase — le "cerveau" de l'application

### C'est quoi Firebase ?

Firebase, c'est un service de Google qui joue le rôle de **base de données dans le cloud**. Imagine un grand tableau Excel partagé, mais ultra-sécurisé, accessible de partout, en temps réel.

Sans Firebase, l'appli fonctionne en mode "démo" avec des données fictives. Avec Firebase, toutes les données sont réelles, persistantes, et sécurisées.

### La console Firebase (le panneau de contrôle)

**URL :** `https://console.firebase.google.com`

Pour y accéder, tu dois te connecter avec le compte Google associé au projet. Tu verras plusieurs sections :

```
Firebase Console
├── 🔥 Firestore Database  → Les données (patients, pros, codes...)
├── 🔐 Authentication      → Les comptes utilisateurs
├── 📦 Storage             → Les fichiers (photos, ordonnances)
└── 📊 Analytics           → Les statistiques
```

### Ce qui est stocké dans Firebase

#### Collection `professionals` (les pros)
```
PRO-001
  ├── name: "Tristan D."
  ├── specialty: "Kinésithérapeute"
  ├── email: "pro-001@monacocare.mc"
  ├── status: "active"  ← ou "pending" ou "suspended"
  └── lastLogin: 2026-04-09
```

#### Collection `patients` (les dossiers)
```
patient-jean-dupont
  ├── firstName: "Jean-Pierre"
  ├── lastName: "DUBOIS"
  ├── dateOfBirth: "1948-03-12"
  ├── patientId: "45987301"
  ├── assignedPros: ["PRO-001", "PRO-002"]
  └── assignedFamilyCodes: ["FAM-001", "FAM-002"]
```

#### Collection `demo_codes` (les codes famille)
```
FAM-4829
  ├── patientId: "patient-jean-dupont"
  ├── label: "Marie Dubois (fille)"
  ├── active: true
  └── expiresAt: null  ← null = pas d'expiration
```

---

## 9. Gérer Firebase directement

### Accéder à la console Firebase

1. Va sur `https://console.firebase.google.com`
2. Connecte-toi avec ton compte Google
3. Sélectionne le projet **Monaco Care**

### Ajouter un patient manuellement dans Firebase

1. Clique sur **Firestore Database** dans le menu gauche
2. Clique sur la collection `patients`
3. Clique **"+ Ajouter un document"**
4. Remplis les champs :
   - `firstName` : "Jean-Pierre"
   - `lastName` : "DUBOIS"
   - `patientId` : "45987301"
   - `assignedPros` : ["PRO-001"]
5. Clique **Enregistrer**

### Ajouter un code famille manuellement

1. **Firestore** → collection `demo_codes`
2. Clique **"+ Ajouter un document"**
3. L'ID du document = le code (ex: `FAM-5892`)
4. Champs à remplir :
   - `patientId` : "patient-jean-dupont"
   - `label` : "Marie Dubois (fille du patient)"
   - `active` : `true`
   - `expiresAt` : laisser vide pour pas d'expiration
5. Clique **Enregistrer**
6. Communique le code `FAM-5892` à la famille

### Désactiver un accès

1. **Firestore** → `demo_codes` → trouve le code (ex: `FAM-5892`)
2. Clique sur le champ `active`
3. Change `true` en `false`
4. Enregistre → la personne ne peut plus se connecter

### Valider un pro en attente

1. **Firestore** → `pending_registrations`
2. Trouve la demande du pro
3. Dans la collection `professionals`, crée un nouveau document avec les infos du pro et `status: "active"`
4. Attribue-lui un ID `PRO-XXX` (le prochain disponible)

> 💡 **Alternative plus simple** : Passe par la **console admin** de l'appli (`admin.html`), c'est graphique et plus intuitif que de modifier Firebase directement.

---

## 10. Démo vs Production

### Situation actuelle (mode démo)

| Fonctionnalité | État |
|---|---|
| Login Professionnel (`PRO-001` / `1234`) | ✅ Fonctionne (démo locale) |
| Login Famille (`DEMO-2026`) | ✅ Fonctionne (démo locale) |
| Flux / Coffre / Chat | ✅ Fonctionne (données fictives) |
| Persistance des données | ❌ Les données se perdent au rechargement |
| Vrais patients / vraies notes | ❌ Pas encore connecté |

### Ce qu'il faut faire pour passer en production (Sprint 3)

1. **Connecter Firebase** — activer les règles de sécurité Firestore
2. **Créer les vrais comptes** — dans Firebase Authentication
3. **Migrer les données** — créer les vrais patients dans Firestore
4. **Changer les mots de passe** — admin + pros
5. **Désactiver le mode démo** — supprimer les codes hardcodés

---

## 🆘 En cas de problème

| Problème | Solution |
|---|---|
| "Je ne peux plus me connecter" | Va sur `admin.html` et vérifie si le compte est actif |
| "Un pro ne voit plus son patient" | Vérifie que son ID est dans `assignedPros` du patient |
| "Le code famille ne fonctionne plus" | Va dans Firebase → `demo_codes` → vérifie que `active = true` |
| "L'app est cassée" | Contacte le développeur (c'est moi 😄) |

---

*Document généré le 9 avril 2026 — Monaco Care Sprint 1*
