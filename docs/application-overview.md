# Koziko Backend — Vue d’ensemble de l’application

## Objectif du projet

`Koziko Backend` est l’API principale de l’application Koziko. Elle est développée avec **NestJS**, **TypeScript** et **TypeORM**, et fournit les services nécessaires à une application sociale orientée profils, publications, commentaires, groupes, messagerie, notifications, uploads et appels temps réel.

Cette API sert de couche métier et d’accès aux données pour le frontend. Elle gère l’authentification, la persistance PostgreSQL, les flux temps réel et les règles de sécurité de base.

---

## Stack technique

- **Framework** : NestJS 11
- **Langage** : TypeScript
- **Base de données** : PostgreSQL
- **ORM** : TypeORM 0.3.x
- **Authentification** : JWT + Google OAuth 2.0
- **Temps réel** : Socket.IO via `@nestjs/websockets`
- **Upload de fichiers** : Multer
- **Sécurité** : guards Passport, throttling, validation globale, CORS
- **Déploiement** : Render pour l’API, Neon pour PostgreSQL

---

## Architecture générale

Le backend est organisé en modules NestJS, chacun correspondant à un domaine métier.

### Point d’entrée

- `src/main.ts`
  - Initialise l’application NestJS
  - Configure le CORS selon l’environnement
  - Sert les fichiers statiques du dossier `uploads/`
  - Active la validation globale via `ValidationPipe`
  - Expose une route racine `/` et une route de santé `/health`

### Module racine

- `src/app.module.ts`
  - Charge la configuration via `ConfigModule`
  - Configure `TypeOrmModule`
  - Active le `ThrottlerModule`
  - Importe tous les modules fonctionnels
  - Branche le `ThrottlerGuard` global

### Modules fonctionnels

- `AuthModule`
- `UsersModule`
- `PostsModule`
- `CommentsModule`
- `GroupsModule`
- `MessagesModule`
- `NotificationsModule`
- `UploadsModule`
- `WebrtcModule`

---

## Fonctionnalités métier

## 1. Authentification

Le module d’authentification gère :

- l’inscription classique
- la connexion classique
- la récupération du profil courant
- la connexion Google OAuth
- le retour vers le frontend après connexion Google

### Routes principales

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile`
- `GET /auth/google`
- `GET /auth/google/callback`

### Sécurité

- Limitation du nombre de requêtes sur `register` et `login`
- Guard JWT pour les routes protégées
- Stratégie Google OAuth via Passport

### Comportement

- L’utilisateur connecté reçoit un JWT
- Le callback Google redirige vers le frontend avec le token en query string
- Le profil utilisateur est récupéré depuis la base, pas seulement depuis le payload JWT

---

## 2. Utilisateurs

Le module `users` couvre le profil utilisateur et les relations sociales.

### Routes principales

- `GET /users`
- `GET /users/me`
- `GET /users/:id`
- `PUT /users/me`
- `DELETE /users/me`
- `POST /users/follow/:userId`
- `POST /users/follow-requests/:requestId/accept`
- `POST /users/follow-requests/:requestId/reject`
- `DELETE /users/unfollow/:userId`
- `GET /users/follow-requests/pending`
- `GET /users/:id/followers`
- `GET /users/:id/following`
- `GET /users/discover/users`

### Responsabilités

- lire et mettre à jour le profil utilisateur
- gérer les abonnements / followers
- gérer les demandes de follow
- proposer des utilisateurs à découvrir

### Sécurité

- les routes sont protégées par `JwtAuthGuard`

---

## 3. Publications

Le module `posts` gère le fil de publication de l’application.

### Routes principales

- `POST /posts`
- `GET /posts`
- `GET /posts/:id`
- `PATCH /posts/:id`
- `DELETE /posts/:id`
- `PUT /posts/:id/reactions/:emoji/:userId`
- `DELETE /posts/:id/reactions/:emoji/:userId`

### Fonctions

- création de publications
- consultation de la liste des posts
- consultation d’un post unique
- modification et suppression
- réactions emoji sur les posts

### Particularités de données

- posts textuels et markdown
- images associées
- réactions stockées en JSON
- publication possible en mode anonyme
- publication reliée à un auteur et éventuellement à un groupe

---

## 4. Commentaires

Le module `comments` permet les échanges sous les publications.

### Routes principales

- `POST /comments`
- `GET /comments`
- `GET /comments?postId=:id`
- `GET /comments/:id`
- `PATCH /comments/:id`
- `DELETE /comments/:id`
- `PUT /comments/:id/reactions/:emoji/:userId`
- `DELETE /comments/:id/reactions/:emoji/:userId`

### Fonctions

- créer un commentaire
- lister tous les commentaires ou filtrer par post
- modifier et supprimer un commentaire
- ajouter / retirer une réaction sur un commentaire

---

## 5. Groupes

Le module `groups` couvre les espaces communautaires.

### Routes principales

- `POST /groups`
- `GET /groups`
- `GET /groups/:id`
- `PATCH /groups/:id`
- `DELETE /groups/:id`
- `POST /groups/:id/members/:userId`
- `DELETE /groups/:id/members/:userId`
- `POST /groups/:id/join-requests/:userId`

### Fonctions

- créer et gérer des groupes
- ajouter ou retirer des membres
- enregistrer des demandes d’adhésion

---

## 6. Messagerie

Le module `messages` gère la messagerie privée et les messages de groupe.

### API REST

- `POST /messages`
- `GET /messages`
- `GET /messages/conversations`
- `DELETE /messages/conversations/:otherUserId`
- `GET /messages/conversation/:otherUserId`
- `GET /messages/group/:groupId`
- `GET /messages/unread/count`
- `GET /messages/search?q=...`
- `POST /messages/mark-as-read`
- `PATCH /messages/:id/read`
- `GET /messages/:id`
- `PATCH /messages/:id`
- `DELETE /messages/:id`

### Fonctionnement

- les messages directs relient deux utilisateurs
- les messages de groupe peuvent être rattachés à un groupe
- la messagerie supporte plusieurs types de contenu : texte, image, fichier, audio, vidéo
- les messages peuvent être marqués comme lus
- la recherche et les conversations sont exposées via REST

### Temps réel

`messages.gateway.ts` ajoute un canal Socket.IO dédié à la messagerie :

- authentification du socket via JWT
- émission d’un message envoyé
- diffusion des nouveaux messages au destinataire
- édition et suppression en temps réel
- indicateurs de saisie (`typing`)
- prise en charge des salles utilisateur et groupe
- marquage des messages lus avec notification côté émission

---

## 7. Notifications

Le module `notifications` gère les alertes utilisateur.

### Routes principales

- `POST /notifications`
- `GET /notifications`
- `GET /notifications?userId=:id`
- `GET /notifications/:id`
- `PATCH /notifications/:id`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/user/:userId/read-all`
- `DELETE /notifications/:id`

