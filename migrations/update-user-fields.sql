-- Migration pour mettre à jour la table users
-- De: name, profilePicture
-- Vers: username, fullName, avatarUrl

BEGIN;

-- Vérifier si les colonnes existent avant de les modifier
DO $$ 
BEGIN
    -- Renommer 'name' en 'username' si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users RENAME COLUMN name TO username;
    END IF;

    -- Ajouter 'fullName' si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'fullName'
    ) THEN
        ALTER TABLE users ADD COLUMN "fullName" VARCHAR NOT NULL DEFAULT '';
        -- Copier les données de username vers fullName
        UPDATE users SET "fullName" = username;
    END IF;

    -- Renommer 'profilePicture' en 'avatarUrl' si elle existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profilePicture'
    ) THEN
        ALTER TABLE users RENAME COLUMN "profilePicture" TO "avatarUrl";
    END IF;
END $$;

COMMIT;

-- Vérifier les résultats
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
