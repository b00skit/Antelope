CREATE TABLE IF NOT EXISTS "sessions" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "csrf_token" text NOT NULL,
    "gtaw_access_token" text,
    "created_at" integer,
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
);
