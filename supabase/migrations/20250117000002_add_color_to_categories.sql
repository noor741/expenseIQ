-- Add missing color column to categories table

-- Add color column to categories table  
ALTER TABLE categories ADD COLUMN color VARCHAR(7);

-- Set default color for existing categories
UPDATE categories SET color = '#BDC3C7' WHERE color IS NULL;
