# Database Schema Documentation

## 🗄️ Overview

ExpenseIQ uses PostgreSQL through Supabase with Row Level Security (RLS) policies to ensure data isolation and security. The schema is designed for scalability, performance, and data integrity.

## 📊 Database Schema

### Users Table

**Table**: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_image_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Audit fields
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Receipts Table

**Table**: `receipts`

```sql
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Receipt status
  status VARCHAR(20) DEFAULT 'uploaded' CHECK (
    status IN ('uploaded', 'processing', 'processed', 'failed')
  ),
  
  -- File metadata
  file_size BIGINT,
  file_type VARCHAR(50),
  
  -- OCR results
  raw_ocr_json JSONB,
  ocr_confidence DECIMAL(3,2),
  
  -- Extracted receipt data
  merchant_name VARCHAR(255),
  merchant_phone VARCHAR(20),
  merchant_address TEXT,
  transaction_date DATE,
  transaction_time TIME,
  receipt_type VARCHAR(50),
  
  -- Financial data
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  tip_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_upload_date ON receipts(upload_date DESC);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_receipts_total_amount ON receipts(total_amount);
CREATE INDEX idx_receipts_transaction_date ON receipts(transaction_date DESC);

-- Composite indexes
CREATE INDEX idx_receipts_user_status ON receipts(user_id, status);
CREATE INDEX idx_receipts_user_date ON receipts(user_id, transaction_date DESC);

-- Row Level Security
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own receipts" ON receipts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts" ON receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts" ON receipts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts" ON receipts
  FOR DELETE USING (auth.uid() = user_id);
```

### Expenses Table

**Table**: `expenses`

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id),
  
  -- Expense details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Date information
  transaction_date DATE NOT NULL,
  created_date DATE DEFAULT CURRENT_DATE,
  
  -- Classification
  expense_type VARCHAR(50) DEFAULT 'business' CHECK (
    expense_type IN ('business', 'personal', 'travel', 'entertainment')
  ),
  
  -- Tax information
  is_tax_deductible BOOLEAN DEFAULT false,
  tax_category VARCHAR(100),
  
  -- Payment method
  payment_method VARCHAR(50),
  
  -- Location data
  location_name VARCHAR(255),
  location_coordinates POINT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_receipt_id ON expenses(receipt_id);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expenses_transaction_date ON expenses(transaction_date DESC);
CREATE INDEX idx_expenses_amount ON expenses(amount);
CREATE INDEX idx_expenses_type ON expenses(expense_type);

-- Composite indexes
CREATE INDEX idx_expenses_user_date ON expenses(user_id, transaction_date DESC);
CREATE INDEX idx_expenses_user_category ON expenses(user_id, category_id);

-- Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own expenses" ON expenses
  USING (auth.uid() = user_id);
```

### Categories Table

**Table**: `categories`

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Category details
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7), -- Hex color code
  icon VARCHAR(50),
  
  -- Hierarchy support
  parent_category_id UUID REFERENCES categories(id),
  
  -- System vs user categories
  is_system_category BOOLEAN DEFAULT false,
  
  -- Usage statistics
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_category_name UNIQUE (user_id, name),
  CONSTRAINT valid_color CHECK (color ~* '^#[0-9A-Fa-f]{6}$')
);

-- Indexes
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_category_id);
CREATE INDEX idx_categories_system ON categories(is_system_category);
CREATE INDEX idx_categories_usage ON categories(usage_count DESC);

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own categories and system categories" ON categories
  FOR SELECT USING (auth.uid() = user_id OR is_system_category = true);

CREATE POLICY "Users can manage own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id);
```

### Receipt Items Table

**Table**: `receipt_items`

```sql
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  
  -- Item details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(8,3) DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  
  -- Tax information
  tax_rate DECIMAL(5,4),
  tax_amount DECIMAL(10,2),
  
  -- Category classification
  category_id UUID REFERENCES categories(id),
  
  -- OCR metadata
  ocr_confidence DECIMAL(3,2),
  ocr_bounding_box JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_category_id ON receipt_items(category_id);
CREATE INDEX idx_receipt_items_total_price ON receipt_items(total_price);

-- Row Level Security
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view items from own receipts" ON receipt_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage items from own receipts" ON receipt_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM receipts 
      WHERE receipts.id = receipt_items.receipt_id 
      AND receipts.user_id = auth.uid()
    )
  );
```

## 🔍 Database Functions

### User Statistics Function

