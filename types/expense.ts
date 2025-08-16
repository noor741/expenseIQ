import { Expense, ExpenseItem } from '@/types/database';

export interface ExpenseWithItems extends Expense {
  expense_items: ExpenseItem[];
  totalItems: number;
  category?: string;
  // Receipt-specific fields for unprocessed receipts
  isReceipt?: boolean;
  receiptStatus?: 'uploaded' | 'processing' | 'processed' | 'failed' | 'processed_with_warnings' | 'expense_creation_failed';
  uploadDate?: string;
}
