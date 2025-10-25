-- Script pour réinitialiser complètement la base de données
-- ATTENTION: Cela va supprimer TOUTES les données!

BEGIN;

-- Supprimer toutes les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "comments" CASCADE;
DROP TABLE IF EXISTS "posts" CASCADE;
DROP TABLE IF EXISTS "follow_requests" CASCADE;
DROP TABLE IF EXISTS "user_followers" CASCADE;
DROP TABLE IF EXISTS "group_members" CASCADE;
DROP TABLE IF EXISTS "groups" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

COMMIT;

-- Les tables seront recréées automatiquement par TypeORM au prochain démarrage
-- grâce à synchronize: true en mode développement
