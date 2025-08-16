-- Enhanced receipt processing with automatic expense creation
-- This SQL script sets up the database functions and triggers for automatic expense creation

-- Note: Run these ALTER TYPE statements one by one if they don't exist
-- ALTER TYPE receipt_status ADD VALUE 'processed_with_warnings';
-- ALTER TYPE receipt_status ADD VALUE 'expense_creation_failed';
-- ALTER TYPE receipt_status ADD VALUE 'expense_created';
-- ALTER TYPE receipt_status ADD VALUE 'processing_failed';

-- Function to automatically create expenses from processed receipts
CREATE OR REPLACE FUNCTION create_expense_from_receipt()
RETURNS TRIGGER AS $$
DECLARE
    ocr_data JSONB;
    merchant_name TEXT;
    transaction_date DATE;
    total_amount DECIMAL(10,2);
    subtotal_amount DECIMAL(10,2);
    tax_amount DECIMAL(10,2);
    new_expense_id UUID;
    item_record JSONB;
    items_array JSONB;
BEGIN
    -- Only process when status changes to 'processed' and raw_ocr_json is present
    IF NEW.status = 'processed' AND NEW.raw_ocr_json IS NOT NULL AND OLD.status != 'processed' THEN
        
        -- Extract OCR data
        ocr_data := NEW.raw_ocr_json;
        
        -- Extract merchant name from OCR data
        merchant_name := COALESCE(
            ocr_data -> 'documents' -> 0 -> 'fields' -> 'MerchantName' ->> 'value',
            'Unknown Merchant'
        );
        
        -- Extract transaction date
        BEGIN
            transaction_date := COALESCE(
                (ocr_data -> 'documents' -> 0 -> 'fields' -> 'TransactionDate' ->> 'value')::DATE,
                CURRENT_DATE
            );
        EXCEPTION WHEN OTHERS THEN
            transaction_date := CURRENT_DATE;
        END;
        
        -- Extract amounts
        total_amount := COALESCE(
            (ocr_data -> 'documents' -> 0 -> 'fields' -> 'Total' ->> 'value')::DECIMAL(10,2),
            0
        );
        
        subtotal_amount := COALESCE(
            (ocr_data -> 'documents' -> 0 -> 'fields' -> 'Subtotal' ->> 'value')::DECIMAL(10,2),
            total_amount
        );
        
        tax_amount := COALESCE(
            (ocr_data -> 'documents' -> 0 -> 'fields' -> 'TotalTax' ->> 'value')::DECIMAL(10,2),
            0
        );
        
        -- Create the expense record
        INSERT INTO expenses (
            receipt_id,
            merchant_name,
            transaction_date,
            currency,
            subtotal,
            tax,
            total,
            created_at
        ) VALUES (
            NEW.id,
            merchant_name,
            transaction_date,
            'CAD', -- Updated to use CAD as default - should be dynamic based on user preference
            subtotal_amount,
            tax_amount,
            total_amount,
            NOW()
        ) RETURNING id INTO new_expense_id;
        
        -- Extract and create expense items
        items_array := ocr_data -> 'documents' -> 0 -> 'fields' -> 'Items' -> 'values';
        
        IF items_array IS NOT NULL AND jsonb_array_length(items_array) > 0 THEN
            -- Process each item
            FOR item_record IN SELECT * FROM jsonb_array_elements(items_array)
            LOOP
                INSERT INTO expense_items (
                    expense_id,
                    item_name,
                    quantity,
                    unit_price,
                    total_price,
                    category,
                    created_at
                ) VALUES (
                    new_expense_id,
                    COALESCE(
                        item_record -> 'properties' -> 'Description' ->> 'value',
                        'Unknown Item'
                    ),
                    COALESCE(
                        (item_record -> 'properties' -> 'Quantity' ->> 'value')::INTEGER,
                        1
                    ),
                    COALESCE(
                        (item_record -> 'properties' -> 'Price' ->> 'value')::DECIMAL(10,2),
                        (item_record -> 'properties' -> 'TotalPrice' ->> 'value')::DECIMAL(10,2),
                        0
                    ),
                    COALESCE(
                        (item_record -> 'properties' -> 'TotalPrice' ->> 'value')::DECIMAL(10,2),
                        (item_record -> 'properties' -> 'Price' ->> 'value')::DECIMAL(10,2),
                        0
                    ),
                    'General', -- Default category
                    NOW()
                );
            END LOOP;
        ELSE
            -- Create a single fallback item if no items were extracted
            INSERT INTO expense_items (
                expense_id,
                item_name,
                quantity,
                unit_price,
                total_price,
                category,
                created_at
            ) VALUES (
                new_expense_id,
                'Purchase from ' || merchant_name,
                1,
                total_amount,
                total_amount,
                'General',
                NOW()
            );
        END IF;
        
        -- Update receipt status to indicate expense creation
        UPDATE receipts 
        SET status = 'expense_created' 
        WHERE id = NEW.id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic expense creation (DISABLED - using Edge Functions instead)