```sql
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_receipts', COUNT(r.*),
    'processed_receipts', COUNT(r.*) FILTER (WHERE r.status = 'processed'),
    'total_expenses', COALESCE(SUM(r.total_amount), 0),
    'this_month_expenses', COALESCE(SUM(r.total_amount) FILTER (
      WHERE r.transaction_date >= date_trunc('month', CURRENT_DATE)
    ), 0),
    'average_receipt_amount', COALESCE(AVG(r.total_amount), 0),
    'most_frequent_merchant', (
      SELECT r.merchant_name 
      FROM receipts r 
      WHERE r.user_id = p_user_id 
      AND r.merchant_name IS NOT NULL
      GROUP BY r.merchant_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    )
  ) INTO stats
  FROM receipts r
  WHERE r.user_id = p_user_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Storage Usage Function

```sql
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  usage JSON;
BEGIN
  SELECT json_build_object(
    'total_files', COUNT(*),
    'total_bytes', COALESCE(SUM(file_size), 0),
    'average_file_size', COALESCE(AVG(file_size), 0),
    'largest_file_size', COALESCE(MAX(file_size), 0)
  ) INTO usage
  FROM receipts
  WHERE user_id = p_user_id
  AND file_size IS NOT NULL;
  
  RETURN usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Category Usage Update Function

```sql
CREATE OR REPLACE FUNCTION update_category_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.category_id != OLD.category_id) THEN
    -- Increment usage count for new category
    UPDATE categories 
    SET usage_count = usage_count + 1,
        last_used_at = NOW()
    WHERE id = NEW.category_id;
    
    -- Decrement usage count for old category (if updating)
    IF TG_OP = 'UPDATE' AND OLD.category_id IS NOT NULL THEN
      UPDATE categories 
      SET usage_count = GREATEST(usage_count - 1, 0)
      WHERE id = OLD.category_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_category_usage_expenses
  AFTER INSERT OR UPDATE ON expenses
  FOR EACH ROW
  WHEN (NEW.category_id IS NOT NULL)
  EXECUTE FUNCTION update_category_usage();

CREATE TRIGGER trigger_update_category_usage_receipt_items
  AFTER INSERT OR UPDATE ON receipt_items
  FOR EACH ROW
  WHEN (NEW.category_id IS NOT NULL)
  EXECUTE FUNCTION update_category_usage();
```

## 🔄 Database Triggers

### Updated At Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at 
  BEFORE UPDATE ON receipts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at 
  BEFORE UPDATE ON expenses 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Receipt Processing Trigger

```sql
CREATE OR REPLACE FUNCTION process_receipt_ocr_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract data from raw_ocr_json when it's updated
  IF NEW.raw_ocr_json IS NOT NULL AND NEW.raw_ocr_json != OLD.raw_ocr_json THEN
    NEW.merchant_name = NEW.raw_ocr_json->>'merchantName';
    NEW.merchant_phone = NEW.raw_ocr_json->>'merchantPhoneNumber';
    NEW.merchant_address = NEW.raw_ocr_json->>'merchantAddress';
    NEW.total_amount = (NEW.raw_ocr_json->>'total')::DECIMAL;
    NEW.subtotal = (NEW.raw_ocr_json->>'subtotal')::DECIMAL;
    NEW.tax_amount = (NEW.raw_ocr_json->>'tax')::DECIMAL;
    NEW.tip_amount = (NEW.raw_ocr_json->>'tip')::DECIMAL;
    
    -- Parse transaction date
    IF NEW.raw_ocr_json->>'transactionDate' IS NOT NULL THEN
      NEW.transaction_date = (NEW.raw_ocr_json->>'transactionDate')::DATE;
    END IF;
    
    -- Parse transaction time
    IF NEW.raw_ocr_json->>'transactionTime' IS NOT NULL THEN
      NEW.transaction_time = (NEW.raw_ocr_json->>'transactionTime')::TIME;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_process_receipt_ocr_data
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION process_receipt_ocr_data();
```

## 📈 Performance Optimization

### Partitioning Strategy

```sql
-- Partition receipts table by month for better performance
CREATE TABLE receipts_y2024m01 PARTITION OF receipts
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE receipts_y2024m02 PARTITION OF receipts
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Create partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  end_date DATE;
BEGIN
  end_date := start_date + INTERVAL '1 month';
  partition_name := table_name || '_y' || EXTRACT(YEAR FROM start_date) || 'm' || 
                   LPAD(EXTRACT(MONTH FROM start_date)::TEXT, 2, '0');
  
  EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                 partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

### Materialized Views

```sql
-- Monthly expense summary view
CREATE MATERIALIZED VIEW monthly_expense_summary AS
SELECT 
  user_id,
  date_trunc('month', transaction_date) as month,
  COUNT(*) as receipt_count,
  SUM(total_amount) as total_expenses,
  AVG(total_amount) as average_expense,
  COUNT(DISTINCT merchant_name) as unique_merchants
