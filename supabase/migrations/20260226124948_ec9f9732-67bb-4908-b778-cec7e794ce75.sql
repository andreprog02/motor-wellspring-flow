
ALTER TABLE inventory_items 
  ADD COLUMN IF NOT EXISTS aplicacao text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gerador text NOT NULL DEFAULT '';

ALTER TABLE inventory_items ALTER COLUMN manufacturer_id DROP NOT NULL;
ALTER TABLE inventory_items ALTER COLUMN manufacturer_id SET DEFAULT NULL;
