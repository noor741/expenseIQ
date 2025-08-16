# Database Migration: Add Preferences Column

## Problem
The `users` table is missing the `preferences` column that the application expects for storing user preferences like default currency.

## Error Message
```
❌ Error fetching existing preferences: {"code": "42703", "details": null, "hint": null, "message": "column users.preferences does not exist"}
```

## Solution Options

### Option 1: Run SQL Migration (Recommended)

Execute this SQL in your Supabase SQL Editor:

```sql
-- Add preferences column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN(preferences);

-- Update existing users to have default empty preferences
UPDATE users 
SET preferences = '{}'::jsonb 
WHERE preferences IS NULL;

-- Add documentation comment
COMMENT ON COLUMN users.preferences IS 'User preferences stored as JSONB. Includes settings like defaultCurrency, notifications, etc.';
```

### Option 2: Use Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Table Editor → `users` table
3. Click "Add Column"
4. Configure:
   - **Name**: `preferences`
   - **Type**: `jsonb`
   - **Default Value**: `'{}'::jsonb`
   - **Nullable**: Yes (will be converted to default)

### Option 3: Alternative Storage Approach

If you cannot modify the database schema, we can store preferences in a separate table:

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_currency VARCHAR(3) DEFAULT 'USD',
  notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one preferences record per user
  UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);
```

## Verification

After running the migration, verify with:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'preferences';

-- Test insert
INSERT INTO users (email, preferences) 
VALUES ('test@example.com', '{"defaultCurrency": "INR"}'::jsonb)
ON CONFLICT (email) DO NOTHING;
```

## Next Steps

1. Run the migration SQL in Supabase
2. Test currency selection in the app
3. Verify preferences are saved correctly