FROM receipts
WHERE status = 'processed'
AND total_amount IS NOT NULL
GROUP BY user_id, date_trunc('month', transaction_date);

-- Create index on materialized view
CREATE INDEX idx_monthly_summary_user_month 
ON monthly_expense_summary(user_id, month DESC);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_monthly_summary()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_expense_summary;
END;
$$ LANGUAGE plpgsql;
```

## 🔒 Security Policies

### Advanced RLS Policies

```sql
-- Time-based access control
CREATE POLICY "Users can only access recent data" ON receipts
FOR SELECT USING (
  auth.uid() = user_id 
  AND upload_date > NOW() - INTERVAL '2 years'
);

-- Role-based access
CREATE POLICY "Admins can view all receipts" ON receipts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- IP-based restrictions (for sensitive operations)
CREATE POLICY "Restrict delete operations by IP" ON receipts
FOR DELETE USING (
  auth.uid() = user_id
  AND current_setting('request.headers')::JSON->>'x-forwarded-for' 
      NOT LIKE '%suspicious_ip%'
);
```

### Audit Trail

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  operation VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    operation,
    old_values,
    new_values,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## 📊 Analytics Queries

### Common Query Patterns

```sql
-- User spending trends
SELECT 
  date_trunc('month', transaction_date) as month,
  SUM(total_amount) as monthly_total,
  COUNT(*) as receipt_count,
  AVG(total_amount) as average_receipt
FROM receipts
WHERE user_id = $1
AND status = 'processed'
AND transaction_date >= NOW() - INTERVAL '12 months'
GROUP BY date_trunc('month', transaction_date)
ORDER BY month DESC;

-- Top merchants by spending
SELECT 
  merchant_name,
  COUNT(*) as visit_count,
  SUM(total_amount) as total_spent,
  AVG(total_amount) as average_spent
FROM receipts
WHERE user_id = $1
AND merchant_name IS NOT NULL
AND status = 'processed'
GROUP BY merchant_name
ORDER BY total_spent DESC
LIMIT 10;

-- Category breakdown
SELECT 
  c.name as category_name,
  COUNT(ri.id) as item_count,
  SUM(ri.total_price) as category_total
FROM receipt_items ri
JOIN categories c ON ri.category_id = c.id
JOIN receipts r ON ri.receipt_id = r.id
WHERE r.user_id = $1
AND r.status = 'processed'
GROUP BY c.id, c.name
ORDER BY category_total DESC;
```

## 🔧 Maintenance Operations

### Data Cleanup

```sql
-- Clean up failed uploads older than 24 hours
DELETE FROM receipts 
WHERE status = 'failed' 
AND upload_date < NOW() - INTERVAL '24 hours';

-- Archive old receipts
INSERT INTO receipts_archive 
SELECT * FROM receipts 
WHERE upload_date < NOW() - INTERVAL '2 years';

-- Update statistics
ANALYZE receipts;
ANALYZE expenses;
ANALYZE categories;
```

### Backup Strategy

```sql
-- Create backup tables
CREATE TABLE receipts_backup AS SELECT * FROM receipts;

-- Point-in-time recovery setup
SELECT pg_start_backup('ExpenseIQ_backup');
-- Backup files
SELECT pg_stop_backup();
```

## 🚀 Future Schema Enhancements

### Planned Additions

```sql
-- OCR confidence tracking
ALTER TABLE receipts ADD COLUMN ocr_processing_time INTEGER;
ALTER TABLE receipts ADD COLUMN ocr_model_version VARCHAR(20);

-- Multi-currency support
ALTER TABLE receipts ADD COLUMN original_currency VARCHAR(3);
ALTER TABLE receipts ADD COLUMN exchange_rate DECIMAL(10,6);

-- Receipt sharing
CREATE TABLE receipt_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id),
  shared_by UUID REFERENCES users(id),
  shared_with UUID REFERENCES users(id),
  permission_level VARCHAR(20),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

This comprehensive database schema provides a solid foundation for ExpenseIQ with proper security, performance optimization, and scalability considerations.
