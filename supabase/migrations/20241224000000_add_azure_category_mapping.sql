-- Add Azure category mapping fields to expenses table
DO $$ 
BEGIN
    -- Add suggested_category_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'suggested_category_id') THEN
        ALTER TABLE expenses ADD COLUMN suggested_category_id UUID;
        ALTER TABLE expenses ADD CONSTRAINT fk_expenses_suggested_category FOREIGN KEY (suggested_category_id) REFERENCES categories(id);
    END IF;

    -- Add suggested_category_confidence column if it doesn't exist  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'suggested_category_confidence') THEN
        ALTER TABLE expenses ADD COLUMN suggested_category_confidence DECIMAL(4,3);
    END IF;

    -- Add suggested_category_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'suggested_category_method') THEN
        ALTER TABLE expenses ADD COLUMN suggested_category_method TEXT;
        ALTER TABLE expenses ADD CONSTRAINT chk_suggested_category_method CHECK (suggested_category_method IN ('rule_based', 'semantic', 'hybrid'));
    END IF;
END $$;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_expenses_suggested_category ON public.expenses(suggested_category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_confidence ON public.expenses(suggested_category_confidence);

-- Add comment for documentation
COMMENT ON COLUMN public.expenses.suggested_category_id IS 'Azure AI suggested category for this expense';
COMMENT ON COLUMN public.expenses.suggested_category_confidence IS 'Confidence score from Azure AI (0.000-1.000)';
COMMENT ON COLUMN public.expenses.suggested_category_method IS 'Method used for category suggestion (rule_based, semantic, hybrid)';
