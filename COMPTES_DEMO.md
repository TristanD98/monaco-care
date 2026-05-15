# Comptes de démonstration — Monacare

Patient de démo : **Jean-Pierre Dubois**, 78 ans — patient-demo

---

## Professionnels de santé
Connexion via l'onglet **"Professionnel de santé"** sur login.html

| Identifiant | Code PIN | Nom              | Rôle                  | Droits                                      |
|-------------|----------|------------------|-----------------------|---------------------------------------------|
| PRO-001     | 1234     | Tristan          | Kinésithérapeute      | Flux complet, Coffre médical, Notes cliniques |
| PRO-002     | 1234     | Dr. Sarah Martin | Médecin généraliste   | Flux complet, Coffre médical, Notes cliniques |
| PRO-003     | 1234     | Sophie Laurent   | Auxiliaire de vie     | Flux public & médifam uniquement, pas de coffre |

---

## Intervenants
Connexion via l'onglet **"Intervenant"** sur login.html

| Identifiant | Code PIN | Nom   | Rôle            | Droits                                      |
|-------------|----------|-------|-----------------|---------------------------------------------|
| INT-001     | 1234     | Leïla | Femme de ménage | Flux public & médifam, pas de coffre médical |
| INT-002     | 1234     | Max   | Auxiliaire de vie | Flux public & médifam, pas de coffre médical |

---

## Famille / Proches
Connexion via l'onglet **"Famille"** sur login.html — saisir le code dans le champ prévu

| Code        | Identité              | Droits                                                    |
|-------------|-----------------------|-----------------------------------------------------------|
| DEMO-2026   | Emma Dubois — Fille   | Flux public & médifam & famille, Coffre (sans notes clin.) |
| FAM-001     | Emma Dubois — Famille | Idem                                                      |
| FAM-002     | Proche autorisé       | Idem                                                      |

---

## Accès externe (coffre uniquement)
Connexion directement depuis **le Coffre médical** (sans passer par login), via le champ code

| Format de code    | Exemple   | Droits                                          |
|-------------------|-----------|-------------------------------------------------|
| MC-XXXX (≥6 car.) | MC-1234   | Coffre en lecture allégée — sans notes cliniques |

---

## Ce que chaque rôle peut faire

| Action                         | Médecin / Kiné | Auxiliaire | Famille |
|-------------------------------|:--------------:|:----------:|:-------:|
| Voir flux public               | ✓              | ✓          | ✓       |
| Voir flux médical              | ✓              | ✗          | ✗       |
| Voir flux médical & famille    | ✓              | ✓          | ✓       |
| Voir flux famille uniquement   | ✗              | ✗          | ✓       |
| Publier dans le flux           | ✓              | ✓          | ✓       |
| Coffre médical (constantes)    | ✓              | ✗          | ✓*      |
| Notes cliniques                | ✓              | ✗          | ✗       |
| Évaluation douleur             | ✓              | ✗          | ✓       |
| Chat privé                     | ✓              | ✓          | ✓       |
| Modifier visibilité d'un post  | ✓ (auteur)     | ✓ (auteur) | ✓ (auteur) |
| Supprimer un post              | ✓ (auteur)     | ✓ (auteur) | ✓ (auteur) |

*Famille : accès coffre sans les notes cliniques

---

## Console d'administration
Accès via `/admin.html` (ajouter `/admin.html` à l'URL Vercel)

| E-mail                  | Mot de passe  |
|-------------------------|---------------|
| admin@monacocare.mc     | Monaco2026!   |

Depuis la console admin tu peux :
- Générer de nouveaux codes famille et les attacher à un patient
- Activer / désactiver / supprimer des codes existants
- Voir et gérer les professionnels (réinitialiser leur PIN, suspendre un compte)
- Valider les demandes d'inscription en attente
- Consulter la liste des patients et leurs accès associés

---

## Note — Format du code famille

Le champ de saisie accepte uniquement les lettres **A-Z** et les chiffres **0-9** (pas d'accents).
Le tiret s'ajoute automatiquement : taper `DEMO2026` → devient `DEMO-2026`.
**Ne pas taper avec des accents** (ex : `démo2026` ne fonctionnera pas).
