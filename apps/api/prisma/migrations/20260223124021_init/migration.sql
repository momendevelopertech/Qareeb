-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "HalqaType" AS ENUM ('men', 'women', 'children', 'mixed');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('flooring', 'ac', 'plumbing', 'painting', 'furniture', 'electrical', 'other');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'full_reviewer', 'imam_reviewer', 'halqa_reviewer', 'maintenance_reviewer');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imams" (
    "id" UUID NOT NULL,
    "imam_name" VARCHAR(120) NOT NULL,
    "mosque_name" VARCHAR(200) NOT NULL,
    "governorate" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "whatsapp" VARCHAR(20) NOT NULL,
    "recitation_url" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "submitted_by_ip" TEXT,
    "admin_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "imams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "halaqat" (
    "id" UUID NOT NULL,
    "circle_name" VARCHAR(200) NOT NULL,
    "mosque_name" VARCHAR(200) NOT NULL,
    "halqa_type" "HalqaType" NOT NULL,
    "governorate" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "whatsapp" VARCHAR(20) NOT NULL,
    "additional_info" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "admin_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "halaqat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_requests" (
    "id" UUID NOT NULL,
    "mosque_name" VARCHAR(200) NOT NULL,
    "governorate" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "maintenance_types" "MaintenanceType"[],
    "description" TEXT NOT NULL,
    "estimated_cost_min" INTEGER,
    "estimated_cost_max" INTEGER,
    "whatsapp" VARCHAR(20) NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "admin_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(30) NOT NULL,
    "entity_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "media_type" VARCHAR(10) NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "imams_status_idx" ON "imams"("status");

-- CreateIndex
CREATE INDEX "imams_governorate_idx" ON "imams"("governorate");

-- CreateIndex
CREATE INDEX "halaqat_halqa_type_idx" ON "halaqat"("halqa_type");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imams" ADD CONSTRAINT "imams_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "halaqat" ADD CONSTRAINT "halaqat_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "fk_media_imam" FOREIGN KEY ("entity_id") REFERENCES "imams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "fk_media_halqa" FOREIGN KEY ("entity_id") REFERENCES "halaqat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "fk_media_maintenance" FOREIGN KEY ("entity_id") REFERENCES "maintenance_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
