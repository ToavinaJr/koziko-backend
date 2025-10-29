-- Script pour supprimer TOUTES les données de la base de données
-- ATTENTION: Cela va supprimer TOUTES les données mais garder la structure des tables!

BEGIN;

-- Désactiver temporairement les contraintes de clés étrangères
SET CONSTRAINTS ALL DEFERRED;

-- Supprimer toutes les données des tables (dans l'ordre inverse des dépendances)
TRUNCATE TABLE "notifications" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "comments" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "messages" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "posts" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "follow_requests" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "user_followers" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "group_members" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "groups" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;

COMMIT;

-- Vérifier que les tables sont vides
SELECT 'users' as table_name, COUNT(*) as count FROM "users"
UNION ALL
SELECT 'groups', COUNT(*) FROM "groups"
UNION ALL
SELECT 'messages', COUNT(*) FROM "messages"
UNION ALL
SELECT 'posts', COUNT(*) FROM "posts"
UNION ALL
SELECT 'comments', COUNT(*) FROM "comments"
UNION ALL
SELECT 'notifications', COUNT(*) FROM "notifications";
