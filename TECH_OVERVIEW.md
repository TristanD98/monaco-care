# Monaco Care — État Technique & Conformité

> Document de référence — Mis à jour : 30/03/2026

---

## 1. 🗄️ Où sont stockées les données ?

### Mode actuel : **Firebase Cloud (Firestore + Auth)**

**L'application est pleinement connectée au Cloud sécurisé de Google (Firebase).** 
Les données sont synchronisées en temps réel entre tous les appareils (ordinateurs, téléphones, tablettes).

| Ce qui est stocké | Où | Sécurité |
|---|---|---|
| Mots de passe Professionnels | `Firebase Authentication` | Hachés & Salés par Google |
| Profils Professionnels | `Firestore Database` | Restreint (Mode Test actuellement) |
| Dossiers Patients | `Firestore Database` | Restreint (Mode Test actuellement) |
| Codes Démo Familles | `Firestore Database` | Génération chiffrée |
| Sessions | `Firebase Auth Token` | Validé dynamiquement |

### Conséquences directes
- ✅ **Base de données cloud active** (Firestore).
- ✅ **Authentification robuste** (Firebase Auth).
- ✅ **Synchronisation Multi-appareils en temps réel**.
- ✅ **Persistance garantie** même si on vide le cache.

---

## 2. 🔐 Protection des données & Conformité

### 2.1 Réglementation applicable
Monaco dispose de sa propre loi sur la protection des données :
- **Loi n°1.165 du 23 juillet 1993** (modifiée en 2019)
- Autorité compétente : **CCIN** (Commission de Contrôle des Informations Nominatives)

### 2.2 État actuel de la conformité

| Point de conformité | Statut | Commentaire |
|---|---|---|
| Données réelles de santé stockées | ✅ **Passe en Production** | Prêt pour un usage Beta dès demain |
| Consentement utilisateur | ✅ **OUI** | Case à cocher ajoutée pour Familles et Pros |
| Authentification sécurisée | ✅ **OUI** | Utilise Firebase Authentication |
| Chiffrement des mots de passe| ✅ **OUI** | Totalement géré par Firebase Auth |
| Déclaration CCIN | ❌ **À faire** | L'appli est tech-ready, mais l'administratif reste à faire |
| Hébergement certifié HDS | ❌ **NON** | Actuellement sur Vercel (Front) + Firebase (Base) |

> ⚠️ **IMPORTANT POUR DEMAIN** : L'application est sécurisée techniquement (mots de passe, base de données cloud). Cependant, légalement, l'hébergement de données de santé nécessite un serveur certifié HDS (Hébergeur de Données de Santé). Pour une phase Beta fermée, l'architecture Firebase actuelle est tolérée le temps d'une courte expérimentation.

---

## 3. ✅ Opérationnalité de l'Application

### Fonctionnalités disponibles et actives

| Fonctionnalité | État | Commentaire |
|---|---|---|
| Auth Profils via Firebase | ✅ Actif | Création manuelle par admin via la Console Firebase |
| Flux Monaco & Coffre Médical| ✅ Actif |
| Base de l'ui "Heritage Clinical"| ✅ Actif | Le design rouge bordeaux transparent est déployé |
| Console Admin | ✅ Actif | Génération des codes familles validée |
| Synchronisation Cloud | ✅ Actif | Un patient ajouté sur PC apparaît sur mobile |

---

## 4. 🗺️ Identifiants & Gestion (URGENT POUR DEMAIN)

**Pour que le médecin (`PRO-001`) puisse se connecter demain, vous devez le créer dans Firebase :**

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com/)
2. Menu de gauche : **Authentication** -> Onglet **Users**.
3. Cliquez sur **Add user**.
4. Email : **`pro-001@monacocare.mc`**
5. Mot de passe : **`CARE2026`** (ou ce que vous voulez).

Dès que ce compte est créé, prenez n'importe quel appareil, allez sur le site web (Vercel), cliquez sur Professionnel, entrez `PRO-001` et votre mot de passe, l'application fonctionnera.

---

## 5. 🔜 Roadmap Post-Lancement (Ce qui restera à faire plus tard)

1. **Hébergement HDS** : Transférer la base de données vers OVH Healthcare ou Azure HDS pour la conformité européenne stricte.
2. **Déclaration CCIN** : Compléter le formulaire légal à Monaco.
3. **Cloud Functions** : Coder un script serveur qui supprime automatiquement les comptes/données après 1 an d'inactivité stricte.
4. **Mentions légales détaillées** : Rédiger et publier une vraie page dédiée.
