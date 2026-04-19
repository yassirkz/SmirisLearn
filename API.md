# Smiris Learn – Documentation de l'API publique

Cette API permet d'automatiser la gestion des organisations, des administrateurs et des étudiants sur la plateforme **Smiris Learn**. Elle est destinée aux intégrateurs souhaitant connecter des systèmes tiers (CRM, ERP, scripts d'onboarding, etc.).

## 🔐 Authentification

Toutes les requêtes doivent inclure un en-tête HTTP `X-API-Key` contenant une clé API valide.

**Obtention d'une clé API :**
1. Se connecter à Smiris Learn en tant que **Super Admin**.
2. Aller dans **Paramètres** → section **Clés API**.
3. Cliquer sur **+ Générer**, donner un nom et enregistrer.
4. **Copier immédiatement** la clé générée (format `sm_live_...`). Elle ne sera plus affichée.

**En-tête requis :**
`X-API-Key: sm_live_xxxxxxxxxxxx`

## 🌐 URL de base

Tous les endpoints sont accessibles à l'adresse suivante :
`https://frftiwiqqehyiyjybemx.supabase.co/functions/v1`

## 📋 Liste des endpoints

### 1. Créer une organisation (avec administrateur)

Crée une nouvelle organisation et son compte administrateur.  
Si le plan est `starter`, l'organisation est créée avec le statut `trial` (période d'essai).

**Endpoint :** `POST /create-account`

**Corps de la requête :**
```json
{
  "companyName": "Nom de l'entreprise",
  "adminEmail": "admin@entreprise.com",
  "adminPassword": "MotDePasse123!",
  "plan": "free" | "starter"
}
```

**Réponse (succès) :**
```json
{
  "success": true,
  "organization_id": "550e8400-e29b-41d4-a716-446655440000",
  "admin_user_id": "123e4567-e89b-12d3-a456-426614174000",
  "message": "Account created successfully"
}
```

### 2. Ajouter un étudiant à une organisation
Ajoute un nouvel étudiant dans l'organisation spécifiée.
Possibilité d'assigner directement l'étudiant à un ou plusieurs groupes via `groupIds`.

**Endpoint :** `POST /add-student/organizations/{orgId}/students`

**Paramètres d'URL :**
`orgId` : ID de l'organisation cible.

**Corps de la requête :**
```json
{
  "email": "etudiant@example.com",
  "fullName": "Nom complet",
  "password": "Optionnel – un mot de passe aléatoire est généré si absent",
  "groupIds": ["uuid-groupe-1", "uuid-groupe-2"]
}
```

**Réponse (succès) :**
```json
{
  "success": true,
  "student_id": "uuid",
  "message": "Student added successfully"
}
```

### 3. Suspendre / réactiver une organisation
**Endpoint :** `PATCH /suspend-account/accounts/{adminUserId}`

**Corps de la requête :**
```json
{
  "suspended": true   // false pour réactiver
}
```

### 4. Supprimer définitivement une organisation
**Endpoint :** `DELETE /delete-account/accounts/{adminUserId}`

### 5. Lister les étudiants d'une organisation
**Endpoint :** `GET /list-students/organizations/{orgId}/students?page=1&limit=20&search=nom`

**Paramètres de requête optionnels :**
*   `page` (défaut 1)
*   `limit` (défaut 20)
*   `search` (recherche par nom ou email)

### 6. Modifier un étudiant
**Endpoint :** `PATCH /update-student/students/{studentId}`

**Corps de la requête :**
```json
{
  "fullName": "Nouveau nom",
  "suspended": false
}
```

### 7. Supprimer un étudiant
**Endpoint :** `DELETE /delete-student/students/{studentId}`

### 8. Assigner un étudiant à des groupes (endpoint dédié)
Si vous préférez dissocier l'ajout de l'étudiant de l'affectation aux groupes, utilisez cet endpoint.

**Endpoint :** `POST /assign-groups`

**Corps de la requête :**
```json
{
  "studentId": "uuid",
  "groupIds": ["uuid-groupe-1", "uuid-groupe-2"]
}
```

**Réponse (succès) :**
```json
{
  "success": true,
  "message": "Student assigned to 2 group(s)"
}
```

## 📌 Exemples de flux complets

### Scénario 1 – Smiris Academy (organisation interne)
Ajout d'un client de M. Youssef directement dans Smiris Academy et assignation aux groupes "CV" et "LM".

```http
POST /add-student/organizations/ece06fab-24a0-47be-be9e-65cb9a845535/students
X-API-Key: sm_live_...
Content-Type: application/json

{
  "email": "client@example.com",
  "fullName": "Jean Dupont",
  "groupIds": ["f8544d2b-3f09-493f-8217-209b131bc3aa", "db276c56-7273-4f37-9954-90b4d47790de"]
}
```

### Scénario 2 – Entreprise externe (plan Starter)
Création d'une organisation cliente avec période d'essai, ajout d'un employé, suspension, réactivation et suppression.

```http
# 1. Créer l'organisation
POST /create-account
{
  "companyName": "Acme Corp",
  "adminEmail": "admin@acme.com",
  "adminPassword": "Admin12345!",
  "plan": "starter"
}

# 2. Ajouter un étudiant
POST /add-student/organizations/{orgId}/students
{
  "email": "employe@acme.com",
  "fullName": "Alice Martin"
}

# 3. Suspendre l'organisation
PATCH /suspend-account/accounts/{adminId}
{ "suspended": true }

# 4. Réactiver
PATCH /suspend-account/accounts/{adminId}
{ "suspended": false }

# 5. Supprimer définitivement
DELETE /delete-account/accounts/{adminId}
```

## 🛡️ Codes d'erreur fréquents

| Code | Message | Signification |
| :--- | :--- | :--- |
| 400 | Invalid API key | Clé absente ou invalide |
| 403 | API is disabled | L'API est désactivée dans les paramètres système |
| 429 | Rate limit exceeded | Trop de requêtes (limite par défaut : 1000/h) |
| 400 | Organization member limit reached | Limite d'étudiants atteinte pour le plan |
| 400 | Invalid email | L'email fourni n'est pas valide |
| 400 | Email already registered | L'email est déjà associé à un compte |

## 📞 Support
Pour toute question technique, contactez l'équipe Smiris Learn.
