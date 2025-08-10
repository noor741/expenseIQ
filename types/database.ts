// Database types for ExpenseIQ based on your schema
export interface User {
  id: string;
  full_name?: string;
  preferred_name?: string;
  email: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  file_url: string;
  upload_date: string;
  status: string;
  raw_ocr_json?: any;
  processed_at?: string;
}

export interface Expense {
  id: string;
  receipt_id: string;
  merchant_name?: string;
  transaction_date: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method?: string;
  created_at: string;
}

export interface ExpenseItem {
  id: string;
  expense_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface AIInsight {
  id: string;
  expense_id: string;
  summary?: string;
  anomalies?: any;
  recommendations?: string;
  created_at: string;
}

// Upload response types
export interface UploadResult {
  success: boolean;
  receiptId?: string;
  filePath?: string;
  error?: string;
}
