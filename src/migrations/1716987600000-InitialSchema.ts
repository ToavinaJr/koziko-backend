import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1716987600000 implements MigrationInterface {
  name = 'InitialSchema1716987600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" character varying UNIQUE NOT NULL,
        "password" character varying NOT NULL,
        "username" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "bio" character varying,
        "avatarUrl" character varying,
        "address" character varying,
        "dateOfBirth" date,
        "isAnonymous" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_followers junction table
    await queryRunner.query(`
      CREATE TABLE "user_followers" (
        "userId" uuid NOT NULL,
        "followerId" uuid NOT NULL,
        PRIMARY KEY ("userId", "followerId"),
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create groups table
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "description" text NOT NULL,
        "coverImage" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdById" uuid NOT NULL,
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create group_members junction table
    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "groupId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        PRIMARY KEY ("groupId", "userId"),
        FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create group_join_requests junction table
    await queryRunner.query(`
      CREATE TABLE "group_join_requests" (
        "groupId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        PRIMARY KEY ("groupId", "userId"),
        FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create posts table
    await queryRunner.query(`
      CREATE TABLE "posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "content" text NOT NULL,
        "markdown" text,
        "images" text,
        "taggedUserIds" text,
        "isAnonymous" boolean NOT NULL DEFAULT false,
        "reactions" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "authorId" uuid NOT NULL,
        "groupId" uuid,
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
      )
    `);

    // Create post_shares junction table
    await queryRunner.query(`
      CREATE TABLE "post_shares" (
        "postsId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        PRIMARY KEY ("postsId", "userId"),
        FOREIGN KEY ("postsId") REFERENCES "posts"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create post_tagged_users junction table
    await queryRunner.query(`
      CREATE TABLE "post_tagged_users" (
        "postsId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        PRIMARY KEY ("postsId", "userId"),
        FOREIGN KEY ("postsId") REFERENCES "posts"("id") ON DELETE CASCADE,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create comments table
    await queryRunner.query(`
      CREATE TABLE "comments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "content" text NOT NULL,
        "reactions" jsonb NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "authorId" uuid NOT NULL,
        "postId" uuid NOT NULL,
        FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);

    // Create messages table (includes enum for MessageType)
    await queryRunner.query(`
      CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image', 'file', 'audio', 'video')
    `);

    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "content" text,
        "type" "public"."messages_type_enum" NOT NULL DEFAULT 'text',
        "fileUrl" character varying,
        "fileName" character varying,
        "fileSize" integer,
        "isEdited" boolean NOT NULL DEFAULT false,
        "isRead" boolean NOT NULL DEFAULT false,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "senderId" uuid NOT NULL,
        "receiverId" uuid,
        "groupId" uuid,
        "conversationId" character varying,
        FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create notifications table
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" character varying NOT NULL,
        "title" character varying NOT NULL,
        "message" text NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "data" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "userId" uuid NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // Create follow_requests table
    await queryRunner.query(`
      CREATE TABLE "follow_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "status" character varying NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "senderId" uuid NOT NULL,
        "receiverId" uuid NOT NULL,
        FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE,
        UNIQUE("senderId", "receiverId")
      )
    `);

    // Create indices for common queries
    await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users"("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_posts_authorId" ON "posts"("authorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_posts_groupId" ON "posts"("groupId")`);
    await queryRunner.query(`CREATE INDEX "IDX_comments_authorId" ON "comments"("authorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_comments_postId" ON "comments"("postId")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_senderId" ON "messages"("senderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_receiverId" ON "messages"("receiverId")`);
    await queryRunner.query(`CREATE INDEX "IDX_messages_conversationId" ON "messages"("conversationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_notifications_userId" ON "notifications"("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_follow_requests_senderId" ON "follow_requests"("senderId")`);
    await queryRunner.query(`CREATE INDEX "IDX_follow_requests_receiverId" ON "follow_requests"("receiverId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices
    await queryRunner.query(`DROP INDEX "IDX_follow_requests_receiverId"`);
    await queryRunner.query(`DROP INDEX "IDX_follow_requests_senderId"`);
    await queryRunner.query(`DROP INDEX "IDX_notifications_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_conversationId"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_receiverId"`);
    await queryRunner.query(`DROP INDEX "IDX_messages_senderId"`);
    await queryRunner.query(`DROP INDEX "IDX_comments_postId"`);
    await queryRunner.query(`DROP INDEX "IDX_comments_authorId"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_groupId"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_authorId"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);

    // Drop tables in reverse order of creation (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."messages_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_tagged_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_shares"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "posts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "group_join_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "group_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_followers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
