-- Migration: Convert grid-based positions to pixel-based positions
-- gridX * 100 -> left (assuming 1200px width / 12 columns)
-- gridY * 30 -> top (assuming 30px row height)
-- gridW * 100 -> width
-- gridH * 30 -> height

UPDATE public.dashboard_widgets
SET position = jsonb_build_object(
  'left', (position->>'x')::int * 100,
  'top', (position->>'y')::int * 30,
  'width', (position->>'w')::int * 100,
  'height', (position->>'h')::int * 30
)
WHERE position ? 'x' AND position ? 'y';

-- Add a comment to the column to reflect the change
COMMENT ON COLUMN public.dashboard_widgets.position IS 'Widget position in pixels: {left: number, top: number, width: number, height: number}';
