import { corsHeaders, createErrorResponse, createResponse } from '../_shared/cors.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await getUser(token);
    const supabase = createSupabaseClient(token);

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const expenseId = pathSegments[pathSegments.length - 1];

    switch (req.method) {
      case 'GET':
        if (expenseId && expenseId !== 'expenses') {
          // Get single expense with items and receipt info
          const { data, error } = await supabase
            .from('expenses')
            .select(`
              *,
              expense_items (*),
              receipts (id, file_url, upload_date, status)
            `)
            .eq('id', expenseId)
            .eq('receipts.user_id', user.id)
            .single();

          if (error) {
            return createErrorResponse(`Expense not found: ${error.message}`, 404);
          }

          // Fetch categories separately
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name');

          const categoriesMap = new Map(categoriesData?.map(cat => [cat.id, cat.name]) || []);

          // Process single expense data
          const processedData = {
            ...data,
            category: data.category_id ? categoriesMap.get(data.category_id) || 'Uncategorized' : 'Uncategorized',
            suggestedCategoryName: data.suggested_category_id ? categoriesMap.get(data.suggested_category_id) : undefined,
            showCategorySuggestion: !!(
              data.suggested_category_id && 
              data.suggested_category_confidence &&
              categoriesMap.get(data.suggested_category_id)
            )
          };

          return createResponse({ success: true, data: processedData });
        } else {
          // Get all expenses with filtering
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const categoryId = url.searchParams.get('category_id');
          const startDate = url.searchParams.get('start_date');
          const endDate = url.searchParams.get('end_date');
          const merchantName = url.searchParams.get('merchant_name');
          const offset = (page - 1) * limit;

          let query = supabase
            .from('expenses')
            .select(`
              *,
              expense_items (*),
              receipts!inner (id, file_url, user_id)
            `, { count: 'exact' })
            .eq('receipts.user_id', user.id)
            .order('transaction_date', { ascending: false })
            .range(offset, offset + limit - 1);

          if (categoryId) {
            query = query.eq('category_id', categoryId);
          }
          if (startDate) {
            query = query.gte('transaction_date', startDate);
          }
          if (endDate) {
            query = query.lte('transaction_date', endDate);
          }
          if (merchantName) {
            query = query.ilike('merchant_name', `%${merchantName}%`);
          }

          const { data, error, count } = await query;

          if (error) {
            return createErrorResponse(`Failed to fetch expenses: ${error.message}`);
          }

          // Fetch categories separately to avoid relationship issues
          const { data: categoriesData, error: categoriesError } = await supabase
            .from('categories')
            .select('id, name');

          if (categoriesError) {
            console.error('Failed to fetch categories:', categoriesError);
          }

          const categoriesMap = new Map(categoriesData?.map(cat => [cat.id, cat.name]) || []);

          // Process data to add category info
          const processedExpenses = data?.map(expense => {
            const expenseData = {
              ...expense,
              category: expense.category_id ? categoriesMap.get(expense.category_id) || 'Uncategorized' : 'Uncategorized',
              suggestedCategoryName: expense.suggested_category_id ? categoriesMap.get(expense.suggested_category_id) : undefined,
              showCategorySuggestion: !!(
                expense.suggested_category_id && 
                expense.suggested_category_confidence &&
                categoriesMap.get(expense.suggested_category_id)
              )
            };
            
            return expenseData;
          }) || [];

          return createResponse({
            success: true,
            data: {
              expenses: processedExpenses,
              pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
              }
            }
          });
        }

      case 'POST':
        // Create new expense with items
        const {
          receipt_id,
          merchant_name,
          transaction_date,
          currency = 'USD',
          subtotal,
          tax,
          total,
          payment_method,
          items = []
        } = await req.json();

        if (!receipt_id || !transaction_date || !total) {
          return createErrorResponse('receipt_id, transaction_date, and total are required');
        }

        // Verify receipt belongs to user
        const { data: receipt, error: receiptError } = await supabase
          .from('receipts')
          .select('id')
          .eq('id', receipt_id)
          .eq('user_id', user.id)
          .single();

        if (receiptError) {
          return createErrorResponse('Invalid receipt_id or receipt not found');
        }

        // Create expense
        const { data: expense, error: expenseError } = await supabase
          .from('expenses')
          .insert({
            receipt_id,
            merchant_name,
            transaction_date,
            currency,
            subtotal,
            tax,
            total,
            payment_method
          })
          .select()
          .single();

        if (expenseError) {
          return createErrorResponse(`Failed to create expense: ${expenseError.message}`);
        }

        // Create expense items if provided
        let expenseItems = [];
        if (items.length > 0) {
          const itemsData = items.map((item: any) => ({
            expense_id: expense.id,
            item_name: item.item_name,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            total_price: item.total_price,
            category: item.category
          }));

          const { data: itemsResult, error: itemsError } = await supabase
            .from('expense_items')
            .insert(itemsData)
            .select();

          if (itemsError) {
            console.error('Failed to create expense items:', itemsError);
          } else {
            expenseItems = itemsResult;
          }
        }

        return createResponse({
          success: true,
          data: { ...expense, expense_items: expenseItems }
        }, 201);

      case 'PUT':
        // Update expense
        if (!expenseId || expenseId === 'expenses') {
          return createErrorResponse('Expense ID required for update');
        }

        const updateData = await req.json();
        const allowedFields = [
          'merchant_name', 'transaction_date', 'currency',
          'subtotal', 'tax', 'total', 'payment_method',
          'category_id', 'suggested_category_id', 
          'suggested_category_confidence', 'suggested_category_method'
        ];
        const filteredData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {} as any);

        // Verify expense belongs to user through receipt
        const { data: updatedExpense, error: updateError } = await supabase
          .from('expenses')
          .update(filteredData)
          .eq('id', expenseId)
          .eq('receipts.user_id', user.id)
          .select(`
            *,
            expense_items (*),
            receipts (id, user_id)
          `)
          .single();

        if (updateError) {
          return createErrorResponse(`Failed to update expense: ${updateError.message}`);
        }

        return createResponse({ success: true, data: updatedExpense });

      case 'DELETE':
        // Delete expense and all related data including receipt image
        if (!expenseId || expenseId === 'expenses') {
          return createErrorResponse('Expense ID required for deletion');
        }

        try {
          // First, get the expense with its receipt information
          const { data: expenseData, error: fetchError } = await supabase
            .from('expenses')
            .select('id, receipt_id')
            .eq('id', expenseId)
            .single();

          if (fetchError) {
            return createErrorResponse(`Expense not found: ${fetchError.message}`, 404);
          }

          // Verify ownership by checking if expense is linked to user's receipt
          if (expenseData.receipt_id) {
            const { data: receiptCheck, error: receiptCheckError } = await supabase
              .from('receipts')
              .select('user_id')
              .eq('id', expenseData.receipt_id)
              .single();

            if (receiptCheckError || receiptCheck?.user_id !== user.id) {
              return createErrorResponse('Unauthorized: This expense does not belong to you', 403);
            }
          }

          // Get receipt info if it exists
          let receiptData = null;
          if (expenseData.receipt_id) {
            const { data: receipt, error: receiptError } = await supabase
              .from('receipts')
              .select('id, user_id, file_url')
              .eq('id', expenseData.receipt_id)
              .single();

            if (receipt && receipt.user_id === user.id) {
              receiptData = receipt;
            } else if (receiptError) {
              console.warn('Receipt not found or unauthorized:', receiptError.message);
            }
          }

          // Delete expense items first (cascade should handle this, but being explicit)
          const { error: itemsDeleteError } = await supabase
            .from('expense_items')
            .delete()
            .eq('expense_id', expenseId);

          if (itemsDeleteError) {
            console.warn('Warning: Failed to delete expense items:', itemsDeleteError.message);
          }

          // Delete the expense record
          const { error: expenseDeleteError } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId);

          if (expenseDeleteError) {
            return createErrorResponse(`Failed to delete expense: ${expenseDeleteError.message}`);
          }

          // Delete the receipt image from storage if it exists
          if (receiptData?.file_url) {
            // Extract the file path from the URL (remove the base URL if present)
            let filePath = receiptData.file_url;
            if (filePath.includes('/storage/v1/object/public/receipts/')) {
              filePath = filePath.split('/storage/v1/object/public/receipts/')[1];
            } else if (filePath.includes('receipts/')) {
              filePath = filePath.split('receipts/')[1];
            }
            
            const { error: storageError } = await supabase.storage
              .from('receipts')
              .remove([filePath]);
            
            if (storageError) {
              console.error('Failed to delete receipt image from storage:', storageError);
            }
          }

          // Delete the receipt record if it exists
          if (receiptData) {
            const { error: receiptDeleteError } = await supabase
              .from('receipts')
              .delete()
              .eq('id', receiptData.id)
              .eq('user_id', user.id);

            if (receiptDeleteError) {
              console.error('Failed to delete receipt record:', receiptDeleteError);
            }
          }

          return createResponse({ 
            success: true, 
            message: 'Expense and all related data deleted successfully' 
          });

        } catch (error) {
          console.error('Error during expense deletion:', error);
          return createErrorResponse(`Failed to delete expense: ${error.message || 'Unknown error'}`);
        }

      default:
        return createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Expenses API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
