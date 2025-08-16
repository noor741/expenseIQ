import { Expense, ExpenseItem } from '@/types/database';

export interface ExpenseWithItems extends Expense {
  expense_items: ExpenseItem[];
  totalItems: number;
  category?: string;
}
