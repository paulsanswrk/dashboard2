-- Add width/height and thumbnail_url for dashboards
ALTER TABLE dashboards
    ADD COLUMN IF NOT EXISTS width integer,
    ADD COLUMN IF NOT EXISTS height integer,
    ADD COLUMN IF NOT EXISTS thumbnail_url text;

