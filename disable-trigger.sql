-- Disable the automatic expense creation trigger
-- This trigger was conflicting with our edge function approach
-- and creating expenses with hardcoded 'USD' currency

DROP TRIGGER IF EXISTS trigger_create_expense_from_receipt ON receipts;

-- Optional: Also drop the function if not needed elsewhere
-- DROP FUNCTION IF EXISTS create_expense_from_receipt();
