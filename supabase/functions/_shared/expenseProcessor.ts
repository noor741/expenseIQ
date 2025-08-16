import { createServiceSupabaseClient } from './supabase.ts';

interface OCRData {
  merchantName?: string;
  merchantPhoneNumber?: string;
  merchantAddress?: string;
  transactionDate?: string;
  transactionTime?: string;
  receiptType?: string;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  items?: Array<{
    description?: string;
    quantity?: number;
    price?: number;
    totalPrice?: number;
  }>;
}

interface ExpenseCreationResult {
  success: boolean;
  expenseId?: string;
  itemsCreated?: number;
  error?: string;
}

/**
 * Automatically creates expenses and expense_items from processed OCR data
 */
export async function createExpenseFromOCR(
  receiptId: string,
  ocrData: OCRData,
  userId: string,
  currency: string = 'USD'
): Promise<ExpenseCreationResult> {
  try {
    const serviceSupabase = createServiceSupabaseClient();
    
    // Parse transaction date
    const transactionDate = parseTransactionDate(ocrData.transactionDate);
    
    // Create the main expense record
    const expenseData = {
      receipt_id: receiptId,
      merchant_name: ocrData.merchantName || 'Unknown Merchant',
      transaction_date: transactionDate,
      currency: currency, // Use provided currency
      subtotal: ocrData.subtotal || 0,
      tax: ocrData.tax || 0,
      total: ocrData.total || ocrData.subtotal || 0,
      payment_method: null, // OCR doesn't typically extract payment method
      created_at: new Date().toISOString()
    };

    console.log('💰 Creating expense:', expenseData);

    const { data: expense, error: expenseError } = await serviceSupabase
      .from('expenses')
      .insert(expenseData)
      .select()
      .single();

    if (expenseError) {
      console.error('❌ Failed to create expense:', expenseError);
      return {
        success: false,
        error: `Failed to create expense: ${expenseError.message}`
      };
    }

    

    // Create expense items if available
    let itemsCreated = 0;
    if (ocrData.items && ocrData.items.length > 0) {
      
      
      const expenseItems = ocrData.items
        .filter(item => item.description && item.description.trim() !== '')
        .map((item, index) => ({
          expense_id: expense.id,
          item_name: item.description || `Item ${index + 1}`,
          quantity: item.quantity || 1,
          unit_price: item.price || (item.totalPrice || 0),
          total_price: item.totalPrice || item.price || 0,
          category: categorizeItem(item.description || ''), // Auto-categorize based on description
          created_at: new Date().toISOString()
        }));

      if (expenseItems.length > 0) {
        const { data: items, error: itemsError } = await serviceSupabase
          .from('expense_items')
          .insert(expenseItems)
          .select();

        if (itemsError) {
          console.error('⚠️ Failed to create some expense items:', itemsError);
          // Don't fail the entire process if items fail
        } else {
          itemsCreated = items?.length || 0;
          
        }
      }
    } else {
      // If no items found, create a single generic item for the total amount
      const fallbackItem = {
        expense_id: expense.id,
        item_name: `Purchase from ${ocrData.merchantName || 'Unknown Merchant'}`,
        quantity: 1,
        unit_price: ocrData.total || 0,
        total_price: ocrData.total || 0,
        category: 'General',
        created_at: new Date().toISOString()
      };

      const { data: fallbackItemData, error: fallbackError } = await serviceSupabase
        .from('expense_items')
        .insert(fallbackItem)
        .select();

      if (!fallbackError && fallbackItemData) {
        itemsCreated = 1;
        console.log('✅ Created fallback expense item');
      }
    }

    // Update the receipt status to indicate expense creation
    await serviceSupabase
      .from('receipts')
      .update({ 
        status: 'expense_created',
        processed_at: new Date().toISOString()
      })
      .eq('id', receiptId);

    

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
 * Parse transaction date from OCR string to ISO format
 */
function parseTransactionDate(dateString?: string): string {
  if (!dateString) {
    return new Date().toISOString().split('T')[0]; // Default to today
  }

  try {
    // Try to parse the date string
    // OCR might return formats like "2024-12-15", "12/15/2024", "Dec 15, 2024", etc.
    
    // Clean the date string
    const cleanDate = dateString.replace(/[^\d\/\-\s]/g, '');
    
    // Try different date formats
    const formats = [
      // ISO format: 2024-12-15
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // US format: 12/15/2024 or 12-15-2024
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      // European format: 15/12/2024 or 15-12-2024
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
    ];

    for (const format of formats) {
      const match = cleanDate.match(format);
      if (match) {
        let year, month, day;
        
        if (format === formats[0]) {
          // ISO format
          [, year, month, day] = match;
        } else {
          // Assume US format for ambiguous cases
          [, month, day, year] = match;
          
          // If day > 12, it might be European format
          if (parseInt(day) > 12 && parseInt(month) <= 12) {
            [day, month] = [month, day];
          }
        }
        
        const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Validate the date
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString().split('T')[0];
        }
      }
    }

    // If no format matches, try direct parsing
    const directParse = new Date(dateString);
    if (!isNaN(directParse.getTime())) {
      return directParse.toISOString().split('T')[0];
    }

    // Fall back to today's date
    console.warn(`⚠️ Could not parse date "${dateString}", using today's date`);
    return new Date().toISOString().split('T')[0];

  } catch (error) {
    console.warn(`⚠️ Date parsing error for "${dateString}":`, error);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Auto-categorize items based on description
 */
function categorizeItem(description: string): string {
  const desc = description.toLowerCase();
  
  // Food & Dining
  if (desc.includes('coffee') || desc.includes('tea') || desc.includes('drink') || 
      desc.includes('food') || desc.includes('meal') || desc.includes('breakfast') ||
      desc.includes('lunch') || desc.includes('dinner') || desc.includes('pizza') ||
      desc.includes('burger') || desc.includes('sandwich') || desc.includes('salad')) {
    return 'Food & Dining';
  }
  
  // Transportation
  if (desc.includes('gas') || desc.includes('fuel') || desc.includes('parking') ||
      desc.includes('taxi') || desc.includes('uber') || desc.includes('lyft') ||
      desc.includes('train') || desc.includes('bus') || desc.includes('metro')) {
    return 'Transportation';
  }
  
  // Office Supplies
  if (desc.includes('pen') || desc.includes('paper') || desc.includes('notebook') ||
      desc.includes('stapler') || desc.includes('envelope') || desc.includes('folder') ||
      desc.includes('marker') || desc.includes('office')) {
    return 'Office Supplies';
  }
  
  // Entertainment
  if (desc.includes('movie') || desc.includes('ticket') || desc.includes('entertainment') ||
      desc.includes('game') || desc.includes('music') || desc.includes('book')) {
    return 'Entertainment';
  }
  
  // Health & Medical
  if (desc.includes('pharmacy') || desc.includes('medicine') || desc.includes('medical') ||
      desc.includes('doctor') || desc.includes('hospital') || desc.includes('health')) {
    return 'Health & Medical';
  }
  
  // Shopping
  if (desc.includes('store') || desc.includes('market') || desc.includes('shop') ||
      desc.includes('retail') || desc.includes('clothes') || desc.includes('clothing')) {
    return 'Shopping';
  }
  
  // Technology
  if (desc.includes('computer') || desc.includes('software') || desc.includes('tech') ||
      desc.includes('electronics') || desc.includes('cable') || desc.includes('internet')) {
    return 'Technology';
  }
  
  // Default category
  return 'General';
}

/**
 * Validate expense data before creation
 */
export function validateExpenseData(ocrData: OCRData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if we have at least a total amount
  if (!ocrData.total && !ocrData.subtotal) {
    errors.push('No total amount found in OCR data');
  }
  
  // Check for negative amounts
  if (ocrData.total && ocrData.total < 0) {
    errors.push('Total amount cannot be negative');
  }
  
  // Check for unreasonably large amounts (> $10,000)
  if (ocrData.total && ocrData.total > 10000) {
    errors.push('Total amount seems unreasonably large');
  }
  
  // Validate items if present
  if (ocrData.items) {
    ocrData.items.forEach((item, index) => {
      if (item.totalPrice && item.totalPrice < 0) {
        errors.push(`Item ${index + 1} has negative price`);
      }
      if (item.quantity && item.quantity <= 0) {
        errors.push(`Item ${index + 1} has invalid quantity`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