-- DROP TRIGGER IF EXISTS trigger_create_expense_from_receipt ON receipts;
-- CREATE TRIGGER trigger_create_expense_from_receipt
--     AFTER UPDATE ON receipts
--     FOR EACH ROW
--     EXECUTE FUNCTION create_expense_from_receipt();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_user_status ON receipts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expenses_receipt_id ON expenses(receipt_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_expense_id ON expense_items(expense_id);

-- Create a view for complete expense data with receipt info
CREATE OR REPLACE VIEW expense_details AS
SELECT 
    e.*,
    r.file_url as receipt_file_url,
    r.upload_date as receipt_upload_date,
    r.status as receipt_status,
    r.user_id,
    json_agg(
        json_build_object(
            'id', ei.id,
            'item_name', ei.item_name,
            'quantity', ei.quantity,
            'unit_price', ei.unit_price,
            'total_price', ei.total_price,
            'category', ei.category
        ) ORDER BY ei.created_at
    ) as items
FROM expenses e
JOIN receipts r ON e.receipt_id = r.id
LEFT JOIN expense_items ei ON e.id = ei.expense_id
GROUP BY e.id, r.id;

-- Grant appropriate permissions
GRANT SELECT ON expense_details TO authenticated;

-- Function to get expense summary statistics
CREATE OR REPLACE FUNCTION get_expense_stats(user_uuid UUID, start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_expenses', COUNT(*),
        'total_amount', COALESCE(SUM(total), 0),
        'avg_amount', COALESCE(AVG(total), 0),
        'by_merchant', (
            SELECT json_agg(merchant_stats)
            FROM (
                SELECT merchant_name, COUNT(*) as count, SUM(total) as total_amount
                FROM expense_details
                WHERE user_id = user_uuid
                AND (start_date IS NULL OR transaction_date >= start_date)
                AND (end_date IS NULL OR transaction_date <= end_date)
                GROUP BY merchant_name
                ORDER BY total_amount DESC
                LIMIT 10
            ) merchant_stats
        ),
        'by_category', (
            SELECT json_agg(category_stats)
            FROM (
                SELECT ei.category, COUNT(*) as count, SUM(ei.total_price) as total_amount
                FROM expense_details ed
                JOIN expense_items ei ON ed.id = ei.expense_id
                WHERE ed.user_id = user_uuid
                AND (start_date IS NULL OR ed.transaction_date >= start_date)
                AND (end_date IS NULL OR ed.transaction_date <= end_date)
                GROUP BY ei.category
                ORDER BY total_amount DESC
            ) category_stats
        )
    ) INTO result
    FROM expense_details
    WHERE user_id = user_uuid
    AND (start_date IS NULL OR transaction_date >= start_date)
    AND (end_date IS NULL OR transaction_date <= end_date);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_expense_stats(UUID, DATE, DATE) TO authenticated;
