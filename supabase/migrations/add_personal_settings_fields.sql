-- Personal Settings Migration
-- Ensures users table has all required fields for the personal settings page

-- Add phone_number column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN phone_number VARCHAR(20);
        
        RAISE NOTICE 'Added phone_number column to users table';
    ELSE
        RAISE NOTICE 'phone_number column already exists in users table';
    END IF;
END $$;

-- Add full_name column if it doesn't exist (for display consistency)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN full_name VARCHAR(255);
        
        RAISE NOTICE 'Added full_name column to users table';
    ELSE
        RAISE NOTICE 'full_name column already exists in users table';
    END IF;
END $$;

-- Add preferred_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preferred_name'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN preferred_name VARCHAR(100);
        
        RAISE NOTICE 'Added preferred_name column to users table';
    ELSE
        RAISE NOTICE 'preferred_name column already exists in users table';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN users.phone_number IS 'User phone number for account recovery and notifications';
COMMENT ON COLUMN users.full_name IS 'User full legal name';
COMMENT ON COLUMN users.preferred_name IS 'User preferred display name';
