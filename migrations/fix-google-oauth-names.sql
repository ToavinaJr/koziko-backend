-- Fix users with "undefined" in their fullName from Google OAuth
UPDATE "users"
SET "fullName" = REPLACE("fullName", ' undefined', '')
WHERE "fullName" LIKE '% undefined%';

UPDATE "users"
SET "fullName" = REPLACE("fullName", 'undefined ', '')
WHERE "fullName" LIKE 'undefined %';

UPDATE "users"                                                                                                                                                                                                                                                                                                                          
SET "fullName" = SPLIT_PART("email", '@', 1)
WHERE "fullName" = 'undefined' OR "fullName" IS NULL OR "fullName" = '';

-- Display affected users
SELECT id, email, username, "fullName" 
FROM "users" 
WHERE "fullName" LIKE '%undefined%' OR "fullName" IS NULL OR "fullName" = '';
