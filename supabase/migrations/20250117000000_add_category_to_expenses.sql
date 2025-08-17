-- Add category support to expenses table
-- This adds a simple category_id reference for AI-powered categorization

-- Add category_id column to expenses table
ALTER TABLE expenses ADD COLUMN category_id UUID;

-- Add foreign key constraint for category_id
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_category 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
