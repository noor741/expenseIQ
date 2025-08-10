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
    const endpoint = pathSegments[pathSegments.length - 1];

    switch (req.method) {
      case 'GET':
        if (endpoint === 'profile') {
          // Get current user profile
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            return createErrorResponse(`User profile not found: ${error.message}`, 404);
          }

          return createResponse({ success: true, data });
        } else {
          // Get user stats/dashboard data
          const [receiptsResult, expensesResult] = await Promise.all([
            supabase
              .from('receipts')
              .select('id, status', { count: 'exact' })
              .eq('user_id', user.id),
            supabase
              .from('expenses')
              .select('total, transaction_date')
              .eq('receipts.user_id', user.id)
              .order('transaction_date', { ascending: false })
              .limit(10)
          ]);

          const stats = {
            totalReceipts: receiptsResult.count || 0,
            receiptsByStatus: receiptsResult.data?.reduce((acc: Record<string, number>, receipt: any) => {
              acc[receipt.status] = (acc[receipt.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>) || {},
            recentExpenses: expensesResult.data || [],
            totalExpenses: expensesResult.data?.reduce((sum: number, exp: any) => sum + exp.total, 0) || 0
          };

          return createResponse({ success: true, data: stats });
        }

      case 'POST':
        // Create/ensure user record exists
        const { full_name, preferred_name, email } = await req.json();

        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            full_name,
            preferred_name,
            email: email || user.email,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })
          .select()
          .single();

        if (error) {
          return createErrorResponse(`Failed to create/update user: ${error.message}`);
        }

        return createResponse({ success: true, data }, 201);

      case 'PUT':
        // Update user profile
        const updateData = await req.json();
        const allowedFields = ['full_name', 'preferred_name', 'email'];
        const filteredData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {} as any);

        filteredData.updated_at = new Date().toISOString();

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(filteredData)
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          return createErrorResponse(`Failed to update user: ${updateError.message}`);
        }

        return createResponse({ success: true, data: updatedUser });

      case 'DELETE':
        // Delete user account (soft delete - just mark as deleted)
        const { error: deleteError } = await supabase
          .from('users')
          .update({ 
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (deleteError) {
          return createErrorResponse(`Failed to delete user: ${deleteError.message}`);
        }

        return createResponse({ success: true, message: 'User account deleted successfully' });

      default:
        return createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Users API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
});
