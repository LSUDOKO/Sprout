CREATE TABLE "auth_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"challenge" text NOT NULL,
	"purpose" text NOT NULL,
	"user_id" text,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "auth_challenges_challenge_unique" UNIQUE("challenge"),
	CONSTRAINT "auth_challenges_purpose" CHECK ("auth_challenges"."purpose" in ('signin','link','join'))
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "demo_balances" (
	"address" text PRIMARY KEY NOT NULL,
	"balance_luna" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_chain_txs" (
	"hash" text PRIMARY KEY NOT NULL,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"value_luna" bigint NOT NULL,
	"recipient_data" text,
	"block_number" integer NOT NULL,
	"executed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_stakers" (
	"address" text PRIMARY KEY NOT NULL,
	"active_luna" bigint DEFAULT 0 NOT NULL,
	"inactive_luna" bigint DEFAULT 0 NOT NULL,
	"retired_luna" bigint DEFAULT 0 NOT NULL,
	"inactive_release" integer,
	"delegation" text
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_user_id_item_id_pk" PRIMARY KEY("user_id","item_id")
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"user_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stage" text DEFAULT 'seed' NOT NULL,
	"max_stage" text DEFAULT 'seed' NOT NULL,
	"hat" text,
	"neck" text,
	"face" text,
	"background" text,
	"effect" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saves" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tx_hash" text NOT NULL,
	"kind" text NOT NULL,
	"value_luna" bigint NOT NULL,
	"from_address" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"block_number" integer,
	"week_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"fail_reason" text,
	"result_json" text,
	CONSTRAINT "saves_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "saves_kind" CHECK ("saves"."kind" in ('plant','feed','treat_plant')),
	CONSTRAINT "saves_status" CHECK ("saves"."status" in ('pending','confirmed','failed','needs_link'))
);
--> statement-breakpoint
CREATE TABLE "sparks_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squad_members" (
	"squad_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "squad_members_squad_id_user_id_pk" PRIMARY KEY("squad_id","user_id"),
	CONSTRAINT "squad_members_role" CHECK ("squad_members"."role" in ('admin','member'))
);
--> statement-breakpoint
CREATE TABLE "squad_weeks" (
	"squad_id" text NOT NULL,
	"week_key" text NOT NULL,
	"perfect" boolean NOT NULL,
	CONSTRAINT "squad_weeks_squad_id_week_key_pk" PRIMARY KEY("squad_id","week_key")
);
--> statement-breakpoint
CREATE TABLE "squads" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"created_by" text NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "squads_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "staker_cache" (
	"address" text PRIMARY KEY NOT NULL,
	"active_luna" bigint NOT NULL,
	"inactive_luna" bigint NOT NULL,
	"retired_luna" bigint NOT NULL,
	"inactive_release" integer,
	"delegation" text,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"user_id" text PRIMARY KEY NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"best" integer DEFAULT 0 NOT NULL,
	"kept_total" integer DEFAULT 0 NOT NULL,
	"previous" integer DEFAULT 0 NOT NULL,
	"last_kept_week" text
);
--> statement-breakpoint
CREATE TABLE "treats" (
	"id" text PRIMARY KEY NOT NULL,
	"squad_id" text NOT NULL,
	"from_user" text NOT NULL,
	"to_user" text NOT NULL,
	"tx_hash" text NOT NULL,
	"value_luna" bigint NOT NULL,
	"note" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"fail_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"seen_at" timestamp with time zone,
	"planted_save_id" text,
	"thanked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "treats_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"address" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"public_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"primary_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"locale" text,
	"weekly_goal_luna" bigint DEFAULT 50000000 NOT NULL,
	"next_weekly_goal_luna" bigint,
	"next_goal_week" text,
	"earned_at_last_visit_luna" bigint,
	"device_id_hash" text,
	"clock_offset_ms" bigint DEFAULT 0 NOT NULL,
	"delegation" text,
	"first_planted_week" text,
	"planted_at" timestamp with time zone,
	"staker_created_by_sprout" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"user_id" text NOT NULL,
	"week_key" text NOT NULL,
	"goal_luna" bigint NOT NULL,
	"saved_luna" bigint DEFAULT 0 NOT NULL,
	"kept" boolean DEFAULT false NOT NULL,
	CONSTRAINT "weeks_user_id_week_key_pk" PRIMARY KEY("user_id","week_key")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"step" text NOT NULL,
	"tx_hash" text NOT NULL,
	"value_luna" bigint NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"fail_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "withdrawals_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "withdrawals_step" CHECK ("withdrawals"."step" in ('deactivate','retire','remove'))
);
--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sparks_ledger" ADD CONSTRAINT "sparks_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_members" ADD CONSTRAINT "squad_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squad_weeks" ADD CONSTRAINT "squad_weeks_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "squads" ADD CONSTRAINT "squads_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streaks" ADD CONSTRAINT "streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treats" ADD CONSTRAINT "treats_squad_id_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treats" ADD CONSTRAINT "treats_from_user_users_id_fk" FOREIGN KEY ("from_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treats" ADD CONSTRAINT "treats_to_user_users_id_fk" FOREIGN KEY ("to_user") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treats" ADD CONSTRAINT "treats_planted_save_id_saves_id_fk" FOREIGN KEY ("planted_save_id") REFERENCES "public"."saves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saves_user_status_idx" ON "saves" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "saves_week_idx" ON "saves" USING btree ("week_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sparks_idempotent" ON "sparks_ledger" USING btree ("user_id","reason","ref");--> statement-breakpoint
CREATE INDEX "squad_members_user_idx" ON "squad_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "treats_to_status_idx" ON "treats" USING btree ("to_user","status");--> statement-breakpoint
CREATE INDEX "user_addresses_user_idx" ON "user_addresses" USING btree ("user_id");