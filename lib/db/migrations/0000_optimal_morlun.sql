CREATE TABLE "app_log"
(
    "id"         uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "time"       timestamp with time zone DEFAULT now(),
    "level"      text                     DEFAULT 'debug'           NOT NULL,
    "module"     text,
    "stacktrace" text,
    "request"    jsonb,
    "response"   jsonb,
    "user_id"    uuid,
    "url"        text,
    "tag"        text,
    "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auth.users"
(
    "id"         uuid PRIMARY KEY NOT NULL,
    "email"      text,
    "created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "charts"
(
    "id"                 bigserial PRIMARY KEY                  NOT NULL,
    "name"               text                                   NOT NULL,
    "description"        text,
    "owner_email"        text                                   NOT NULL,
    "owner_id"           uuid,
    "state_json"         jsonb                                  NOT NULL,
    "created_at"         timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at"         timestamp with time zone DEFAULT now() NOT NULL,
    "data_connection_id" bigserial                              NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_charts"
(
    "chart_id"   bigserial                              NOT NULL,
    "position"   jsonb                                  NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "tab_id"     uuid                                   NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_tab"
(
    "id"           uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "dashboard_id" uuid                                               NOT NULL,
    "name"         text                                               NOT NULL,
    "position"     integer                  DEFAULT 0                 NOT NULL,
    "created_at"   timestamp with time zone DEFAULT now()             NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards"
(
    "id"         uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "name"       text                                               NOT NULL,
    "owner_id"   uuid                                               NOT NULL,
    "is_public"  boolean                  DEFAULT false             NOT NULL,
    "password"   text,
    "created_at" timestamp with time zone DEFAULT now()             NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_queue"
(
    "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "report_id"       uuid                                       NOT NULL,
    "scheduled_for"   timestamp with time zone                   NOT NULL,
    "delivery_status" text             DEFAULT 'PENDING'         NOT NULL,
    "attempt_count"   integer          DEFAULT 0                 NOT NULL,
    "error_message"   text,
    "processed_at"    timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations"
(
    "id"           uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "name"         text                                               NOT NULL,
    "viewer_count" integer                  DEFAULT 0                 NOT NULL,
    "created_at"   timestamp with time zone DEFAULT now()             NOT NULL,
    "created_by"   uuid
);
--> statement-breakpoint
CREATE TABLE "profiles"
(
    "user_id"         uuid PRIMARY KEY                       NOT NULL,
    "first_name"      text,
    "last_name"       text,
    "role"            text                                   NOT NULL,
    "organization_id" uuid,
    "created_at"      timestamp with time zone DEFAULT now() NOT NULL,
    "avatar_url"      text,
    "viewer_type"     text,
    "group_name"      text
);
--> statement-breakpoint
CREATE TABLE "reports"
(
    "id"               uuid PRIMARY KEY         DEFAULT gen_random_uuid() NOT NULL,
    "created_at"       timestamp with time zone DEFAULT now()             NOT NULL,
    "user_id"          uuid                                               NOT NULL,
    "report_title"     text                                               NOT NULL,
    "recipients"       jsonb                                              NOT NULL,
    "email_subject"    text                                               NOT NULL,
    "email_message"    text,
    "scope"            text                                               NOT NULL,
    "time_frame"       text                                               NOT NULL,
    "formats"          jsonb                                              NOT NULL,
    "interval"         text                                               NOT NULL,
    "send_time"        text                                               NOT NULL,
    "timezone"         text                                               NOT NULL,
    "day_of_week"      jsonb,
    "status"           text                     DEFAULT 'Active'          NOT NULL,
    "dashboard_id"     uuid,
    "tab_id"           uuid,
    "formats_metadata" jsonb,
    "next_run_at"      timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "viewers"
(
    "user_id"         uuid PRIMARY KEY                       NOT NULL,
    "organization_id" uuid                                   NOT NULL,
    "first_name"      text,
    "last_name"       text,
    "viewer_type"     text,
    "group_name"      text,
    "created_at"      timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_log"
    ADD CONSTRAINT "app_log_user_id_auth.users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth.users" ("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_charts"
    ADD CONSTRAINT "dashboard_charts_chart_id_charts_id_fk" FOREIGN KEY ("chart_id") REFERENCES "public"."charts" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_charts"
    ADD CONSTRAINT "dashboard_charts_tab_id_dashboard_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."dashboard_tab" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_tab"
    ADD CONSTRAINT "dashboard_tab_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards"
    ADD CONSTRAINT "dashboards_owner_id_auth.users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."auth.users" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue"
    ADD CONSTRAINT "email_queue_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations"
    ADD CONSTRAINT "organizations_created_by_auth.users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."auth.users" ("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"
    ADD CONSTRAINT "profiles_user_id_auth.users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth.users" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles"
    ADD CONSTRAINT "profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations" ("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports"
    ADD CONSTRAINT "reports_user_id_auth.users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth.users" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports"
    ADD CONSTRAINT "reports_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports"
    ADD CONSTRAINT "reports_tab_id_dashboard_tab_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."dashboard_tab" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewers"
    ADD CONSTRAINT "viewers_user_id_auth.users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth.users" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewers"
    ADD CONSTRAINT "viewers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations" ("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_log_level" ON "app_log" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_app_log_time" ON "app_log" USING btree ("time");--> statement-breakpoint
CREATE INDEX "idx_app_log_user_id" ON "app_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reporting_reports_owner_email_idx" ON "charts" USING btree ("owner_email");--> statement-breakpoint
CREATE INDEX "reporting_reports_owner_id_idx" ON "charts" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_charts_data_connection_id" ON "charts" USING btree ("data_connection_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_charts_chart_id" ON "dashboard_charts" USING btree ("chart_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_charts_tab_id" ON "dashboard_charts" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_tab_dashboard_id" ON "dashboard_tab" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "idx_dashboard_tab_position" ON "dashboard_tab" USING btree ("dashboard_id", "position");--> statement-breakpoint
CREATE INDEX "idx_dashboards_owner_id" ON "dashboards" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_dashboards_is_public" ON "dashboards" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_email_queue_report_id" ON "email_queue" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "idx_email_queue_scheduled_for" ON "email_queue" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_email_queue_delivery_status" ON "email_queue" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "idx_email_queue_cron_lookup" ON "email_queue" USING btree ("scheduled_for", "delivery_status");--> statement-breakpoint
CREATE INDEX "idx_profiles_role" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_profiles_organization_id" ON "profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_reports_user_id" ON "reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reports_status" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reports_interval" ON "reports" USING btree ("interval");--> statement-breakpoint
CREATE INDEX "idx_reports_dashboard_id" ON "reports" USING btree ("dashboard_id");--> statement-breakpoint
CREATE INDEX "idx_reports_tab_id" ON "reports" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "idx_viewers_organization_id" ON "viewers" USING btree ("organization_id");