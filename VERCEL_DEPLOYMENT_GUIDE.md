# Guide de déploiement Vercel pour LMO To-Do List

## ✅ État actuel
- ✅ Frontend build réussi
- ✅ Backend build réussi
- ✅ Configuration Vercel mise à jour avec chemins absolus
- ✅ Code poussé sur GitHub

## 🔧 Configuration Vercel requise

### 1. Variables d'environnement
Dans le dashboard Vercel (https://vercel.com/dashboard), allez dans votre projet et ajoutez :

```
DATABASE_URL=file:./dev.db
JWT_SECRET=lmo_todo_jwt_secret_key_2024_secure
```

### 2. Vérification du déploiement
Après le prochain déploiement automatique :
1. Testez l'inscription sur https://lmo-to-do-list.vercel.app
2. Si 404 persiste, vérifiez les logs Vercel

### 3. Commandes de build personnalisées (si nécessaire)
Si le build échoue, ajoutez dans les settings Vercel :
- Build Command: `cd todo-app/frontend && npm install && npm run build`
- Output Directory: `todo-app/frontend/dist`

## 🚀 Test final
Une fois déployé, testez :
- Inscription utilisateur
- Connexion
- Création de tâches
- Paramètres (focus time)
- WhatsApp integration

## 🆘 Dépannage
Si problème persiste :
1. Vérifiez les logs de build Vercel
2. Assurez-vous que les variables d'environnement sont définies
3. Essayez un redeploy manuel