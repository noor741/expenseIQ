import { supabase } from '@/lib/supabase';
import { apiClient } from '@/services/apiClient';
import { Expense, ExpenseItem } from '@/types/database';
import { ExpenseWithItems } from '@/types/expense';
import { determineCategoryFromMerchant } from '@/utils/categoryHelper';
import { getCategoryColor } from '@/utils/categoryColors';

const ITEMS_PER_PAGE = 20;

export class ExpenseService {
  static async fetchExpensesAndReceipts(pageNumber = 1): Promise<ExpenseWithItems[]> {
    try {
      console.log(`🔍 Fetching expenses and receipts for page ${pageNumber}...`);
      
      // For now, let's skip the API client and go directly to database
      // This avoids network timeout issues while we debug the functions
      console.log('📊 Using direct database access for better reliability');

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      console.log('✅ User authenticated, fetching data...');

      // Fetch processed expenses directly from database
      const processedExpenses = await ExpenseService.fetchExpenses(pageNumber);
      
      // Fetch unprocessed receipts directly from database  
      const unprocessedReceipts = await ExpenseService.fetchUnprocessedReceipts(pageNumber);
      
      // Combine and sort by date
      const allItems = [...processedExpenses, ...unprocessedReceipts];
      allItems.sort((a, b) => {
        const dateA = a.transaction_date ? new Date(a.transaction_date) : (a.created_at ? new Date(a.created_at) : new Date(0));
        const dateB = b.transaction_date ? new Date(b.transaction_date) : (b.created_at ? new Date(b.created_at) : new Date(0));
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`✅ Got ${processedExpenses.length} expenses and ${unprocessedReceipts.length} receipts`);
      return allItems;
    } catch (error) {
      console.error('Error fetching expenses and receipts:', error);
      throw error;
    }
  }

  static async fetchUnprocessedReceipts(pageNumber = 1): Promise<ExpenseWithItems[]> {
    try {
      // Get receipts that don't have corresponding expenses or have failed processing
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .in('status', ['uploaded', 'processing', 'failed', 'processed_with_warnings', 'expense_creation_failed'])
        .order('upload_date', { ascending: false })
        .range((pageNumber - 1) * ITEMS_PER_PAGE, pageNumber * ITEMS_PER_PAGE - 1);

      if (error) {
        console.error('Error fetching unprocessed receipts:', error);
        return [];
      }

      if (!receipts || receipts.length === 0) {
        return [];
      }

      // Filter out receipts that already have expenses created
      const receiptsWithoutExpenses = [];
      for (const receipt of receipts) {
        const { data: existingExpense } = await supabase
          .from('expenses')
          .select('id')
          .eq('receipt_id', receipt.id)
          .maybeSingle();

        if (!existingExpense) {
          receiptsWithoutExpenses.push(receipt);
        }
      }

      // Convert receipts to ExpenseWithItems format
      const receiptItems: ExpenseWithItems[] = receiptsWithoutExpenses.map((receipt) => ({
        id: receipt.id,
        receipt_id: receipt.id,
        merchant_name: receipt.merchant_name || 'Unknown Store',
        transaction_date: receipt.transaction_date || receipt.upload_date?.split('T')[0],
        currency: 'CAD', // Default currency for receipts
        subtotal: receipt.subtotal || 0,
        tax: receipt.tax_amount || 0,
        total: receipt.total_amount || 0,
        created_at: receipt.upload_date,
        updated_at: receipt.upload_date,
        expense_items: [], // No items for unprocessed receipts
        totalItems: 0,
        category: determineCategoryFromMerchant(receipt.merchant_name || ''),
        categoryColor: getCategoryColor(determineCategoryFromMerchant(receipt.merchant_name || '')),
        // Add receipt-specific fields
        isReceipt: true,
        receiptStatus: receipt.status,
        uploadDate: receipt.upload_date,
      }));

      return receiptItems;
    } catch (error) {
      console.error('Error fetching unprocessed receipts:', error);
      return [];
    }
  }

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
        expensesData.map(async (expense: any) => {
          const items = await ExpenseService.fetchExpenseItems(expense.id);
          
          // Use category from database if available, otherwise fallback to merchant-based categorization
          let category = expense.categories?.name;
          let categoryColor = expense.categories?.color;
          
          if (!category) {
            category = determineCategoryFromMerchant(expense.merchant_name || '');
          }
          
          // Use database color if available, otherwise get color from our default palette
          if (!categoryColor) {
            categoryColor = getCategoryColor(category);
          }
          
          return {
            ...expense,
            expense_items: items,
            totalItems: items.length,
            category,
            categoryColor
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
        receipts!inner (id, user_id),
        categories (id, name, color)
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
      console.log('🗑️ ExpenseService: Attempting to delete expense:', expenseId);
      const response = await apiClient.deleteExpense(expenseId);
      console.log('🗑️ ExpenseService: API response:', response);
      return response.success;
    } catch (error) {
      console.error('🗑️ ExpenseService: Error deleting expense:', error);
      throw error;
    }
  }

  static getItemsPerPage(): number {
    return ITEMS_PER_PAGE;
  }
}
