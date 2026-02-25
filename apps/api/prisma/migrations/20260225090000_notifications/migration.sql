-- Create enum for notification type
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM ('imam', 'halqa', 'maintenance');
    END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "reference_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications" ("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications" ("type");
