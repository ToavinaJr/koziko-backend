import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationColumns1716990000000 implements MigrationInterface {
  name = 'AddNotificationColumns1716990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add nullable columns that exist in the entity but were missing in the initial migration
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "fromUserId" uuid`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "postId" uuid`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "groupId" uuid`);

    // Add foreign key constraints only if they don't exist and the referenced tables exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_from_user') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            ALTER TABLE "notifications"
              ADD CONSTRAINT fk_notifications_from_user
              FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL;
          END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_post') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
            ALTER TABLE "notifications"
              ADD CONSTRAINT fk_notifications_post
              FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL;
          END IF;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_group') THEN
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
            ALTER TABLE "notifications"
              ADD CONSTRAINT fk_notifications_group
              FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL;
          END IF;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove constraints if they exist, then drop columns
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_from_user') THEN
          ALTER TABLE "notifications" DROP CONSTRAINT fk_notifications_from_user;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_post') THEN
          ALTER TABLE "notifications" DROP CONSTRAINT fk_notifications_post;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_group') THEN
          ALTER TABLE "notifications" DROP CONSTRAINT fk_notifications_group;
        END IF;
      END$$;
    `);

    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "groupId"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "postId"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "fromUserId"`);
  }
}
