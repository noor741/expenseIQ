-- SQL query to check existing expenses in your database
-- Run this in your Supabase SQL editor to see what's in your database

-- Check all expenses and their currencies
SELECT 
  id,
  merchant_name,
  transaction_date,
  currency,
  total,
  created_at
FROM expenses 
ORDER BY created_at DESC 
LIMIT 20;

-- Count expenses by currency
SELECT 
  currency,
  COUNT(*) as count,
  SUM(total) as total_amount
FROM expenses 
GROUP BY currency
ORDER BY count DESC;

-- Check recent expense creation (today and yesterday)
SELECT 
  id,
  merchant_name,
  currency,
  total,
  created_at
FROM expenses 
WHERE created_at >= NOW() - INTERVAL '2 days'
ORDER BY created_at DESC;

-- Check if there are any processes still creating CAD expenses
-- (This will show recent CAD expenses that might indicate the bug is still there)
SELECT 
  id,
  merchant_name,
  currency,
  total,
  created_at
FROM expenses 
WHERE currency = 'CAD' 
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
