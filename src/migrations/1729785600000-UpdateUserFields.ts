import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserFields1729785600000 implements MigrationInterface {
    name = 'UpdateUserFields1729785600000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Renommer la colonne 'name' en 'username'
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "name" TO "username"`);
        
        // Ajouter la colonne 'fullName'
        await queryRunner.query(`ALTER TABLE "users" ADD "fullName" character varying NOT NULL DEFAULT ''`);
        
        // Copier les données de username vers fullName
        await queryRunner.query(`UPDATE "users" SET "fullName" = "username"`);
        
        // Renommer la colonne 'profilePicture' en 'avatarUrl'
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "profilePicture" TO "avatarUrl"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Renommer 'avatarUrl' en 'profilePicture'
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "avatarUrl" TO "profilePicture"`);
        
        // Supprimer la colonne 'fullName'
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "fullName"`);
        
        // Renommer 'username' en 'name'
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "username" TO "name"`);
    }
}
