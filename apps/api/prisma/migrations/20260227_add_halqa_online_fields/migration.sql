-- AddHalqaOnlineFields
-- Add isOnline and onlineLink columns to halaqat table

ALTER TABLE "halaqat" ADD COLUMN "is_online" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "halaqat" ADD COLUMN "online_link" VARCHAR(500);
