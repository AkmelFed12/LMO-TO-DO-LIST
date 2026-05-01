# Guide de déploiement Vercel pour LMO To-Do List

## ✅ État actuel
- ✅ Frontend build réussi
- ✅ Backend build réussi
- ✅ Configuration Vercel mise à jour avec chemins absolus
- ✅ Migration PostgreSQL terminée
- ✅ Code poussé sur GitHub
- ✅ Base de données Neon déjà configurée

## 🔧 Configuration Vercel requise

### 1. Variables d'environnement
Puisque vous utilisez **Neon intégré à Vercel**, la `DATABASE_URL` est automatiquement fournie.

Dans le dashboard Vercel (https://vercel.com/dashboard), allez dans votre projet et ajoutez seulement :

```
JWT_SECRET=lmo_todo_jwt_secret_key_2024_secure
```

**Note**: La variable `DATABASE_URL` sera automatiquement injectée par Vercel/Neon.

### 2. Vérification de l'intégration Neon
Dans votre dashboard Vercel :
1. Allez dans l'onglet **Storage**
2. Vérifiez que Neon est connecté
3. La `DATABASE_URL` devrait apparaître dans les variables d'environnement

### 3. Vérification du déploiement
Après le prochain déploiement automatique :
1. Testez l'inscription sur https://lmo-to-do-list.vercel.app
2. Si 404 persiste, vérifiez les logs Vercel

### 4. Commandes de build personnalisées (si nécessaire)
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