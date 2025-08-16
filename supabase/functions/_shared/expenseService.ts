import { createServiceSupabaseClient } from './supabase.ts';

/**
 * Enhanced expense creation service with automatic OCR data processing
 */
export class ExpenseService {
  private supabase;

  constructor() {
    this.supabase = createServiceSupabaseClient();
  }

  /**
   * Create expense and items from OCR data automatically
   */
  async createFromOCR(receiptId: string, ocrData: any, userId: string, currency: string = 'USD'): Promise<{
    success: boolean;
    expenseId?: string;
    itemsCreated?: number;
    error?: string;
  }> {
    try {
      // Extract data from Azure OCR response
      const extractedData = this.extractOCRData(ocrData);
      
      // Validate extracted data
      const validation = this.validateExpenseData(extractedData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create the expense record
      const { data: expense, error: expenseError } = await this.supabase
        .from('expenses')
        .insert({
          receipt_id: receiptId,
          merchant_name: extractedData.merchantName || 'Unknown Merchant',
          transaction_date: extractedData.transactionDate || new Date().toISOString().split('T')[0],
          currency: currency,
          subtotal: extractedData.subtotal || 0,
          tax: extractedData.tax || 0,
          total: extractedData.total || 0,
          payment_method: null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (expenseError) {
        throw new Error(`Failed to create expense: ${expenseError.message}`);
      }

      console.log(`✅ Expense created with ID: ${expense.id}`);

      // Create expense items
      let itemsCreated = 0;
      if (extractedData.items && extractedData.items.length > 0) {
        const expenseItems = extractedData.items
          .filter(item => item.description && item.description.trim() !== '')
          .map((item: any) => ({
            expense_id: expense.id,
            item_name: item.description,
            quantity: item.quantity || 1,
            unit_price: item.price || item.totalPrice || 0,
            total_price: item.totalPrice || item.price || 0,
            category: this.categorizeItem(item.description),
            created_at: new Date().toISOString()
          }));

        if (expenseItems.length > 0) {
          const { data: items, error: itemsError } = await this.supabase
            .from('expense_items')
            .insert(expenseItems)
            .select();

          if (itemsError) {
            console.warn('⚠️ Failed to create some expense items:', itemsError);
          } else {
            itemsCreated = items?.length || 0;
            console.log(`✅ Created ${itemsCreated} expense items`);
          }
        }
      }

      // If no items created, create a fallback item
      if (itemsCreated === 0) {
        const { data: fallbackItem, error: fallbackError } = await this.supabase
          .from('expense_items')
          .insert({
            expense_id: expense.id,
            item_name: `Purchase from ${extractedData.merchantName || 'Unknown Merchant'}`,
            quantity: 1,
            unit_price: extractedData.total || 0,
            total_price: extractedData.total || 0,
            category: 'General',
            created_at: new Date().toISOString()
          })
          .select();

        if (!fallbackError && fallbackItem) {
          itemsCreated = 1;
          console.log('✅ Created fallback expense item');
        }
      }

      return {
        success: true,
        expenseId: expense.id,
        itemsCreated
      };

    } catch (error) {
      console.error('💥 Failed to create expense from OCR:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract structured data from Azure OCR response
   */
  private extractOCRData(ocrData: any): any {
    try {
      const documents = ocrData?.documents;
      if (!documents || documents.length === 0) {
        throw new Error('No documents found in OCR data');
      }

      const fields = documents[0]?.fields || {};

      return {
        merchantName: this.extractField(fields.MerchantName),
        merchantAddress: this.extractField(fields.MerchantAddress),
        merchantPhoneNumber: this.extractField(fields.MerchantPhoneNumber),
        transactionDate: this.parseTransactionDate(this.extractField(fields.TransactionDate)),
        transactionTime: this.extractField(fields.TransactionTime),
        subtotal: this.extractNumberField(fields.Subtotal),
        tax: this.extractNumberField(fields.TotalTax),
        tip: this.extractNumberField(fields.Tip),
        total: this.extractNumberField(fields.Total),
        items: this.extractItems(fields.Items)
      };
    } catch (error) {
      console.error('❌ Failed to extract OCR data:', error);
      throw error;
    }
  }

  /**
   * Extract field value from OCR field object
   */
  private extractField(field: any): string | undefined {
    if (!field || field.value === undefined) return undefined;
    return field.value?.toString().trim() || undefined;
  }

  /**
   * Extract and convert number field
   */
  private extractNumberField(field: any): number | undefined {
    const value = this.extractField(field);
    if (!value) return undefined;
    
    const cleanValue = value.replace(/[^0-9.-]/g, '');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? undefined : Math.max(0, number); // Ensure non-negative
  }

  /**
   * Extract items array from OCR data
   */
  private extractItems(itemsField: any): any[] {
    if (!itemsField?.values) return [];

    return itemsField.values
      .map((item: any) => {
        const properties = item.properties || {};
        return {
          description: this.extractField(properties.Description),
          quantity: this.extractNumberField(properties.Quantity) || 1,
          price: this.extractNumberField(properties.Price),
          totalPrice: this.extractNumberField(properties.TotalPrice)
        };
      })
      .filter((item: any) => item.description && item.description.trim() !== '');
  }

  /**
   * Parse transaction date to YYYY-MM-DD format
   */
  private parseTransactionDate(dateString?: string): string {
    if (!dateString) {
      return new Date().toISOString().split('T')[0];
    }

    try {
      // Try to parse various date formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      // Try MM/DD/YYYY format
      const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateString);
      if (mmddyyyy) {
        const [, month, day, year] = mmddyyyy;
        const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }

      console.warn(`⚠️ Could not parse date "${dateString}", using today`);
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.warn(`⚠️ Date parsing error for "${dateString}":`, error);
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Automatically categorize items based on description
   */
  private categorizeItem(description: string): string {
    if (!description) return 'General';
    
    const desc = description.toLowerCase();
    
    // Food & Dining
    if (desc.match(/\b(coffee|tea|drink|food|meal|breakfast|lunch|dinner|pizza|burger|sandwich|salad|restaurant|cafe|bar)\b/)) {
      return 'Food & Dining';
    }
    
    // Transportation
    if (desc.match(/\b(gas|fuel|parking|taxi|uber|lyft|train|bus|metro|transport|toll)\b/)) {
      return 'Transportation';
    }
    
    // Office Supplies
    if (desc.match(/\b(pen|paper|notebook|stapler|envelope|folder|marker|office|supplies|printing)\b/)) {
      return 'Office Supplies';
    }
    
    // Entertainment
    if (desc.match(/\b(movie|ticket|entertainment|game|music|book|theater|concert|sports)\b/)) {
      return 'Entertainment';
    }
    
    // Health & Medical
    if (desc.match(/\b(pharmacy|medicine|medical|doctor|hospital|health|prescription|clinic)\b/)) {
      return 'Health & Medical';
    }
    
    // Shopping
    if (desc.match(/\b(store|market|shop|retail|clothes|clothing|mall|shopping)\b/)) {
      return 'Shopping';
    }
    
    // Technology
    if (desc.match(/\b(computer|software|tech|electronics|cable|internet|phone|mobile)\b/)) {
      return 'Technology';
    }
    
    return 'General';
  }

  /**
   * Validate expense data before creation
   */
  private validateExpenseData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required total amount
    if (!data.total && !data.subtotal) {
      errors.push('No total amount found in OCR data');
    }
    
    // Check for reasonable amounts
    const amount = data.total || data.subtotal || 0;
    if (amount < 0) {
      errors.push('Total amount cannot be negative');
    }
    
    if (amount > 10000) {
      errors.push('Total amount seems unreasonably large (>$10,000)');
    }
    
    // Validate items if present
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any, index: number) => {
        if (item.totalPrice && item.totalPrice < 0) {
          errors.push(`Item ${index + 1} has negative total price`);
        }
        if (item.quantity && item.quantity <= 0) {
          errors.push(`Item ${index + 1} has invalid quantity`);
        }
        if (!item.description || item.description.trim() === '') {
          errors.push(`Item ${index + 1} has no description`);
        }
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get expense statistics for a user
   */
  async getExpenseStats(userId: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      const { data: expenses, error } = await this.supabase
        .from('expenses')
        .select(`
          *,
          expense_items (*),
          receipts!inner (user_id)
        `)
        .eq('receipts.user_id', userId)
        .gte('transaction_date', startDate || '1900-01-01')
        .lte('transaction_date', endDate || '2099-12-31');

      if (error) throw error;

      const stats = {
        totalExpenses: expenses.length,
        totalAmount: expenses.reduce((sum, exp) => sum + (exp.total || 0), 0),
        avgAmount: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + (exp.total || 0), 0) / expenses.length : 0,
        byMerchant: {},
        byCategory: {}
      };

      // Group by merchant
      expenses.forEach(exp => {
        const merchant = exp.merchant_name || 'Unknown';
        if (!stats.byMerchant[merchant]) {
          stats.byMerchant[merchant] = { count: 0, totalAmount: 0 };
        }
        stats.byMerchant[merchant].count++;
        stats.byMerchant[merchant].totalAmount += exp.total || 0;
      });

      // Group by category
      expenses.forEach(exp => {
        exp.expense_items?.forEach((item: any) => {
          const category = item.category || 'General';
          if (!stats.byCategory[category]) {
            stats.byCategory[category] = { count: 0, totalAmount: 0 };
          }
          stats.byCategory[category].count++;
          stats.byCategory[category].totalAmount += item.total_price || 0;
        });
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get expense stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const expenseService = new ExpenseService();
