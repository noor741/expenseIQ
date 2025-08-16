import { apiClient } from '@/services/apiClient';
import { Expense, ExpenseItem } from '@/types/database';
import { ExpenseWithItems } from '@/types/expense';
import { determineCategoryFromMerchant } from '@/utils/categoryHelper';

const ITEMS_PER_PAGE = 20;

export class ExpenseService {
  static async fetchExpenses(pageNumber = 1): Promise<ExpenseWithItems[]> {
    try {
      // Try API first, fallback to direct Supabase
      let expensesData;
      try {
        const response = await apiClient.getExpenses({
          limit: ITEMS_PER_PAGE,
          page: pageNumber
        });
        
        if (response.success && response.data) {
          const responseData = response.data as any;
          expensesData = Array.isArray(responseData) ? responseData : responseData.expenses || [];
        } else {
          throw new Error('API failed');
        }
      } catch (apiError) {
        console.log('🔄 API failed, trying direct Supabase...');
        expensesData = await ExpenseService.fetchExpensesDirectly(pageNumber);
      }

      if (!expensesData || expensesData.length === 0) {
        return [];
      }

      // For each expense, fetch its items and categorize
      const expensesWithItems: ExpenseWithItems[] = await Promise.all(
        expensesData.map(async (expense: Expense) => {
          const items = await ExpenseService.fetchExpenseItems(expense.id);
          const category = determineCategoryFromMerchant(expense.merchant_name || '');
          
          return {
            ...expense,
            expense_items: items,
            totalItems: items.length,
            category
          };
        })
      );

      // Sort by transaction date (newest first)
      expensesWithItems.sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );

      return expensesWithItems;
    } catch (error) {
      console.error('💥 Error fetching expenses:', error);
      throw error;
    }
  }

  static async fetchExpensesDirectly(pageNumber = 1): Promise<Expense[]> {
    const { supabase } = await import('@/lib/supabase');
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }
    
    const offset = (pageNumber - 1) * ITEMS_PER_PAGE;
    
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        receipts!inner (id, user_id)
      `)
      .eq('receipts.user_id', user.id)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (error) throw error;
    return data || [];
  }

  static async fetchExpenseItems(expenseId: string): Promise<ExpenseItem[]> {
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { data, error } = await supabase
        .from('expense_items')
        .select('*')
        .eq('expense_id', expenseId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching expense items:', err);
      return [];
    }
  }

  static async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      const response = await apiClient.deleteExpense(expenseId);
      return response.success;
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  static getItemsPerPage(): number {
    return ITEMS_PER_PAGE;
  }
}
