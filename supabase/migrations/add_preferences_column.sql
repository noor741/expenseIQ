-- Add preferences column to users table
-- This migration adds a JSONB column to store user preferences like default currency

-- Add the preferences column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preferences'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN preferences JSONB DEFAULT '{}'::jsonb;
        
        -- Create an index on the preferences column for better performance
        CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN(preferences);
        
        -- Log the success
        RAISE NOTICE 'Added preferences column to users table';
    ELSE
        RAISE NOTICE 'Preferences column already exists in users table';
    END IF;
END $$;

-- Update any existing users to have the default empty preferences if null
UPDATE users 
SET preferences = '{}'::jsonb 
WHERE preferences IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB. Includes settings like defaultCurrency, notifications, etc.';
