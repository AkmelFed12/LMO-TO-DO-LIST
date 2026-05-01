# Guide de déploiement Vercel pour LMO To-Do List

## ✅ État actuel
- ✅ Architecture séparée : Frontend + Backend indépendants
- ✅ Frontend déployé sur `lmo-to-do-list.vercel.app`
- ✅ Backend repo créé sur `https://github.com/AkmelFed12/LMO-backend`
- ✅ Base de données Neon PostgreSQL configurée
- ✅ Code poussé sur GitHub

## 🔧 Configuration Vercel requise

### 1. Backend Deployment (`lmo-backend.vercel.app`)
**Repo GitHub** : https://github.com/AkmelFed12/LMO-backend

Dans le dashboard Vercel :
1. Créer un nouveau projet depuis ce repo
2. Ajouter les variables d'environnement :
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_8SVyfp6oAOal@ep-bitter-union-anrsephh-pooler.c-6.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
   JWT_SECRET=lmo_todo_jwt_secret_key_2024_secure
   ```
3. Le déploiement se fera automatiquement

### 2. Frontend déjà configuré
Le frontend proxy automatiquement vers `https://lmo-backend.vercel.app/api`

### 3. Vérification du déploiement
Après déploiement du backend :
1. Testez l'inscription : https://lmo-to-do-list.vercel.app
2. Vérifiez les appels API dans la console développeur
3. Testez la création de tâches

## 🚀 URLs finales attendues :
- **Frontend** : https://lmo-to-do-list.vercel.app
- **Backend API** : https://lmo-backend.vercel.app/api/*

## 🆘 Dépannage
Si problème persiste :
1. Vérifiez les logs Vercel du backend
2. Assurez-vous que Neon DB est accessible
3. Vérifiez les variables d'environnement dans Vercel
2. Assurez-vous que les variables d'environnement sont définies
3. Essayez un redeploy manuel