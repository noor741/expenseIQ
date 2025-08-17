-- Category Learning Migration
-- Creates table to store user category corrections for machine learning

-- Create category_corrections table for learning from user feedback
CREATE TABLE IF NOT EXISTS category_corrections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_name TEXT,
    suggested_category UUID REFERENCES categories(id) ON DELETE CASCADE,
    actual_category UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    correction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_category_corrections_user_id ON category_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_category_corrections_merchant ON category_corrections(merchant_name);
CREATE INDEX IF NOT EXISTS idx_category_corrections_date ON category_corrections(correction_date);

-- Enable RLS
ALTER TABLE category_corrections ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for category corrections
CREATE POLICY "Users can manage their own category corrections" ON category_corrections
    FOR ALL USING (auth.uid() = user_id);

-- Add a column to receipts table to store suggested category and confidence
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'receipts' 
        AND column_name = 'suggested_category_id'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added suggested_category_id column to receipts table';
    ELSE
        RAISE NOTICE 'suggested_category_id column already exists in receipts table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'receipts' 
        AND column_name = 'category_confidence'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN category_confidence DECIMAL(3,2) DEFAULT 0.0;
        
        RAISE NOTICE 'Added category_confidence column to receipts table';
    ELSE
        RAISE NOTICE 'category_confidence column already exists in receipts table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'receipts' 
        AND column_name = 'category_reasoning'
    ) THEN
        ALTER TABLE receipts 
        ADD COLUMN category_reasoning TEXT;
        
        RAISE NOTICE 'Added category_reasoning column to receipts table';
    ELSE
        RAISE NOTICE 'category_reasoning column already exists in receipts table';
    END IF;
END $$;

-- Add same fields to expenses table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'suggested_category_id'
    ) THEN
        ALTER TABLE expenses 
        ADD COLUMN suggested_category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Added suggested_category_id column to expenses table';
    ELSE
        RAISE NOTICE 'suggested_category_id column already exists in expenses table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'category_confidence'
    ) THEN
        ALTER TABLE expenses 
        ADD COLUMN category_confidence DECIMAL(3,2) DEFAULT 0.0;
        
        RAISE NOTICE 'Added category_confidence column to expenses table';
    ELSE
        RAISE NOTICE 'category_confidence column already exists in expenses table';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'category_reasoning'
    ) THEN
        ALTER TABLE expenses 
        ADD COLUMN category_reasoning TEXT;
        
        RAISE NOTICE 'Added category_reasoning column to expenses table';
    ELSE
        RAISE NOTICE 'category_reasoning column already exists in expenses table';
    END IF;
END $$;
