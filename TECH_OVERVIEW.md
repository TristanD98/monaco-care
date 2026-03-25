# Monaco Care — État Technique & Conformité

> Document de référence — Mis à jour : 26/03/2026

---

## 1. 🗄️ Où sont stockées les données ?

### Mode actuel : `localStorage` (navigateur)

**Les données vivent dans le navigateur de l'appareil qui ouvre l'app.** Il n'y a pas de serveur, pas de base de données distante, pas de cloud.

| Ce qui est stocké | Où | Durée |
|---|---|---|
| Codes démo famille | `localStorage` du navigateur | Jusqu'à suppression manuelle |
| Comptes professionnels | `localStorage` du navigateur | Jusqu'à suppression manuelle |
| Dossiers patients | `localStorage` du navigateur | Jusqu'à suppression manuelle |
| Session utilisateur | `localStorage` / `sessionStorage` | Selon "Rester connecté" |
| Demandes d'inscription | `localStorage` du navigateur | Jusqu'à validation admin |

### Conséquences directes
- ✅ **Aucune donnée transmise à un serveur tiers** (parfait pour la démo)
- ❌ **Pas de synchronisation entre appareils** (iPhone A ≠ iPad B)
- ❌ **Si on vide le cache du navigateur → toutes les données disparaissent**
- ❌ **Pas de sauvegarde automatique**

### Prochaine étape prévue : Firebase (Google Cloud)
Le fichier `firebase-config.js` contient déjà toute l'architecture pour migrer vers Firebase (Firestore + Auth). Cela donnera : base de données cloud, synchronisation multi-appareils, authentification sécurisée.

---

## 2. 🔐 Protection des données & Conformité

### 2.1 Réglementation applicable

Monaco dispose de sa propre loi sur la protection des données :
- **Loi n°1.165 du 23 juillet 1993** (modifiée en 2019 pour s'aligner sur le RGPD européen)
- Autorité compétente : **CCIN** (Commission de Contrôle des Informations Nominatives)
- Pour les données de santé, des mesures renforcées s'appliquent

### 2.2 État actuel de la conformité

| Point de conformité | Statut | Notes |
|---|---|---|
| Données réelles de santé stockées | ✅ **NON** | Mode démo, données fictives uniquement |
| Consentement utilisateur | ⚠️ **Partiel** | Pas de bannière RGPD/CCIN formelle |
| Chiffrement des données | ❌ **NON** | `localStorage` non chiffré |
| Authentification sécurisée | ❌ **Simulation** | PIN stocké en clair dans localStorage |
| Droit à l'effacement | ❌ **Manuel** | Via la console Admin uniquement |
| Rétention automatique (1 an) | ⚠️ **Partiel** | Champ `expiresAt` présent, mais pas de scheduler de nettoyage actif |
| Journaux d'accès | ❌ **NON** | Pas de logs serveur |
| Hébergement certifié HDS | ❌ **NON** | Vercel (US) sans certification HDS |
| Déclaration CCIN | ❌ **À faire** | Obligatoire avant traitement de données réelles |

> ⚠️ **Point critique** : L'app dans son état actuel est une **démo fonctionnelle uniquement**. Elle ne doit PAS être utilisée pour stocker de vraies données médicales de vrais patients. Le `localStorage` n'est pas chiffré et n'est pas conçu pour des données de santé.

### 2.3 Ce que vous pouvez dire à vos interlocuteurs

**Si on vous questionne sur la protection des données :**

> *"L'application est actuellement en phase de démonstration. Les données utilisées sont fictives et stockées localement dans le navigateur de l'utilisateur, sans transmission à aucun serveur. Aucune donnée personnelle réelle n'est collectée à ce stade. Avant tout déploiement opérationnel avec de vraies données de santé, nous procéderons à la migration vers une infrastructure certifiée, à la déclaration auprès de la CCIN, et à la mise en place d'un DPA (Data Processing Agreement) conforme."*

---

## 3. ✅ L'app est-elle 100 % opérationnelle ?

### Fonctionnalités disponibles maintenant

| Fonctionnalité | État | Commentaire |
|---|---|---|
| Page de connexion (login.html) | ✅ Op. | Famille + Pro + Inscription |
| Auth famille (code démo) | ✅ Op. | Code `DEMO-2026` fonctionne |
| Auth professionnel (ID + PIN) | ✅ Op. | `PRO-001` / `CARE2026` |
| Redirection vers login si non connecté | ✅ Op. | Corrigé le 26/03/2026 |
| Console Admin (admin.html) | ✅ Op. | Génération codes, validation pros |
| Ajout patient (par les pros) | ✅ Op. | Avec DDN, adresse, photo, ID auto |
| Ajout professionnel (par famille) | ✅ Op. | Recherche par PRO-XXX |
| Constantes vitales (TA + Pouls + Temp.) | ✅ Op. | Avec alertes fièvre/hypothermie |
| Échelle de douleur | ✅ Op. | |
| Vue Coffre Médical (Vault) | ✅ Op. | Accès biométrique simulé |
| Flux Monaco (activités) | ✅ Op. | |
| Chat Professionnel | ✅ Op. | Simulé |
| Design Heritage Clinical (Stitch) | ✅ Op. | styles.css réécrit |
| Déploiement Vercel | ✅ Op. | Auto-deploy depuis GitHub |

### Limitations actuelles (non bloquantes pour la démo)

| Limitation | Impact | Solution |
|---|---|---|
| Données non partagées entre appareils | Chaque appareil a ses propres données | → Migration Firebase |
| Pas d'emails réels envoyés | L'inscription Pro n'envoie pas de vrai email | → Nodemailer / SendGrid |
| Authentification simulée | PIN stocké en clair, contournable | → Firebase Auth |
| Pas de nettoyage automatique (1 an) | Les données expirent mais ne sont pas supprimées | → Cloud Function Firebase |
| Pas de bannière consentement cookies/CCIN | Conformité incomplète | → À ajouter avant prod |
| Hébergement non-HDS | Non autorisé pour données de santé réelles | → Migration OVH HDS ou Azure HDS |

### Verdict

> **L'app est 100 % opérationnelle pour une démonstration** avec des données fictives.
> **Elle n'est pas encore prête pour la production** avec de vraies données de santé de vrais patients.
> Les 3 points bloquants pour la prod sont : ① Firebase Auth+Firestore, ② Hébergement HDS, ③ Déclaration CCIN.

---

## 4. 🗺️ Identifiants de test (à changer en prod)

| Rôle | Identifiant | Code |
|---|---|---|
| Admin | `admin@monacocare.mc` | `Monaco2026!` |
| Médecin | `PRO-001` | `CARE2026` |
| Kiné | `PRO-002` | `KINE2026` |
| Auxiliaire | `PRO-003` | `AUXIL26` |
| Famille | `DEMO-2026` | *(code unique)* |

---

## 5. 🔜 Roadmap pour la mise en conformité complète

1. **Migrer vers Firebase** (Auth + Firestore + règles de sécurité)
2. **Activer le chiffrement** des données sensibles côté client (AES)
3. **Migrer vers un hébergement HDS** (OVH Healthcare, ou Azure HIPAA/HDS)
4. **Déclarer le traitement** à la CCIN Monaco
5. **Rédiger les mentions légales + politique de confidentialité**
6. **Ajouter bannière de consentement** conforme
7. **Implémenter la purge automatique** à 1 an (Cloud Function)
8. **Audit de sécurité** avant ouverture au public
