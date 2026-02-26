-- Media assets are polymorphic and should not enforce three FK constraints on the same entity_id column.
-- Keep entity_type + entity_id logical relation at application level.
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS fk_media_imam;
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS fk_media_halqa;
ALTER TABLE media_assets DROP CONSTRAINT IF EXISTS fk_media_maintenance;
