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

          return createResponse({ success: true, data });
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

          return createResponse({
            success: true,
            data: {
              expenses: data,
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
          'subtotal', 'tax', 'total', 'payment_method'
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
        // Delete expense and all its items
        if (!expenseId || expenseId === 'expenses') {
          return createErrorResponse('Expense ID required for deletion');
        }

        // Verify expense belongs to user and delete
        const { error: deleteError } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId)
          .eq('receipts.user_id', user.id);

        if (deleteError) {
          return createErrorResponse(`Failed to delete expense: ${deleteError.message}`);
        }

        return createResponse({ success: true, message: 'Expense deleted successfully' });

      default:
        return createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Expenses API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
