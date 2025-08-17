-- Rollback Azure category mapping changes
-- Removes all category-related columns added for Azure AI integration

-- Remove category-related columns from expenses table
DO $$
BEGIN
    -- Drop constraints first
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_expenses_suggested_category') THEN
        ALTER TABLE expenses DROP CONSTRAINT fk_expenses_suggested_category;
        RAISE NOTICE 'Dropped foreign key constraint fk_expenses_suggested_category from expenses table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chk_suggested_category_method') THEN
        ALTER TABLE expenses DROP CONSTRAINT chk_suggested_category_method;
        RAISE NOTICE 'Dropped check constraint chk_suggested_category_method from expenses table';
    END IF;

    -- Drop columns from expenses table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'suggested_category_id') THEN
        ALTER TABLE expenses DROP COLUMN suggested_category_id;
        RAISE NOTICE 'Dropped suggested_category_id column from expenses table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'suggested_category_confidence') THEN
        ALTER TABLE expenses DROP COLUMN suggested_category_confidence;
        RAISE NOTICE 'Dropped suggested_category_confidence column from expenses table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'suggested_category_method') THEN
        ALTER TABLE expenses DROP COLUMN suggested_category_method;
        RAISE NOTICE 'Dropped suggested_category_method column from expenses table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'category_confidence') THEN
        ALTER TABLE expenses DROP COLUMN category_confidence;
        RAISE NOTICE 'Dropped category_confidence column from expenses table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'category_reasoning') THEN
        ALTER TABLE expenses DROP COLUMN category_reasoning;
        RAISE NOTICE 'Dropped category_reasoning column from expenses table';
    END IF;
END $$;

-- Remove category-related columns from receipts table
DO $$
BEGIN
    -- Drop columns from receipts table
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'suggested_category_id') THEN
        ALTER TABLE receipts DROP COLUMN suggested_category_id;
        RAISE NOTICE 'Dropped suggested_category_id column from receipts table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'category_confidence') THEN
        ALTER TABLE receipts DROP COLUMN category_confidence;
        RAISE NOTICE 'Dropped category_confidence column from receipts table';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'category_reasoning') THEN
        ALTER TABLE receipts DROP COLUMN category_reasoning;
        RAISE NOTICE 'Dropped category_reasoning column from receipts table';
    END IF;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS idx_expenses_suggested_category;
DROP INDEX IF EXISTS idx_expenses_confidence;

-- Drop category_corrections table if it exists
DROP TABLE IF EXISTS category_corrections;

-- Remove any remaining category-related indexes
DROP INDEX IF EXISTS idx_category_corrections_user_id;
DROP INDEX IF EXISTS idx_category_corrections_merchant;
DROP INDEX IF EXISTS idx_category_corrections_date;

-- Successfully completed rollback
SELECT 'Successfully rolled back all Azure category mapping changes' as notice;
