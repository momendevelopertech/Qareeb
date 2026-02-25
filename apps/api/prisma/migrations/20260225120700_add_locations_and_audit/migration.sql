-- AlterEnum
BEGIN;
CREATE TYPE "MaintenanceType_new" AS ENUM ('Plumbing', 'Electrical', 'Carpentry', 'Painting', 'AC_Repair', 'Cleaning', 'Other');
ALTER TABLE "maintenance_requests" ALTER COLUMN "maintenance_types" TYPE "MaintenanceType_new"[] USING ("maintenance_types"::text::"MaintenanceType_new"[]);
ALTER TYPE "MaintenanceType" RENAME TO "MaintenanceType_old";
ALTER TYPE "MaintenanceType_new" RENAME TO "MaintenanceType";
DROP TYPE "MaintenanceType_old";
COMMIT;

-- AlterTable
ALTER TABLE "halaqat" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "google_maps_url" TEXT,
ADD COLUMN     "video_url" TEXT;

-- AlterTable
ALTER TABLE "imams" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "google_maps_url" TEXT,
ADD COLUMN     "video_url" TEXT;

-- AlterTable
ALTER TABLE "maintenance_requests" ADD COLUMN     "area_id" UUID,
ADD COLUMN     "google_maps_url" TEXT;

-- CreateTable
CREATE TABLE "governorates" (
    "id" UUID NOT NULL,
    "nameAr" VARCHAR(120) NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "governorates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "nameAr" VARCHAR(120) NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "governorate_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "governorates_nameAr_key" ON "governorates"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "governorates_nameEn_key" ON "governorates"("nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "areas_governorate_id_nameAr_key" ON "areas"("governorate_id", "nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "areas_governorate_id_nameEn_key" ON "areas"("governorate_id", "nameEn");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_governorate_id_fkey" FOREIGN KEY ("governorate_id") REFERENCES "governorates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imams" ADD CONSTRAINT "imams_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halaqat" ADD CONSTRAINT "halaqat_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

