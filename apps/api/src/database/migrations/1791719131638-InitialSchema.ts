import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791719131638 implements MigrationInterface {
  name = 'InitialSchema1791719131638';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "email" character varying(255) NOT NULL,
                "password_hash" character varying NOT NULL,
                "display_name" character varying(50) NOT NULL,
                "avatar_url" text,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")
        `);
    await queryRunner.query(`
            CREATE TABLE "conversation_members" (
                "conversation_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "last_read_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5fa9076068b6f2a26fb793d2439" PRIMARY KEY ("conversation_id", "user_id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_a46c76be8f62c4b00a835cdc37" ON "conversation_members" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "conversations" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "type" character varying(10) NOT NULL,
                "title" character varying(80),
                "direct_key" character varying(80),
                "last_message_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_f148dd40b152409d973f6563f96" UNIQUE ("direct_key"),
                CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "user_id" uuid NOT NULL,
                "token_hash" character varying(64) NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "messages" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "conversation_id" uuid NOT NULL,
                "sender_id" uuid NOT NULL,
                "body" text NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5deeed58d981db539765baebd5" ON "messages" ("conversation_id", "created_at", "id")
        `);
    await queryRunner.query(`
            ALTER TABLE "conversation_members"
            ADD CONSTRAINT "FK_36340a1704b039608e34244511f" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "conversation_members"
            ADD CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "messages"
            ADD CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "messages"
            ADD CONSTRAINT "FK_22133395bd13b970ccd0c34ab22" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "messages" DROP CONSTRAINT "FK_22133395bd13b970ccd0c34ab22"
        `);
    await queryRunner.query(`
            ALTER TABLE "messages" DROP CONSTRAINT "FK_3bc55a7c3f9ed54b520bb5cfe23"
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"
        `);
    await queryRunner.query(`
            ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_a46c76be8f62c4b00a835cdc370"
        `);
    await queryRunner.query(`
            ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_36340a1704b039608e34244511f"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5deeed58d981db539765baebd5"
        `);
    await queryRunner.query(`
            DROP TABLE "messages"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"
        `);
    await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
    await queryRunner.query(`
            DROP TABLE "conversations"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_a46c76be8f62c4b00a835cdc37"
        `);
    await queryRunner.query(`
            DROP TABLE "conversation_members"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