### Fonctions

- créer une notification
- lister les notifications globalement ou par utilisateur
- marquer une notification comme lue
- marquer toutes les notifications d’un utilisateur comme lues
- supprimer une notification

---

## 8. Uploads

Le module `uploads` permet l’envoi de fichiers vers le backend.

### Routes principales

- `POST /uploads/profile`
- `POST /uploads/posts`

### Cas d’usage

- upload d’une image de profil
- upload de plusieurs images pour une publication

### Comportement

- les fichiers sont gérés par Multer
- les fichiers sont exposés ensuite via `/uploads/...`
- le serveur sert les fichiers statiques depuis le dossier `uploads/`

---

## 9. Appels temps réel / WebRTC

Le gateway `webrtc.gateway.ts` gère le signalement des appels audio/vidéo.

### Namespace

- `/webrtc`

### Événements principaux

- `call:request`
- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:reject`
- `call:end`
- `call:status`

### Fonctionnement

- le socket est authentifié par JWT
- chaque utilisateur rejoint une room personnelle `user_<id>`
- les messages de signalement sont relayés vers l’utilisateur cible
- l’état d’appel actif est conservé en mémoire pour éviter les collisions
- une déconnexion met fin à l’appel en cours si nécessaire

---

## Modèle de données

La base PostgreSQL est gérée via migrations TypeORM.

### Entités / tables principales

- `users`
- `posts`
- `comments`
- `groups`
- `messages`
- `notifications`
- `follow_requests`

### Tables de liaison

- `user_followers`
- `group_members`
- `group_join_requests`
- `post_shares`
- `post_tagged_users`

### Points importants

- clés primaires UUID
- relations en cascade sur de nombreux liens métier
- index sur les champs les plus consultés
- support des champs JSON pour certaines données dynamiques

### Migration actuelle

Le projet utilise une migration initiale complète qui crée l’ensemble du schéma attendu dans Neon. Cela permet de repartir d’une base propre et cohérente lors du déploiement.

---

## Sécurité et validation

### Validation d’entrée

- `ValidationPipe` global
- suppression des champs non autorisés
- transformation automatique des payloads

### CORS

- en développement : ouverture large pour simplifier les tests
- en production : restriction à `FRONTEND_URL`

### Protection contre le spam

- `ThrottlerGuard` global
- limitation renforcée sur les routes d’authentification

### Authentification

- JWT pour les routes privées
- Google OAuth pour l’authentification sociale

---

## Configuration et environnement

L’application lit ses variables d’environnement via `ConfigModule`.

### Variables importantes

- `NODE_ENV`
- `PORT`
- `FRONTEND_URL`
- `DATABASE_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`

### Comportement de configuration

- `DATABASE_URL` est prioritaire pour la connexion PostgreSQL
- les variables individuelles restent utilisables en local
- les logs de démarrage affichent les valeurs sensibles sous forme masquée pour le debug

---

## Déploiement

### Environnement cible

- **Frontend** : Vercel
- **Backend** : Render
- **Base de données** : Neon PostgreSQL

### Commandes de build / lancement

- `npm ci --include=dev && npm run build && npm run migration:run`
- `node dist/main.js`

### Vérifications au démarrage

- les migrations sont appliquées avant le lancement de l’API
- le backend écoute sur le port fourni par l’environnement
- le endpoint `/health` confirme que le service est disponible

---

## Endpoints utiles

### Général

- `GET /` → réponse simple de disponibilité
- `GET /health` → statut du service

### Authentification

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile`
- `GET /auth/google`
- `GET /auth/google/callback`

### Utilisateurs

- `GET /users/me`
- `PUT /users/me`
- `DELETE /users/me`

### Publications et interactions

- `POST /posts`
- `POST /comments`
- `PUT /posts/:id/reactions/:emoji/:userId`
- `PUT /comments/:id/reactions/:emoji/:userId`

### Messagerie

- `GET /messages/conversations`
- `GET /messages/conversation/:otherUserId`
- `POST /messages/mark-as-read`

### Uploads

- `POST /uploads/profile`
- `POST /uploads/posts`

---

## Résumé fonctionnel

Koziko Backend est une API sociale complète qui combine :

- gestion d’identité et d’authentification
- profils et relations sociales
- publications et commentaires
- groupes communautaires
- messagerie privée et de groupe
- notifications
- uploads d’images
- appels temps réel
- persistance PostgreSQL gérée par migrations

Le backend est conçu pour fonctionner en production avec une configuration stricte des origines CORS, une base Neon, et un déploiement Render automatisé.
