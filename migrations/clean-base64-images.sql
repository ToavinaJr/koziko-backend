-- Script pour supprimer les posts avec des images en base64
-- À exécuter seulement si vous voulez nettoyer les anciennes données de test

-- Option 1: Supprimer tous les posts avec des images base64
DELETE FROM posts WHERE images::text LIKE '%iVBORw0KG%' OR images::text LIKE '%data:image%';

-- Option 2: Mettre à jour en vidant les images base64
-- UPDATE posts SET images = '[]'::jsonb WHERE images::text LIKE '%iVBORw0KG%' OR images::text LIKE '%data:image%';

-- Vérifier le résultat
SELECT COUNT(*) as remaining_posts FROM posts;
